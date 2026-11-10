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
        const startsAt = classStart(it.date, it.time);
        reservations.push({
          bookingId: b.id, item: it.catalogId, ref: b.ref, name: it.className, date: it.date || null, dateLabel: it.dateLabel || "", time: it.time || "", location: it.location || "",
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
    user: { email, name, phone, since: user.createdAt || null },
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
      if (toRefund > 0 && booking.paymentIntent && env.STRIPE_SECRET_KEY) {
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
    (refundable ? [result.refund && result.refund.status !== "failed" ? `refunded ${money(result.refund.amount)} to their card` : "", result.manualRefund ? `REFUND ${money(result.refund.amount)} NEEDED IN STRIPE (automatic refund failed)` : "", result.codeReturned ? `${result.codeReturned} class back on code ${booking.giftRedemption.code}` : ""].filter(Boolean).join("; ") || "nothing to refund"
      : "less than 12 hours before class, no refund") + "."];
  await db.set(key, booking);

  // Emails: the customer, and Sea Sculpt Club.
  const first = (booking.purchaser.name || "").split(" ")[0] || "there";
  const when = [it.dateLabel, it.time].filter(Boolean).join(" at ");
  const lines = [];
  if (refundable && result.refund && result.refund.status !== "failed") lines.push(`${money(result.refund.amount)} is being refunded to your card. It usually shows up in 5 to 10 business days.`);
  if (refundable && result.manualRefund) lines.push(`Your refund of ${money(result.refund.amount)} is on its way. We'll process it shortly and you'll see it in 5 to 10 business days.`);
  if (result.codeReturned) lines.push(`${result.codeReturned} ${result.codeReturned === 1 ? "class has" : "classes have"} been added back to your code ${booking.giftRedemption.code}.`);
  if (!refundable) lines.push("Because it was less than 12 hours before class, this cancellation isn't eligible for a refund, per our cancellation policy.");
  const custText = `Hi ${first},\n\nYour spot in ${it.className}${when ? " (" + when + ")" : ""} has been cancelled.\n\n${lines.join("\n\n")}\n\nBooking reference: ${booking.ref || ""}\n\nWe hope to see you on the mat soon,\nSea Sculpt Club`;
  const custHtml = `<div style="font-family:Georgia,serif;color:#12314F;max-width:520px"><p>Hi ${esc(first)},</p><p>Your spot in <strong>${esc(it.className)}</strong>${when ? " (" + esc(when) + ")" : ""} has been cancelled.</p>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p>Booking reference: ${esc(booking.ref || "")}</p><p>We hope to see you on the mat soon,<br>Sea Sculpt Club</p></div>`;
  await sendMail(env, booking.purchaser.email, `Cancelled: ${it.className}`, custText, custHtml);
  const owner = env.BOOKING_NOTIFY_EMAIL || "seasculptclub@gmail.com";
  const ownText = `${booking.purchaser.name} (${booking.purchaser.email}) cancelled ${it.className}${when ? ", " + when : ""} (${it.spots || 1} ${it.spots === 1 ? "spot" : "spots"}${it.attendees && it.attendees.length ? ": " + it.attendees.join(", ") : ""}). Ref ${booking.ref || ""}.\n\n` +
    (refundable ? (result.manualRefund ? `ACTION NEEDED: the automatic refund failed (${result.refund.error}). Please refund ${money(result.refund.amount)} in Stripe.` : result.refund ? `Refunded ${money(result.refund.amount)} automatically.` : "No card payment to refund.") + (result.codeReturned ? ` ${result.codeReturned} class returned to code ${booking.giftRedemption.code}.` : "")
      : "Less than 12 hours before class: no refund given.");
  await sendMail(env, owner, `${result.manualRefund ? "Refund needed: " : ""}Cancellation: ${it.className} (${booking.purchaser.name})`, ownText, `<pre style="font-family:Helvetica,Arial,sans-serif;white-space:pre-wrap">${esc(ownText)}</pre>`);

  return json(200, { ok: true, cancelled: result });
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
    if (path === "cancel" && request.method === "POST") return await cancel(request, env, db);
    return json(404, { error: "Not found" });
  } catch (err) {
    console.error("/api/account failed:", err && (err.stack || err.message || err));
    return json(500, { error: "Something went wrong. Please try again." });
  }
}
