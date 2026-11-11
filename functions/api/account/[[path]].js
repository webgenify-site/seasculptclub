// Sea Sculpt Club accounts: email + password (one confirmation email at sign-up), then see your
// reservations and class codes. Routes (this file handles /api/account/*):
//   POST /api/account/signup  { name, email, password, birthday? } -> emails a one-time confirmation link
//   POST /api/account/login   { email, password }  -> starts a 30-day session (HttpOnly cookie)
//   POST /api/account/forgot  { email }            -> emails a link to set a new password
//   POST /api/account/verify  { token, password? } -> confirms sign-up / sets the new password, signs in
//   POST /api/account/profile { birthday?, name? } -> updates the signed-in person's details
//   GET  /api/account/me                        -> the signed-in person's reservations and codes
//   POST /api/account/logout                    -> ends the session
// New accounts are added to Brevo and HubSpot when BREVO_API_KEY / HUBSPOT_TOKEN are set.
// Data lives in the same D1 "records" table as bookings (keys: users/, acctlogin/, acctsess/, acctrl/).

const LINK_MINUTES = 20;
const SESSION_DAYS = 30;
const COOKIE = "ssc_session";
const CREDIT_VALUE = 3500;

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

// ---------- storage (same table and format as the booking system) ----------
function store(db) {
  if (!db) throw new Error("Database not connected");
  const now = () => new Date().toISOString();
  return {
    async get(key) {
      const row = await db.prepare("SELECT value FROM records WHERE key = ?").bind(key).first();
      return row ? JSON.parse(row.value) : null;
    },
    async set(key, value) {
      await db.prepare("INSERT INTO records (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
        .bind(key, JSON.stringify(value), now()).run();
    },
    async addIfNew(key, value) {
      const r = await db.prepare("INSERT INTO records (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING")
        .bind(key, JSON.stringify(value), now()).run();
      return !!(r && r.meta && r.meta.changes);
    },
    async del(key) { await db.prepare("DELETE FROM records WHERE key = ?").bind(key).run(); },
    // Records under a prefix whose JSON mentions the text (then checked exactly by the caller).
    async search(prefix, text) {
      const r = await db.prepare("SELECT value FROM records WHERE substr(key, 1, ?) = ? AND instr(lower(value), ?) > 0")
        .bind(prefix.length, prefix, text).all();
      return (r.results || []).map((x) => { try { return JSON.parse(x.value); } catch (e) { return null; } }).filter(Boolean);
    }
  };
}

// ---------- helpers ----------
const enc = new TextEncoder();
function b64url(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function newToken() { return b64url(crypto.getRandomValues(new Uint8Array(32))); }
async function hash(text) { const d = await crypto.subtle.digest("SHA-256", enc.encode(text)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
const cleanEmail = (e) => String(e || "").trim().toLowerCase().slice(0, 200);
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const cleanName = (n) => String(n || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 80);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function cookieValue(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : "";
}
function todayET() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date()); }

// Simple fixed-window limiter stored in D1.
async function limited(db, key, max, windowMs) {
  const now = Date.now();
  let rec = (await db.get(key)) || { n: 0, start: now };
  if (now - rec.start > windowMs) rec = { n: 0, start: now };
  rec.n += 1;
  await db.set(key, rec);
  return rec.n > max;
}

// ---------- class code math (same rules as checkout) ----------
const usedOf = (rec) => (rec.uses || []).reduce((n, u) => n + (u.n || 0), 0);
function heldOf(rec, t) { return Object.values(rec.holds || {}).reduce((n, h) => n + (h.until > t ? h.n || 0 : 0), 0); }
function expiredLost(rec, t) {
  const e = rec.expiring;
  if (!e || !e.n || !e.expiresAt || t <= e.expiresAt) return 0;
  const usedBefore = (rec.uses || []).filter((u) => u.at <= e.expiresAt).reduce((n, u) => n + (u.n || 0), 0);
  return Math.max(0, e.n - usedBefore);
}
function codeSummary(rec) {
  const t = new Date().toISOString();
  const used = usedOf(rec);
  const left = Math.max(0, (rec.credits || 0) - used - heldOf(rec, t) - expiredLost(rec, t));
  const e = rec.expiring;
  const expiring = e && e.n && e.expiresAt && t <= e.expiresAt && e.n - used > 0 ? { n: e.n - used, expiresAt: e.expiresAt } : null;
  return {
    code: rec.code,
    kind: rec.kind === "pack" ? "pack" : "gift",
    name: rec.giftName || (rec.kind === "pack" ? "Class code" : "eGift card"),
    credits: rec.credits || 0,
    used,
    left,
    expiring,
    expired: expiredLost(rec, t),
    shareable: !rec.ownerEmail,
    fromName: rec.kind === "pack" ? "" : rec.fromName || "",
    createdAt: rec.createdAt || null
  };
}

// ---------- Brevo + HubSpot ----------
async function syncContact(env, user) {
  const parts = (user.name || "").split(/\s+/).filter(Boolean);
  const first = parts[0] || "", last = parts.slice(1).join(" ");
  const out = {};
  if (env.BREVO_API_KEY) {
    try {
      const body = { email: user.email, updateEnabled: true, attributes: { FIRSTNAME: first, LASTNAME: last } };
      const lists = String(env.BREVO_LIST_ID || "").split(",").map((x) => parseInt(x, 10)).filter((x) => x > 0);
      if (lists.length) body.listIds = lists;
      const r = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST", headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" }, body: JSON.stringify(body)
      });
      out.brevo = r.ok || r.status === 204 ? "added" : "failed " + r.status;
    } catch (e) { out.brevo = "failed"; }
  } else out.brevo = "not set up";
  if (env.HUBSPOT_TOKEN) {
    try {
      const props = { email: user.email };
      if (first) props.firstname = first;
      if (last) props.lastname = last;
      const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert", {
        method: "POST", headers: { Authorization: `Bearer ${env.HUBSPOT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: [{ id: user.email, idProperty: "email", properties: props }] })
      });
      out.hubspot = r.ok ? "added" : "failed " + r.status;
    } catch (e) { out.hubspot = "failed"; }
  } else out.hubspot = "not set up";
  return out;
}

// ---------- passwords (PBKDF2-SHA256, salted; plain passwords are never stored) ----------
const PBKDF2_ITER = 100000;
async function hashPassword(password, saltHex) {
  const salt = saltHex ? new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256);
  const hex = (u) => [...u].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { hash: hex(new Uint8Array(bits)), salt: hex(salt), iter: PBKDF2_ITER };
}
async function checkPassword(password, rec) {
  if (!rec || !rec.hash || !rec.salt) return false;
  const h = await hashPassword(password, rec.salt);
  let diff = h.hash.length ^ rec.hash.length;
  for (let i = 0; i < Math.min(h.hash.length, rec.hash.length); i++) diff |= h.hash.charCodeAt(i) ^ rec.hash.charCodeAt(i);
  return diff === 0;
}
function passwordProblem(pw) {
  pw = String(pw || "");
  if (pw.length < 8) return "Please choose a password with at least 8 characters.";
  if (pw.length > 200) return "That password is too long.";
  return null;
}
function cleanBirthday(b) {
  const v = String(b || "").trim();
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3], now = new Date().getFullYear();
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < now - 110 || y > now - 5) return null;
  return v;
}

// ---------- email ----------
async function sendAccountEmail(env, email, link, kind) {
  if (!env.RESEND_API_KEY) return false;
  const T = {
    signup: { subject: "Confirm your Sea Sculpt Club account", lead: "Tap the button below to confirm your email and finish creating your account. You only need to do this once; after that, just sign in with your email and password.", btn: "CONFIRM MY ACCOUNT" },
    reset: { subject: "Set your Sea Sculpt Club password", lead: "Tap the button below to choose a new password for your account.", btn: "SET MY PASSWORD" }
  }[kind];
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#12314F;max-width:520px;margin:0 auto;padding:24px">
<p style="font-size:20px;margin:0 0 14px">Sea Sculpt Club</p>
<p style="margin:0 0 18px;line-height:1.5">${T.lead}</p>
<p style="margin:0 0 22px"><a href="${esc(link)}" style="display:inline-block;background:#12314F;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:14px;letter-spacing:.08em">${T.btn}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#4A6683;line-height:1.5">This link works for ${LINK_MINUTES} minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`;
  const text = `${T.lead}\n\n${link}\n\nThis link works for ${LINK_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.BOOKING_EMAIL_FROM || "Sea Sculpt Club <bookings@seasculptclub.com>", to: [email], reply_to: "seasculptclub@gmail.com", subject: T.subject, html, text })
    });
    return r.ok;
  } catch (e) { return false; }
}

async function startSession(db, email) {
  const session = newToken();
  await db.set("acctsess/" + (await hash(session)), { email, exp: Date.now() + SESSION_DAYS * 864e5 });
  return `${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}
async function emailLink(request, env, db, email, kind, extra) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (await limited(db, "acctrl/ip/" + (await hash(ip)).slice(0, 24), 20, 3600e3)) return json(429, { error: "Too many requests. Please try again in an hour." });
  if (await limited(db, "acctrl/email/" + (await hash(email)).slice(0, 24), 5, 3600e3)) return json(429, { error: "We've sent several emails to this address already. Please check your inbox (and spam), or try again in an hour." });
  const token = newToken();
  await db.set("acctlogin/" + (await hash(token)), { email, kind, ...extra, exp: Date.now() + LINK_MINUTES * 60e3 });
  const site = (env.SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
  const sent = await sendAccountEmail(env, email, `${site}/account?${kind === "reset" ? "reset" : "login"}=${token}`, kind);
  if (!sent) return json(502, { error: "We couldn't send the email right now. Please try again in a moment." });
  return null;
}

// ---------- handlers ----------
// Create an account: name, email, password, optional birthday. One confirmation email (proves the email is theirs).
async function signup(request, env, db) {
  let body; try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const email = cleanEmail(body.email), name = cleanName(body.name), birthday = cleanBirthday(body.birthday);
  if (name.length < 2) return json(400, { error: "Please enter your name." });
  if (!validEmail(email)) return json(400, { error: "Please enter a valid email address." });
  const bad = passwordProblem(body.password); if (bad) return json(400, { error: bad });
  if (birthday === null) return json(400, { error: "Please check your birthday." });
  const existing = await db.get("users/" + email);
  if (existing && existing.password) return json(409, { error: "There's already an account with this email. Please sign in, or use Forgot password." });
  const password = await hashPassword(String(body.password));
  const r = await emailLink(request, env, db, email, "signup", { name, birthday: birthday || "", password });
  if (r) return r;
  return json(200, { ok: true, confirm: true });
}

async function login(request, env, db) {
  let body; try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const email = cleanEmail(body.email);
  if (!validEmail(email)) return json(400, { error: "Please enter a valid email address." });
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const failKey = "acctrl/pw/" + (await hash(email + "|" + ip)).slice(0, 24);
  const fails = (await db.get(failKey)) || { n: 0, start: Date.now() };
  if (Date.now() - fails.start < 900e3 && fails.n >= 8) return json(429, { error: "Too many tries. Please wait 15 minutes, or use Forgot password." });
  const user = await db.get("users/" + email);
  if (!user || !user.password) {
    if (user) return json(400, { error: "You haven't set a password yet. Tap “Forgot or never set a password?” and we'll email you a link to set one.", code: "no_password" });
    return json(400, { error: "That email and password don't match." });
  }
  if (!(await checkPassword(String(body.password || ""), user.password))) {
    await db.set(failKey, Date.now() - fails.start > 900e3 ? { n: 1, start: Date.now() } : { n: fails.n + 1, start: fails.start });
    return json(400, { error: "That email and password don't match." });
  }
  await db.del(failKey);
  await db.set("users/" + email, { ...user, lastLoginAt: new Date().toISOString() });
  return json(200, { ok: true }, { "Set-Cookie": await startSession(db, email) });
}

// Forgot (or never set) a password: email a link to choose one. Always answers ok so it can't reveal who has an account.
async function forgot(request, env, db) {
  let body; try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const email = cleanEmail(body.email);
  if (!validEmail(email)) return json(400, { error: "Please enter a valid email address." });
  const user = await db.get("users/" + email);
  const booked = user ? null : (await db.search("bookings/", email)).find((b) => b && cleanEmail(b.purchaser && b.purchaser.email) === email);
  if (user || booked) {
    const r = await emailLink(request, env, db, email, "reset", { name: (user && user.name) || (booked && booked.purchaser.name) || "" });
    if (r) return r;
  }
  return json(200, { ok: true });
}

// Email link landing: confirm a new account (signup) or set a new password (reset, needs body.password).
async function verify(request, env, db, ctx) {
  let body; try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const token = String(body.token || "").slice(0, 100);
  const key = "acctlogin/" + (await hash(token));
  const rec = token ? await db.get(key) : null;
  if (!rec || rec.exp < Date.now()) return json(400, { error: "This link has expired. Please request a new one." });
  let password = rec.password || null;
  if (rec.kind === "reset") {
    const bad = passwordProblem(body.password); if (bad) return json(400, { error: bad });
    password = await hashPassword(String(body.password));
  }
  const email = rec.email, now = new Date().toISOString();
  const isNew = await db.addIfNew("users/" + email, { email, name: rec.name || "", birthday: rec.birthday || "", password, createdAt: now, lastLoginAt: now });
  let user = await db.get("users/" + email);
  if (!isNew) {
    user = { ...user, name: user.name || rec.name || "", lastLoginAt: now };
    if (password) user.password = password;
    if (rec.birthday && !user.birthday) user.birthday = rec.birthday;
    await db.set("users/" + email, user);
  }
  await db.del(key); // links work once
  if (isNew) {
    const task = syncContact(env, user).then((sync) => db.get("users/" + email).then((u) => db.set("users/" + email, { ...u, sync, syncedAt: new Date().toISOString() }))).catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(task); else await task;
  }
  if (user.birthday) syncBirthday(env, user).catch(() => {});
  return json(200, { ok: true, isNew }, { "Set-Cookie": await startSession(db, email) });
}

// Signed-in profile updates (birthday, name).
async function profile(request, env, db) {
  const email = await currentEmail(request, db);
  if (!email) return json(401, { error: "Please sign in again." });
  let body; try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const user = (await db.get("users/" + email)) || { email, createdAt: new Date().toISOString() };
  if ("birthday" in body) { const b = cleanBirthday(body.birthday); if (b === null) return json(400, { error: "Please check your birthday." }); user.birthday = b; }
  if ("name" in body) { const n = cleanName(body.name); if (n.length >= 2) user.name = n; }
  let commsChanged = false;
  if ("phone" in body) {
    const ph = String(body.phone || "").replace(/[^\d+]/g, "").slice(0, 16);
    if (ph && ph.replace(/\D/g, "").length < 10) return json(400, { error: "Please enter a full phone number." });
    if (ph !== (user.phone || "")) commsChanged = true;
    user.phone = ph;
  }
  if (body.comms && typeof body.comms === "object") {
    const now = new Date().toISOString(), prev = user.comms || {};
    const next = { email: body.comms.email !== false, sms: body.comms.sms === true };
    if (next.sms && !(user.phone || "").replace(/\D/g, "")) return json(400, { error: "Add your mobile number to get text messages." });
    // Keep a record of when consent was given or withdrawn (needed for text messaging rules).
    user.comms = { ...next,
      emailUpdatedAt: prev.email === next.email && prev.emailUpdatedAt ? prev.emailUpdatedAt : now,
      smsUpdatedAt: prev.sms === next.sms && prev.smsUpdatedAt ? prev.smsUpdatedAt : now,
      smsConsentText: next.sms ? SMS_CONSENT : prev.smsConsentText || "" };
    if (prev.email !== next.email || prev.sms !== next.sms) commsChanged = true;
  }
  if (body.emergency && typeof body.emergency === "object") {
    const e = body.emergency;
    const em = { name: cleanName(e.name), phone: String(e.phone || "").replace(/[^\d+()\-\s]/g, "").trim().slice(0, 25), relationship: cleanName(e.relationship).slice(0, 40) };
    if ((em.name || em.phone) && (em.name.length < 2 || em.phone.replace(/\D/g, "").length < 10)) return json(400, { error: "Please enter your emergency contact's name and full phone number." });
    user.emergency = em.name ? { ...em, updatedAt: new Date().toISOString() } : null;
  }
  await db.set("users/" + email, user);
  if (user.birthday && "birthday" in body) await syncBirthday(env, user).catch(() => {});
  if (commsChanged) await syncComms(env, user).catch(() => {});
  return json(200, { ok: true, birthday: user.birthday || "", name: user.name || "", phone: user.phone || "", comms: user.comms || { email: true, sms: false }, emergency: user.emergency || null });
}
const SMS_CONSENT = "By providing your mobile phone number, you agree to receive text messages from Sea Sculpt Club at the number provided, sent using an automated system. Consent is not a condition of purchase. Message frequency varies. Message and data rates may apply. Reply STOP to cancel or HELP for help.";
function e164(ph) { const d = String(ph || "").replace(/\D/g, ""); return d.length === 10 ? "+1" + d : d.length === 11 && d[0] === "1" ? "+" + d : ph && ph[0] === "+" ? "+" + d : ""; }
async function syncComms(env, user) {
  const c = user.comms || { email: true, sms: false };
  if (env.BREVO_API_KEY) {
    const attributes = {};
    const sms = e164(user.phone);
    if (sms) attributes.SMS = sms;
    await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST", headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: user.email, updateEnabled: true, emailBlacklisted: !c.email, smsBlacklisted: !c.sms, attributes })
    });
  }
}
async function syncBirthday(env, user) {
  if (env.HUBSPOT_TOKEN) {
    await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert", {
      method: "POST", headers: { Authorization: `Bearer ${env.HUBSPOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: [{ id: user.email, idProperty: "email", properties: { email: user.email, date_of_birth: user.birthday } }] })
    });
  }
  if (env.BREVO_API_KEY && env.BREVO_BIRTHDAY_ATTRIBUTE) {
    await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST", headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: user.email, updateEnabled: true, attributes: { [env.BREVO_BIRTHDAY_ATTRIBUTE]: user.birthday } })
    });
  }
}

async function currentEmail(request, db) {
  const token = cookieValue(request, COOKIE);
  if (!token || token.length > 100) return null;
  const s = await db.get("acctsess/" + (await hash(token)));
  return s && s.exp > Date.now() ? s.email : null;
}

async function me(request, env, db) {
  const email = await currentEmail(request, db);
  if (!email) return json(401, { error: "Not signed in" });
  const user = (await db.get("users/" + email)) || { email, name: "" };
  const today = todayET();

  const bookings = (await db.search("bookings/", email))
    .filter((b) => b && b.status === "paid" && b.source !== "test" && cleanEmail(b.purchaser && b.purchaser.email) === email);
  const reservations = [], purchases = [], giftsSent = [];
  for (const b of bookings) {
    for (const it of b.items || []) {
      if (it.kind === "class") {
        const startsAt = classStart(it.date, it.time);
        reservations.push({
          bookingId: b.id, item: it.catalogId, ref: b.ref, provider: b.provider || "stripe", name: it.className, date: it.date || null, dateLabel: it.dateLabel || "", time: it.time || "", location: it.location || "",
          spots: it.spots || 1, attendees: it.attendees || [], coveredByCode: it.giftCovered || 0,
          upcoming: !it.date || it.date >= today,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          refundable: startsAt ? startsAt - Date.now() >= CANCEL_HOURS * 3600e3 : false,
          cancelled: it.cancelled || null
        });
      } else {
        purchases.push({ ref: b.ref, name: it.className, kind: it.kind, qty: it.spots || 1, at: b.paidAt || b.createdAt });
        if (it.kind === "gift") for (const g of it.gifts || []) giftsSent.push({ name: it.className, toName: g.toName || "", sendOn: g.sendOn || "now", status: g.status || "" });
      }
    }
  }
  reservations.sort((a, b) => (a.upcoming === b.upcoming ? (a.upcoming ? 1 : -1) * String(a.date || "").localeCompare(String(b.date || "")) : a.upcoming ? -1 : 1));

  const codes = (await db.search("giftcodes/", email))
    .filter((c) => c && !c.test && (cleanEmail(c.toEmail) === email || cleanEmail(c.ownerEmail) === email))
    .map(codeSummary)
    .sort((a, b) => (b.left - a.left) || String(b.createdAt).localeCompare(String(a.createdAt)));

  const latest = bookings.slice().sort((a, b) => String(b.paidAt || b.createdAt || "").localeCompare(String(a.paidAt || a.createdAt || "")))[0];
  const phone = user.phone || (latest && latest.purchaser && latest.purchaser.phone) || "";
  const name = user.name || (latest && latest.purchaser && latest.purchaser.name) || "";
  return json(200, {
    user: { email, name, phone, birthday: user.birthday || "", hasPassword: !!user.password, since: user.createdAt || null,
      comms: user.comms ? { email: user.comms.email !== false, sms: !!user.comms.sms } : { email: true, sms: false }, emergency: user.emergency || null },
    reservations, codes, giftsSent, purchases, creditValue: CREDIT_VALUE
  });
}

// ---------- cancellations ----------
const CANCEL_HOURS = 12;
// "2026-12-05" + "12:00 PM" (New Jersey time) -> epoch ms
function classStart(date, time) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(String(time || "").trim());
  let h = 0, min = 0;
  if (m) { h = (+m[1] % 12) + (/p/i.test(m[3]) ? 12 : 0); min = +m[2]; }
  const guess = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), h, min);
  // Find New York's UTC offset at that moment (handles daylight saving).
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(guess)).reduce((o, p) => (o[p.type] = p.value, o), {});
  const asNY = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
  return guess + (guess - asNY);
}
const money = (c) => "$" + (c / 100).toFixed(c % 100 ? 2 : 0);
// What the customer actually paid for one class line (card part only), shared fairly if a promo code lowered the total.
function paidForItem(booking, it) {
  const lineOf = (x) => x.kind === "class" || x.kind ? Math.max(0, (x.spots || 1) - (x.giftCovered || 0)) * (x.unitAmount || 0) + (x.giftCovered || 0) * Math.max(0, (x.unitAmount || 0) - CREDIT_VALUE) : 0;
  const gross = (booking.items || []).reduce((n, x) => n + lineOf(x), 0);
  const total = booking.amountTotal || 0;
  if (!gross || !total) return 0;
  return Math.min(total, Math.round(lineOf(it) * Math.min(1, total / gross)));
}

// PayPal refund for a captured payment (amount in cents).
async function paypalRefund(env, captureId, cents, requestId, note) {
  const live = String(env.PAYPAL_ENV || "").trim().toLowerCase() === "live";
  const api = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const id = String(env.PAYPAL_CLIENT_ID || "").trim(), secret = String(env.PAYPAL_CLIENT_SECRET || "").trim();
  if (!id || !secret) return { ok: false, status: 0, data: { message: "PayPal is not set up" } };
  const t = await fetch(api + "/v1/oauth2/token", { method: "POST", headers: { Authorization: "Basic " + btoa(id + ":" + secret), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  const td = await t.json().catch(() => ({}));
  if (!t.ok || !td.access_token) return { ok: false, status: t.status, data: { message: "PayPal sign-in failed" } };
  const r = await fetch(`${api}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: "POST",
    headers: { Authorization: "Bearer " + td.access_token, "Content-Type": "application/json", "PayPal-Request-Id": requestId, Prefer: "return=representation" },
    body: JSON.stringify({ amount: { value: (cents / 100).toFixed(2), currency_code: "USD" }, note_to_payer: String(note || "Sea Sculpt Club cancellation").slice(0, 255) })
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

async function sendMail(env, to, subject, text, html) {
  if (!env.RESEND_API_KEY) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.BOOKING_EMAIL_FROM || "Sea Sculpt Club <bookings@seasculptclub.com>", to: [to], reply_to: "seasculptclub@gmail.com", subject, text, html })
    });
    return r.ok;
  } catch (e) { return false; }
}

