// Sea Sculpt Club eGift timer (a tiny Cloudflare Worker).
// Every hour it asks the website to email any eGift cards whose send date has arrived.
// Settings for this Worker:
//   Variable  CRON_SECRET  – the same value as CRON_SECRET on the website (Pages) project
//   Trigger   Cron "0 * * * *" (every hour)
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  // Visiting the Worker's address runs it once, so you can check it's set up.
  async fetch(request, env) {
    const r = await run(env);
    return new Response(JSON.stringify(r, null, 2), { headers: { "Content-Type": "application/json" } });
  }
};

async function run(env) {
  const site = (env.SITE_URL || "https://seasculptclub.com").replace(/\/+$/, "");
  const res = await fetch(site + "/api/send-gifts", { method: "POST", headers: { "x-cron-secret": env.CRON_SECRET || "" } });
  const text = await res.text();
  if (!res.ok) console.error("send-gifts returned", res.status, text);
  return { status: res.status, result: text.slice(0, 500) };
}
