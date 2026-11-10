// Sea Sculpt Club accounts: sign in with an emailed link (no passwords), then see your
// reservations and class codes. Routes (this file handles /api/account/*):
//   POST /api/account/login   { email, name? }  -> emails a sign-in link (always answers ok)
//   POST /api/account/verify  { token }         -> starts a 30-day session (HttpOnly cookie)
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

// ---------- email ----------
async function sendLoginEmail(env, email, link, isNew) {
  if (!env.RESEND_API_KEY) return false;
  const subject = isNew ? "Finish creating your Sea Sculpt Club account" : "Your Sea Sculpt Club sign-in link";
  const lead = isNew ? "Tap the button below to finish creating your account." : "Tap the button below to sign in to your account.";
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#12314F;max-width:520px;margin:0 auto;padding:24px">
<p style="font-size:20px;margin:0 0 14px">Sea Sculpt Club</p>
<p style="margin:0 0 18px;line-height:1.5">${lead} See your reservations and how many classes are left on your class packs and eGift cards.</p>
<p style="margin:0 0 22px"><a href="${esc(link)}" style="display:inline-block;background:#12314F;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:14px;letter-spacing:.08em">SIGN IN</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#4A6683;line-height:1.5">This link works for ${LINK_MINUTES} minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`;
  const text = `${lead}\n\n${link}\n\nThis link works for ${LINK_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.BOOKING_EMAIL_FROM || "Sea Sculpt Club <bookings@seasculptclub.com>", to: [email], reply_to: "seasculptclub@gmail.com", subject, html, text })
    });
    return r.ok;
  } catch (e) { return false; }
}

// ---------- handlers ----------
async function login(request, env, db) {
  let body; try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const email = cleanEmail(body.email), name = cleanName(body.name);
  if (!validEmail(email)) return json(400, { error: "Please enter a valid email address." });
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (await limited(db, "acctrl/ip/" + (await hash(ip)).slice(0, 24), 20, 3600e3)) return json(429, { error: "Too many sign-in requests. Please try again in an hour." });
  if (await limited(db, "acctrl/email/" + (await hash(email)).slice(0, 24), 5, 3600e3)) return json(429, { error: "We've sent several links to this email already. Please check your inbox (and spam), or try again in an hour." });
  const token = newToken();
  const existing = await db.get("users/" + email);
  await db.set("acctlogin/" + (await hash(token)), { email, name, exp: Date.now() + LINK_MINUTES * 60e3 });
  const site = (env.SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
  const sent = await sendLoginEmail(env, email, `${site}/account?login=${token}`, !existing);
  if (!sent) return json(502, { error: "We couldn't send the email right now. Please try again in a moment." });
  return json(200, { ok: true });
}

async function verify(request, env, db, ctx) {
  let body; try { body = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const token = String(body.token || "").slice(0, 100);
  const key = "acctlogin/" + (await hash(token));
  const rec = token ? await db.get(key) : null;
  if (!rec || rec.exp < Date.now()) return json(400, { error: "This sign-in link has expired. Please request a new one." });
  const email = rec.email, now = new Date().toISOString();
  const isNew = await db.addIfNew("users/" + email, { email, name: rec.name || "", createdAt: now, lastLoginAt: now });
  let user = await db.get("users/" + email);
  if (!isNew) { user = { ...user, name: user.name || rec.name || "", lastLoginAt: now }; await db.set("users/" + email, user); }
  if (isNew) {
    const task = syncContact(env, user).then((sync) => db.set("users/" + email, { ...user, sync, syncedAt: new Date().toISOString() })).catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(task); else await task;
  }
  const session = newToken();
  await db.set("acctsess/" + (await hash(session)), { email, exp: Date.now() + SESSION_DAYS * 864e5 });
  const cookie = `${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
  return json(200, { ok: true, isNew }, { "Set-Cookie": cookie });
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
        reservations.push({
          ref: b.ref, name: it.className, date: it.date || null, dateLabel: it.dateLabel || "", time: it.time || "", location: it.location || "",
          spots: it.spots || 1, attendees: it.attendees || [], coveredByCode: it.giftCovered || 0,
          upcoming: !it.date || it.date >= today
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
    user: { email, name, phone, since: user.createdAt || null },
    reservations, codes, giftsSent, purchases, creditValue: CREDIT_VALUE
  });
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
    if (path === "login" && request.method === "POST") return await login(request, env, db);
    if (path === "verify" && request.method === "POST") return await verify(request, env, db, context);
    if (path === "me" && request.method === "GET") return await me(request, env, db);
    if (path === "logout" && request.method === "POST") return await logout(request, env, db);
    return json(404, { error: "Not found" });
  } catch (err) {
    console.error("/api/account failed:", err && (err.stack || err.message || err));
    return json(500, { error: "Something went wrong. Please try again." });
  }
}