async function cancel(request, env, db) {
  const email = await currentEmail(request, db);
  if (!email) return json(401, { error: "Please sign in again." });
  let body; try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const bookingId = String(body.bookingId || ""), itemId = String(body.item || "");
  if (!/^[A-Za-z0-9_-]{4,200}$/.test(bookingId) || !itemId) return json(400, { error: "Unknown reservation" });
  const key = "bookings/" + bookingId;
  const booking = await db.get(key);
  if (!booking || cleanEmail(booking.purchaser && booking.purchaser.email) !== email) return json(404, { error: "We couldn't find that reservation." });
  const it = (booking.items || []).find((x) => x.catalogId === itemId && x.kind === "class");
  if (!it) return json(404, { error: "We couldn't find that reservation." });
  if (it.cancelled) return json(200, { ok: true, already: true, cancelled: it.cancelled });
  const startsAt = classStart(it.date, it.time);
  if (startsAt && startsAt < Date.now()) return json(400, { error: "This class has already started, so it can't be cancelled online." });
  const refundable = !!startsAt && startsAt - Date.now() >= CANCEL_HOURS * 3600e3;

  const result = { at: new Date().toISOString(), refundable, refund: null, codeReturned: 0, manualRefund: false };
  if (refundable) {
    // Classes paid with a code go back on the code.
    const covered = it.giftCovered || 0;
    const code = booking.giftRedemption && booking.giftRedemption.code;
    if (covered && code) {
      const ck = "giftcodes/" + code, rec = await db.get(ck);
      if (rec) {
        rec.uses = [...(rec.uses || []), { n: -covered, bookingId, ref: booking.ref || null, at: result.at, cancelled: true }];
        await db.set(ck, rec);
        result.codeReturned = covered;
      }
    }
    // Card part goes back to the card through Stripe.
    const amount = paidForItem(booking, it);
    if (amount > 0) {
      const already = booking.refundedAmount || 0;
      const toRefund = Math.min(amount, Math.max(0, (booking.amountTotal || 0) - already));
      let ok = false;
      if (toRefund > 0 && booking.provider === "paypal" && booking.paypalCaptureId) {
        try {
          const rr = await paypalRefund(env, booking.paypalCaptureId, toRefund, `cancel-${bookingId}-${itemId}`, `${booking.ref || ""} ${it.className || ""}`);
          ok = rr.ok;
          result.refund = { amount: toRefund, id: rr.data.id || null, provider: "paypal", status: ok ? String(rr.data.status || "pending").toLowerCase() : "failed", error: ok ? null : (rr.data.message || rr.data.name || `HTTP ${rr.status}`) };
          if (ok) booking.refundedAmount = already + toRefund;
        } catch (e) { result.refund = { amount: toRefund, provider: "paypal", status: "failed", error: String(e && e.message || e) }; }
      } else if (toRefund > 0 && booking.paymentIntent && env.STRIPE_SECRET_KEY) {
        try {
          const p = new URLSearchParams({ payment_intent: booking.paymentIntent, amount: String(toRefund), reason: "requested_by_customer", "metadata[booking_ref]": booking.ref || "", "metadata[class]": it.className || "" });
          const rr = await fetch("https://api.stripe.com/v1/refunds", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY.trim()}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `cancel-${bookingId}-${itemId}` },
            body: p.toString()
          });
          const rd = await rr.json().catch(() => ({}));
          ok = rr.ok;
          result.refund = { amount: toRefund, id: rd.id || null, status: ok ? rd.status || "pending" : "failed", error: ok ? null : (rd.error && rd.error.message) || `HTTP ${rr.status}` };
          if (ok) booking.refundedAmount = already + toRefund;
        } catch (e) { result.refund = { amount: toRefund, status: "failed", error: String(e && e.message || e) }; }
      } else if (toRefund > 0) {
        result.refund = { amount: toRefund, status: "failed", error: "No card payment on file for an automatic refund" };
      }
      if (!ok && toRefund > 0) result.manualRefund = true;
    }
  }

  it.cancelled = result;
  booking.flags = [...(booking.flags || []), `Cancelled online by the customer: ${it.className} (${it.spots || 1} ${it.spots === 1 ? "spot" : "spots"}), ` +
    (refundable ? [result.refund && result.refund.status !== "failed" ? `refunded ${money(result.refund.amount)} to their ${result.refund.provider === "paypal" ? "PayPal" : "card"}` : "", result.manualRefund ? `REFUND ${money(result.refund.amount)} NEEDED IN ${result.refund.provider === "paypal" ? "PAYPAL" : "STRIPE"} (automatic refund failed)` : "", result.codeReturned ? `${result.codeReturned} class back on code ${booking.giftRedemption.code}` : ""].filter(Boolean).join("; ") || "nothing to refund"
      : "less than 12 hours before class, no refund") + "."];
  await db.set(key, booking);

  // Emails: the customer, and Sea Sculpt Club.
  const first = (booking.purchaser.name || "").split(" ")[0] || "there";
  const when = [it.dateLabel, it.time].filter(Boolean).join(" at ");
  const lines = [];
  if (refundable && result.refund && result.refund.status !== "failed") lines.push(result.refund.provider === "paypal" ? `${money(result.refund.amount)} is being refunded to your PayPal account. It usually shows up within a few days.` : `${money(result.refund.amount)} is being refunded to your card. It usually shows up in 5 to 10 business days.`);
  if (refundable && result.manualRefund) lines.push(`Your refund of ${money(result.refund.amount)} is on its way. We'll process it shortly and you'll see it in 5 to 10 business days.`);
  if (result.codeReturned) lines.push(`${result.codeReturned} ${result.codeReturned === 1 ? "class has" : "classes have"} been added back to your code ${booking.giftRedemption.code}.`);
  if (!refundable) lines.push("Because it was less than 12 hours before class, this cancellation isn't eligible for a refund, per our cancellation policy.");
  const custText = `Hi ${first},\n\nYour spot in ${it.className}${when ? " (" + when + ")" : ""} has been cancelled.\n\n${lines.join("\n\n")}\n\nBooking reference: ${booking.ref || ""}\n\nWe hope to see you on the mat soon,\nSea Sculpt Club`;
  const custHtml = `<div style="font-family:Georgia,serif;color:#12314F;max-width:520px"><p>Hi ${esc(first)},</p><p>Your spot in <strong>${esc(it.className)}</strong>${when ? " (" + esc(when) + ")" : ""} has been cancelled.</p>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p>Booking reference: ${esc(booking.ref || "")}</p><p>We hope to see you on the mat soon,<br>Sea Sculpt Club</p></div>`;
  await sendMail(env, booking.purchaser.email, `Cancelled: ${it.className}`, custText, custHtml);
  const owner = env.BOOKING_NOTIFY_EMAIL || "seasculptclub@gmail.com";
  const ownText = `${booking.purchaser.name} (${booking.purchaser.email}) cancelled ${it.className}${when ? ", " + when : ""} (${it.spots || 1} ${it.spots === 1 ? "spot" : "spots"}${it.attendees && it.attendees.length ? ": " + it.attendees.join(", ") : ""}). Ref ${booking.ref || ""}.\n\n` +
    (refundable ? (result.manualRefund ? `ACTION NEEDED: the automatic refund failed (${result.refund.error}). Please refund ${money(result.refund.amount)} in ${result.refund.provider === "paypal" ? "PayPal" : "Stripe"}.` : result.refund ? `Refunded ${money(result.refund.amount)} automatically.` : "No card payment to refund.") + (result.codeReturned ? ` ${result.codeReturned} class returned to code ${booking.giftRedemption.code}.` : "")
      : "Less than 12 hours before class: no refund given.");
  await sendMail(env, owner, `${result.manualRefund ? "Refund needed: " : ""}Cancellation: ${it.className} (${booking.purchaser.name})`, ownText, `<pre style="font-family:Helvetica,Arial,sans-serif;white-space:pre-wrap">${esc(ownText)}</pre>`);

  return json(200, { ok: true, cancelled: result });
}

