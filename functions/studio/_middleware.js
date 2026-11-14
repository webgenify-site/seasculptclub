// Sculpt Studio (seasculptclub.com/studio) is for the owner only.
// Sign-in is a 4-digit code kept in the STUDIO_CODE secret (Cloudflare → Settings → Variables and Secrets).
// Until STUDIO_CODE is set, the page asks for ADMIN_PASSWORD instead.
// Wrong codes are rate-limited in the DB (D1): 5 tries per device per 15 minutes,
// and 30 wrong tries in total per hour locks the page for everyone until the hour is up.
// Signing in sets a cookie that lasts 30 days; changing the code signs everyone out.

const COOKIE = "studio_auth";
const DAYS = 30;
const PER_DEVICE = 5, DEVICE_WINDOW = 15 * 60e3;
const PER_HOUR_ALL = 30, ALL_WINDOW = 60 * 60e3;
const enc = new TextEncoder();

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha = async (t) => hex(await crypto.subtle.digest("SHA-256", enc.encode(t)));

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}

async function sameText(a, b) {
  const [x, y] = await Promise.all([sha(a), sha(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

async function makeToken(secret) {
  const exp = Date.now() + DAYS * 864e5;
  return exp + "." + (await hmacHex(secret, "studio:" + exp));
}

async function tokenIsValid(secret, token) {
  const [exp, sig] = String(token || "").split(".");
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return sameText(sig, await hmacHex(secret, "studio:" + exp));
}

function readCookie(request, name) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

// ---- Rate limiting (D1). If the DB isn't available, sign-in still works, just without limits.
async function db(env) {
  if (!env.DB) return null;
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS studio_attempts (k TEXT PRIMARY KEY, count INTEGER NOT NULL, first INTEGER NOT NULL)").run();
    return env.DB;
  } catch {
    return null;
  }
}
async function getRec(d, k, windowMs) {
  const r = await d.prepare("SELECT count, first FROM studio_attempts WHERE k = ?").bind(k).first();
  if (!r || Date.now() - r.first > windowMs) return { count: 0, first: Date.now() };
  return r;
}
async function bump(d, k, rec) {
  await d.prepare("INSERT INTO studio_attempts (k, count, first) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET count = excluded.count, first = excluded.first")
    .bind(k, rec.count + 1, rec.first).run();
}
const minutesLeft = (rec, windowMs) => Math.max(1, Math.ceil((rec.first + windowMs - Date.now()) / 60e3));

function page({ mode, message = "", status = 200, locked = false }) {
  const isCode = mode === "code";
  const field = isCode
    ? `<input name="code" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" minlength="4" autocomplete="one-time-code"
         placeholder="••••" aria-label="4-digit code" class="code" required autofocus ${locked ? "disabled" : ""}
         oninput="this.value=this.value.replace(/\\D/g,'').slice(0,4);if(this.value.length===4)this.form.submit()">`
    : `<input name="password" type="password" placeholder="Admin password" aria-label="Admin password" autocomplete="current-password" required autofocus ${locked ? "disabled" : ""}>`;
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Sculpt Studio</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Nunito,system-ui,sans-serif;color:#1f3a5f;
       background:linear-gradient(135deg,#fde4f0 0%,#fdf3f8 50%,#dcecf8 100%)}
  .card{width:100%;max-width:360px;background:#fff;border-radius:28px;padding:32px 28px;box-shadow:0 10px 40px rgba(31,58,95,.12);text-align:center}
  .bow{font-size:40px}
  h1{font-family:"Playfair Display",serif;font-weight:600;margin:8px 0 4px;font-size:28px}
  p{margin:0 0 20px;color:#1f3a5f99;font-size:14px}
  input{width:100%;padding:14px 16px;border:2px solid #f7bdd9;border-radius:999px;font:inherit;font-size:16px;outline:none;text-align:center}
  input.code{font-size:32px;letter-spacing:.6em;padding:12px 0 12px .6em;font-weight:800}
  input:focus{border-color:#c65e96}
  button{margin-top:12px;width:100%;padding:14px;border:0;border-radius:999px;background:#c65e96;color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer}
  button:hover{background:#a8457c} button:disabled{opacity:.4}
  .err{margin:14px 0 0;color:#b42318;font-weight:700;font-size:14px}
</style></head>
<body><form class="card" method="POST" action="/studio/">
  <div class="bow">🎀</div><h1>Sculpt Studio</h1>
  <p>${isCode ? "Enter your 4-digit code" : "Enter your admin password (a 4-digit code isn't set up yet)"}</p>
  ${field}
  <button type="submit" ${locked ? "disabled" : ""}>Open Sculpt Studio</button>
  ${message ? `<div class="err">${message}</div>` : ""}
</form></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const admin = (env && env.ADMIN_PASSWORD) || "";
  const rawCode = String((env && env.STUDIO_CODE) || "").trim();
  const code = /^\d{4}$/.test(rawCode) ? rawCode : "";
  const mode = code ? "code" : "password";
  const expected = code || admin;
  if (!code && admin.length < 12) {
    return new Response("Sculpt Studio isn't set up yet: add STUDIO_CODE (4 digits) in your hosting settings.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const secret = "studio|" + admin + "|" + expected; // changing the code signs everyone out

  if (request.method === "POST") {
    const d = await db(env);
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const devKey = "dev:" + (await sha(ip)).slice(0, 24);
    let dev, all;
    if (d) {
      [dev, all] = await Promise.all([getRec(d, devKey, DEVICE_WINDOW), getRec(d, "all", ALL_WINDOW)]);
      if (dev.count >= PER_DEVICE) return page({ mode, status: 429, locked: true, message: `Too many tries. Wait ${minutesLeft(dev, DEVICE_WINDOW)} min and try again.` });
      if (all.count >= PER_HOUR_ALL) return page({ mode, status: 429, locked: true, message: `Locked after too many wrong codes. Try again in ${minutesLeft(all, ALL_WINDOW)} min.` });
    }

    let given = "";
    try {
      const f = await request.formData();
      given = String(f.get(mode === "code" ? "code" : "password") || "").trim();
    } catch {}

    if (!(await sameText(given, expected))) {
      if (d) await Promise.all([bump(d, devKey, dev), bump(d, "all", all)]);
      await new Promise((r) => setTimeout(r, 600));
      const left = d ? PER_DEVICE - dev.count - 1 : null;
      const tail = left === 0 ? " Too many tries: wait 15 min." : left !== null && left <= 2 ? ` ${left} ${left === 1 ? "try" : "tries"} left.` : "";
      return page({ mode, status: 401, message: (mode === "code" ? "Wrong code." : "Wrong password.") + tail });
    }

    if (d) await d.prepare("DELETE FROM studio_attempts WHERE k = ?").bind(devKey).run();
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/studio/",
        "Set-Cookie": `${COOKIE}=${await makeToken(secret)}; Path=/studio; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (!(await tokenIsValid(secret, readCookie(request, COOKIE)))) return page({ mode });

  const response = await context.next();
  const out = new Response(response.body, response);
  out.headers.set("Cache-Control", "private, no-store");
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  return out;
}
