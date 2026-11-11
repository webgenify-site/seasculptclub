// "A few quick questions" asked right after payment: how they heard about us, injuries, photo consent.
// POST { bookingId, heard, heardOther, injuries, photo } -> saves the answers on that booking.
// bookingId is the Stripe Checkout Session id (cs_...) or a code-only booking id (gift_SSC-...),
// which only the buyer's browser has. Answers can be saved once; the webhook may lag a few seconds,
// so the page retries on 404.
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, n);

export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch (e) { return json(400, { error: "Bad request" }); }
  const id = String(b.bookingId || "");
  if (!/^(cs_(live|test)_[A-Za-z0-9]{10,200}|gift_SSC-[A-F0-9]{8}|pp_[A-Z0-9]{10,40})$/.test(id)) return json(400, { error: "Unknown booking" });
  const db = env.DB;
  if (!db) return json(500, { error: "Database not connected" });
  const key = "bookings/" + id;
  const row = await db.prepare("SELECT value FROM records WHERE key = ?").bind(key).first();
  if (!row) return json(404, { error: "Booking not found yet" });
  const booking = JSON.parse(row.value);
  const intake = booking.intake || {};
  if (intake.answeredAt) return json(200, { ok: true, already: true });
  const heard = clean(b.heard, 60), photo = b.photo === "yes" || b.photo === "no" ? b.photo : "";
  const next = {
    ...booking,
    intake: {
      ...intake,
      heard: heard || intake.heard || "",
      heardOther: heard === "Other" ? clean(b.heardOther, 120) : intake.heardOther || "",
      injuries: clean(b.injuries, 600) || intake.injuries || "",
      photoConsent: photo || intake.photoConsent || "",
      answeredAt: new Date().toISOString()
    }
  };
  const r = await db.prepare("UPDATE records SET value = ?, updated_at = ? WHERE key = ? AND value = ?")
    .bind(JSON.stringify(next), new Date().toISOString(), key, row.value).run();
  if (!r || !r.meta || !r.meta.changes) return json(409, { error: "Please try again" });
  return json(200, { ok: true });
}