// ---------- saved cards (stored by Stripe; we only list and remove them) ----------
function customerIdFor(env, user) {
  const live = String(env.STRIPE_SECRET_KEY || "").includes("_live_");
  return live ? user.stripeCustomerId : user.stripeTestCustomerId;
}
async function cards(request, env, db) {
  const email = await currentEmail(request, db);
  if (!email) return json(401, { error: "Please sign in again." });
  const user = (await db.get("users/" + email)) || {};
  const cus = customerIdFor(env, user);
  if (!cus || !env.STRIPE_SECRET_KEY) return json(200, { cards: [] });
  const r = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(cus)}/payment_methods?limit=20`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY.trim()}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return json(200, { cards: [], unavailable: true });
  const list = (d.data || []).map((pm) => pm.card ? { id: pm.id, brand: pm.card.display_brand || pm.card.brand, last4: pm.card.last4, exp: `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}` }
    : pm.type === "link" ? { id: pm.id, brand: "Link", last4: "", exp: "" } : { id: pm.id, brand: pm.type, last4: "", exp: "" });
  return json(200, { cards: list });
}
async function removeCard(request, env, db) {
  const email = await currentEmail(request, db);
  if (!email) return json(401, { error: "Please sign in again." });
  let body; try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const pmId = String(body.id || "");
  if (!/^pm_[A-Za-z0-9]{8,100}$/.test(pmId)) return json(400, { error: "Unknown card" });
  const user = (await db.get("users/" + email)) || {};
  const cus = customerIdFor(env, user);
  if (!cus) return json(404, { error: "Unknown card" });
  const key = env.STRIPE_SECRET_KEY.trim();
  // Only remove cards that belong to this person.
  const g = await fetch(`https://api.stripe.com/v1/payment_methods/${pmId}`, { headers: { Authorization: `Bearer ${key}` } });
  const pm = await g.json().catch(() => ({}));
  if (!g.ok || pm.customer !== cus) return json(404, { error: "Unknown card" });
  const r = await fetch(`https://api.stripe.com/v1/payment_methods/${pmId}/detach`, { method: "POST", headers: { Authorization: `Bearer ${key}` } });
  if (!r.ok) return json(502, { error: "Couldn't remove that card right now. Please try again." });
  return json(200, { ok: true });
}

