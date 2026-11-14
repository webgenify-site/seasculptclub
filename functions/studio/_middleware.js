// Sculpt Studio (seasculptclub.com/studio) is for the owner only.
// The browser asks for a password; it must match ADMIN_PASSWORD (the same one the bookings page uses).
// Any username works.

async function digest(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(buf);
}

async function sameText(a, b) {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function askForPassword(message) {
  return new Response(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Sculpt Studio", charset="UTF-8"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function onRequest(context) {
  const expected = (context.env && context.env.ADMIN_PASSWORD) || "";
  if (expected.length < 12) {
    return new Response("Sculpt Studio isn't set up yet: add ADMIN_PASSWORD (12+ characters) in your hosting settings.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const header = context.request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return askForPassword("Password required.");

  let password = "";
  try {
    const decoded = atob(header.slice(6));
    password = decoded.slice(decoded.indexOf(":") + 1);
  } catch {
    return askForPassword("Password required.");
  }

  if (!(await sameText(password, expected))) return askForPassword("Wrong password.");

  const response = await context.next();
  const out = new Response(response.body, response);
  out.headers.set("Cache-Control", "private, no-store");
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  return out;
}
