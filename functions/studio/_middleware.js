// Sculpt Studio (seasculptclub.com/studio) is for the owner only.
// Visitors see a password-only sign-in page; the password must match ADMIN_PASSWORD
// (the same one the bookings page uses). Signing in sets a cookie that lasts 30 days.

const COOKIE = "studio_auth";
const DAYS = 30;
const enc = new TextEncoder();

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sameText(a, b) {
  const [x, y] = await Promise.all([a, b].map(async (t) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(t)))));
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
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
  const all = request.headers.get("Cookie") || "";
  for (const part of all.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

function signInPage(message, status = 200) {
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
  input:focus{border-color:#c65e96}
  button{margin-top:12px;width:100%;padding:14px;border:0;border-radius:999px;background:#c65e96;color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer}
  button:hover{background:#a8457c}
  .err{margin:14px 0 0;color:#b42318;font-weight:700;font-size:14px}
</style></head>
<body><form class="card" method="POST" action="/studio/">
  <div class="bow">🎀</div><h1>Sculpt Studio</h1><p>Enter your password to continue</p>
  <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required aria-label="Password">
  <button type="submit">Open Sculpt Studio</button>
  ${message ? `<div class="err">${message}</div>` : ""}
</form></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const secret = (env && env.ADMIN_PASSWORD) || "";
  if (secret.length < 12) {
    return new Response("Sculpt Studio isn't set up yet: add ADMIN_PASSWORD (12+ characters) in your hosting settings.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Sign-in form submitted
  if (request.method === "POST") {
    let password = "";
    try {
      password = String((await request.formData()).get("password") || "");
    } catch {}
    if (!(await sameText(password, secret))) {
      await new Promise((r) => setTimeout(r, 600)); // slow down guessing
      return signInPage("Wrong password. Try again.", 401);
    }
    const token = await makeToken(secret);
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/studio/",
        "Set-Cookie": `${COOKIE}=${token}; Path=/studio; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (!(await tokenIsValid(secret, readCookie(request, COOKIE)))) return signInPage("");

  const response = await context.next();
  const out = new Response(response.body, response);
  out.headers.set("Cache-Control", "private, no-store");
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  return out;
}