async function logout(request, env, db) {
  const token = cookieValue(request, COOKIE);
  if (token && token.length <= 100) await db.del("acctsess/" + (await hash(token)));
  return json(200, { ok: true }, { "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
}

export async function onRequest(context) {
  const { request, env } = context;
  const path = Array.isArray(context.params && context.params.path) ? context.params.path.join("/") : String((context.params && context.params.path) || "");
  try {
    const db = store(env.DB);
    if (path === "signup" && request.method === "POST") return await signup(request, env, db);
    if (path === "login" && request.method === "POST") return await login(request, env, db);
    if (path === "forgot" && request.method === "POST") return await forgot(request, env, db);
    if (path === "profile" && request.method === "POST") return await profile(request, env, db);
    if (path === "verify" && request.method === "POST") return await verify(request, env, db, context);
    if (path === "me" && request.method === "GET") return await me(request, env, db);
    if (path === "logout" && request.method === "POST") return await logout(request, env, db);
    if (path === "cancel" && request.method === "POST") return await cancel(request, env, db);
    if (path === "cards" && request.method === "GET") return await cards(request, env, db);
    if (path === "cards/remove" && request.method === "POST") return await removeCard(request, env, db);
    return json(404, { error: "Not found" });
  } catch (err) {
    console.error("/api/account failed:", err && (err.stack || err.message || err));
    return json(500, { error: "Something went wrong. Please try again." });
  }
}
