var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../cf/src/lib/webcrypto.js
var require_webcrypto = __commonJS({
  "../cf/src/lib/webcrypto.js"(exports, module) {
    var enc = new TextEncoder();
    var subtle = () => globalThis.crypto.subtle;
    function randomBytes(n) {
      const b = new Uint8Array(n);
      globalThis.crypto.getRandomValues(b);
      return b;
    }
    var toHex = (bytes) => Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
    var randomHex = (n) => toHex(randomBytes(n));
    async function sha256(str) {
      return new Uint8Array(await subtle().digest("SHA-256", enc.encode(String(str))));
    }
    async function hmacSha256(secret, message) {
      const key = await subtle().importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return new Uint8Array(await subtle().sign("HMAC", key, enc.encode(message)));
    }
    function fromHex(hex) {
      if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) return null;
      const out = new Uint8Array(hex.length / 2);
      for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
      return out;
    }
    function timingSafeEqual(a, b) {
      if (!a || !b || a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
      return diff === 0;
    }
    module.exports = { randomBytes, randomHex, toHex, fromHex, sha256, hmacSha256, timingSafeEqual };
  }
});

// ../cf/src/lib/catalog.js
var require_catalog = __commonJS({
  "../cf/src/lib/catalog.js"(exports, module) {
    var CATALOG = {
      // ---- Dated classes / events ----
      "pumpkins-oct18": {
        kind: "class",
        priceId: "price_1UNj9B1UP4OSvubVuvnfC50h",
        // Stripe product: Pumpkins and Pilates ($25)
        className: "Pumpkins & Pilates",
        date: "2026-10-18",
        dateLabel: "Sunday, October 18, 2026",
        time: "10:00 AM",
        location: "Annie's Orchard, Cream Ridge, NJ",
        amount: 2500,
        maxQty: 10
      },
      "wave-oct16": {
        kind: "class",
        priceId: "price_1U981k1UP4OSvubVnoRtLkX9",
        // Stripe product: Wave Sculpt ($35), same as buy.stripe.com/28E8wIaF94G7571gic0co0b
        className: "Wave Sculpt",
        date: "2026-10-16",
        dateLabel: "Friday, October 16, 2026",
        time: "8:00 AM",
        location: "Indoors at Wave Resort, Long Branch, NJ",
        amount: 3500,
        maxQty: 10
      },
      "wave-oct23": {
        kind: "class",
        priceId: "price_1U981k1UP4OSvubVnoRtLkX9",
        className: "Wave Sculpt",
        date: "2026-10-23",
        dateLabel: "Friday, October 23, 2026",
        time: "8:00 AM",
        location: "Indoors at Wave Resort, Long Branch, NJ",
        amount: 3500,
        maxQty: 10
      },
      "spooky-oct30": {
        kind: "class",
        priceId: "price_1UOUT61UP4OSvubV7ujQKrd5",
        // Stripe product: Spooky Sculpt ($35), same as buy.stripe.com/9B6eV6eVp2xZarl4zu0co0a
        className: "Spooky Sculpt",
        date: "2026-10-30",
        dateLabel: "Friday, October 30, 2026",
        time: "6:00 PM",
        location: "Monmouth Flow, Shrewsbury, NJ",
        amount: 3500,
        maxQty: 10
      },
      "seaview-nov4": {
        kind: "class",
        priceId: "price_1ULtsA1UP4OSvubVgRljGfr6",
        // Stripe product: Mcloone's Class ($35)
        className: "Seaview Sculpt at McLoone's Pier House",
        date: "2026-11-04",
        dateLabel: "Wednesday, November 4, 2026",
        time: "10:00 AM",
        location: "McLoone's Pier House, 1 Ocean Blvd, Long Branch, NJ",
        amount: 3500,
        maxQty: 10
      },
      "wave-nov14": {
        kind: "class",
        priceId: "price_1U981k1UP4OSvubVnoRtLkX9",
        // Stripe product: Wave Sculpt ($35), same as buy.stripe.com/28E8wIaF94G7571gic0co0b
        className: "Wave Sculpt: Ocean View Pilates",
        date: "2026-11-14",
        dateLabel: "Saturday, November 14, 2026",
        time: "10:00 AM",
        location: "High Crest, indoors at Wave Resort, Long Branch, NJ",
        amount: 3500,
        maxQty: 10
      },
      "friendsgiving-nov21": {
        kind: "class",
        priceId: "price_1UVBrH1UP4OSvubVkW6s7LNp",
        // Stripe product: Wave Friendsgiving ($35), same as buy.stripe.com/5kQeV64gL4G7arlea40co0f
        className: "Friendsgiving Pilates & Brunch",
        date: "2026-11-21",
        dateLabel: "Saturday, November 21, 2026",
        time: "10:00 AM",
        location: "High Crest, indoors at Wave Resort, Long Branch, NJ",
        amount: 3500,
        maxQty: 10
      },
      "seaview-nov18": {
        kind: "class",
        priceId: "price_1ULtsA1UP4OSvubVgRljGfr6",
        // same Stripe price as Nov 4; the date is saved with the booking
        className: "Seaview Sculpt at McLoone's Pier House",
        date: "2026-11-18",
        dateLabel: "Wednesday, November 18, 2026",
        time: "10:00 AM",
        location: "McLoone's Pier House, 1 Ocean Blvd, Long Branch, NJ",
        amount: 3500,
        maxQty: 10
      },
      // ---- Packs and offers (class credits, scheduled later) ----
      "pack-3": {
        kind: "pack",
        priceId: "price_1UOH6o1UP4OSvubV1M6Khi0W",
        // Stripe product: 3-Class Pack ($90)
        className: "3-Class Pack",
        amount: 9e3,
        maxQty: 10
      },
      "pack-4": {
        kind: "pack",
        priceId: "price_1UOH7O1UP4OSvubVllgPl1Qm",
        // Stripe product: 4-Class Pack ($110)
        className: "4-Class Pack",
        amount: 11e3,
        maxQty: 10
      },
      "intro-bogo": {
        kind: "pack",
        priceId: "price_1UOH601UP4OSvubVlqqV7G8V",
        // Stripe product: BOGO 50% OFF ($50)
        className: "BOGO 50% OFF (new members, 2 classes)",
        amount: 5e3,
        maxQty: 1,
        // The buyer gets a class code: 2 credits, 1 spot per booking, only for the buyer's own email,
        // and the extra (free) class expires 21 days after purchase.
        credits: 2,
        codeRules: { ownerOnly: true, maxPerBooking: 1, expiring: { n: 1, days: 21 } }
      },
      "single": {
        kind: "pack",
        priceId: "price_1UOHFB1UP4OSvubVhYtCQBHf",
        // Stripe product: 1 Drop in ($35)
        className: "Single Class (drop-in credit)",
        amount: 3500,
        maxQty: 10
      },
      // ---- eGift cards (class credits for someone else, sent after checkout) ----
      "gift-1": {
        kind: "gift",
        priceId: "price_1UTJmp1UP4OSvubVcOSN4Nig",
        // Stripe product: eGift Card · 1 Class ($35)
        className: "eGift Card \xB7 1 Class",
        amount: 3500,
        credits: 1,
        // redeemable for 1 class spot (any dated class, any price)
        maxQty: 10
      },
      "gift-2": {
        kind: "gift",
        priceId: "price_1UTJnM1UP4OSvubV2PYXFUgY",
        // Stripe product: eGift Card · 2 Classes ($50)
        className: "eGift Card \xB7 2 Classes",
        amount: 5e3,
        credits: 2,
        // redeemable for 2 class spots (any dated class, any price)
        maxQty: 10
      }
    };
    function priceIdFor(id, mode, env) {
      const item = CATALOG[id];
      if (!item) return null;
      if (mode === "test") {
        try {
          const map = JSON.parse(env && env.STRIPE_TEST_PRICE_IDS || "{}");
          return map[id] || null;
        } catch (e) {
          return null;
        }
      }
      return item.priceId;
    }
    function describe(item, spots) {
      const s = spots + (spots === 1 ? " spot" : " spots");
      if (item.kind === "class") return `${item.className} \xB7 ${item.dateLabel} \xB7 ${item.time} \xB7 ${item.location} \xB7 ${s}`;
      return `${item.className} \xD7 ${spots}`;
    }
    module.exports = { CATALOG, priceIdFor, describe };
  }
});

// ../cf/src/lib/store.js
var require_store = __commonJS({
  "../cf/src/lib/store.js"(exports, module) {
    var ready = null;
    function binding(event) {
      const db = event && event.db || globalThis.__SSC_DB;
      if (!db) throw new Error("Database not connected: add a D1 binding named DB in Cloudflare (Settings \u2192 Bindings).");
      return db;
    }
    function store(event) {
      const db = binding(event);
      const init = () => {
        if (!ready || ready.db !== db) {
          const p = db.prepare("CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
          ready = { db, p: Promise.resolve(p).catch((e) => {
            ready = null;
            throw e;
          }) };
        }
        return ready.p;
      };
      const now = () => (/* @__PURE__ */ new Date()).toISOString();
      return {
        async get(key) {
          await init();
          const row = await db.prepare("SELECT value FROM records WHERE key = ?").bind(key).first();
          return row ? JSON.parse(row.value) : null;
        },
        // onlyIfNew: atomic create; returns { modified: false } if the key already exists.
        async setJSON(key, value, opts) {
          await init();
          const v = JSON.stringify(value);
          if (opts && opts.onlyIfNew) {
            const r = await db.prepare("INSERT INTO records (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING").bind(key, v, now()).run();
            return { modified: !!(r && r.meta && r.meta.changes) };
          }
          await db.prepare("INSERT INTO records (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(key, v, now()).run();
          return { modified: true };
        },
        // Safe read-modify-write: mutate(current) returns the new value (or throws to cancel).
        // Retries if someone else changed the record in between, so two checkouts can't spend the same credit.
        async update(key, mutate, tries = 6) {
          await init();
          for (let i = 0; i < tries; i++) {
            const row = await db.prepare("SELECT value FROM records WHERE key = ?").bind(key).first();
            if (!row) throw Object.assign(new Error("not_found"), { code: "not_found" });
            const next = await mutate(JSON.parse(row.value));
            const r = await db.prepare("UPDATE records SET value = ?, updated_at = ? WHERE key = ? AND value = ?").bind(JSON.stringify(next), now(), key, row.value).run();
            if (r && r.meta && r.meta.changes) return next;
          }
          throw Object.assign(new Error("busy"), { code: "busy" });
        },
        async delete(key) {
          await init();
          await db.prepare("DELETE FROM records WHERE key = ?").bind(key).run();
        },
        async list({ prefix = "" } = {}) {
          await init();
          const r = await db.prepare("SELECT key FROM records WHERE substr(key, 1, ?) = ? ORDER BY key").bind(prefix.length, prefix).all();
          return { blobs: (r.results || []).map((x) => ({ key: x.key })) };
        }
      };
    }
    module.exports = { store };
  }
});

// ../cf/src/lib/giftcodes.js
var require_giftcodes = __commonJS({
  "../cf/src/lib/giftcodes.js"(exports, module) {
    var { CATALOG } = require_catalog();
    var CODE_RE = /^SSC-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
    function normalizeCode(input) {
      let s = String(input || "").toUpperCase().replace(/[\s_]+/g, "").replace(/[–—]/g, "-");
      const bare = s.replace(/-/g, "");
      if (/^SSC[A-Z0-9]{8}$/.test(bare)) s = `SSC-${bare.slice(3, 7)}-${bare.slice(7)}`;
      return CODE_RE.test(s) ? s : null;
    }
    var keyOf = (code) => `giftcodes/${code}`;
    function used(rec) {
      return (rec.uses || []).reduce((n, u) => n + (u.n || 0), 0);
    }
    function held(rec, now, exceptSession) {
      const t = (now || /* @__PURE__ */ new Date()).toISOString();
      return Object.entries(rec.holds || {}).reduce((n, [sid, h]) => n + (sid !== exceptSession && h.until > t ? h.n || 0 : 0), 0);
    }
    function expiredLost(rec, now) {
      const e = rec.expiring;
      if (!e || !e.n || !e.expiresAt) return 0;
      if ((now || /* @__PURE__ */ new Date()).toISOString() <= e.expiresAt) return 0;
      const usedBefore = (rec.uses || []).filter((u) => u.at <= e.expiresAt).reduce((n, u) => n + (u.n || 0), 0);
      return Math.max(0, e.n - usedBefore);
    }
    function available(rec, now, exceptSession) {
      return Math.max(0, (rec.credits || 0) - used(rec) - held(rec, now, exceptSession) - expiredLost(rec, now));
    }
    function usableNow(rec, now, exceptSession) {
      const a = available(rec, now, exceptSession);
      return rec.maxPerBooking ? Math.min(a, rec.maxPerBooking) : a;
    }
    function expiringLeft(rec, now) {
      const e = rec.expiring;
      if (!e || !e.n || !e.expiresAt || (now || /* @__PURE__ */ new Date()).toISOString() > e.expiresAt) return null;
      const n = Math.max(0, e.n - used(rec));
      return n ? { n, expiresAt: e.expiresAt } : null;
    }
    async function createCodesForBooking(db, booking) {
      for (const it of booking.items || []) {
        const cat = CATALOG[it.catalogId];
        if (it.kind === "pack" && it.packCode && cat && cat.credits) {
          const rules = cat.codeRules || {};
          const start = Date.parse(booking.paidAt || booking.createdAt) || Date.now();
          await db.setJSON(keyOf(it.packCode), {
            code: it.packCode,
            kind: "pack",
            credits: cat.credits * (it.spots || 1),
            uses: [],
            holds: {},
            maxPerBooking: rules.maxPerBooking || null,
            ownerEmail: rules.ownerOnly ? String(booking.purchaser && booking.purchaser.email || "").toLowerCase() : null,
            expiring: rules.expiring ? { n: rules.expiring.n, expiresAt: new Date(start + rules.expiring.days * 864e5).toISOString() } : null,
            toName: booking.purchaser && booking.purchaser.name || "",
            toEmail: booking.purchaser && booking.purchaser.email || "",
            fromName: "",
            fromEmail: "",
            purchaseRef: booking.ref || null,
            purchaseBookingId: booking.id,
            giftName: it.className,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { onlyIfNew: true });
        }
        if (it.kind !== "gift" || !Array.isArray(it.gifts)) continue;
        const credits = CATALOG[it.catalogId] && CATALOG[it.catalogId].credits || 0;
        for (const g of it.gifts) {
          if (!g.code) continue;
          await db.setJSON(keyOf(g.code), {
            code: g.code,
            credits,
            uses: [],
            holds: {},
            toName: g.toName || "",
            toEmail: g.toEmail || "",
            fromName: booking.purchaser && booking.purchaser.name || "",
            fromEmail: booking.purchaser && booking.purchaser.email || "",
            purchaseRef: booking.ref || null,
            purchaseBookingId: booking.id,
            giftName: it.className,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { onlyIfNew: true });
        }
      }
    }
    async function lookup(db, code, email) {
      const c = normalizeCode(code);
      if (!c) return { error: "That doesn't look like a Sea Sculpt Club code. It looks like SSC-XXXX-XXXX." };
      const rec = await db.get(keyOf(c));
      if (!rec) return { error: "We couldn't find that code. Please check it and try again." };
      const who = String(email || "").trim().toLowerCase();
      if (rec.ownerEmail && who && who !== rec.ownerEmail) {
        return { error: "This class code is for the person who bought it. Please enter the email you bought it with.", code: c };
      }
      return { code: c, rec, available: available(rec), usable: usableNow(rec) };
    }
    function planCoverage(lines, credits) {
      const spots = [];
      for (const l of lines) {
        const item = CATALOG[l.id];
        if (!item || item.kind !== "class") continue;
        for (let i = 0; i < l.qty; i++) spots.push({ id: l.id, amount: item.amount });
      }
      spots.sort((a, b) => b.amount - a.amount);
      const n = Math.min(credits, spots.length);
      const cover = {};
      let value = 0;
      for (const s of spots.slice(0, n)) {
        cover[s.id] = (cover[s.id] || 0) + 1;
        value += s.amount;
      }
      return { n, cover, value, classSpots: spots.length };
    }
    async function spend(db, code, n, bookingId, ref) {
      return db.update(keyOf(code), (rec) => {
        if (usableNow(rec) < n) throw Object.assign(new Error("not_enough"), { code: "not_enough" });
        rec.uses = [...rec.uses || [], { n, bookingId, ref, at: (/* @__PURE__ */ new Date()).toISOString() }];
        return rec;
      });
    }
    async function hold(db, code, n, sessionId, until) {
      return db.update(keyOf(code), (rec) => {
        if (usableNow(rec, null, sessionId) < n) throw Object.assign(new Error("not_enough"), { code: "not_enough" });
        rec.holds = { ...rec.holds || {}, [sessionId]: { n, until } };
        return rec;
      });
    }
    async function confirmHold(db, code, sessionId, n, ref) {
      return db.update(keyOf(code), (rec) => {
        const h = (rec.holds || {})[sessionId];
        if ((rec.uses || []).some((u) => u.bookingId === sessionId)) return rec;
        const holds = { ...rec.holds || {} };
        delete holds[sessionId];
        rec.holds = holds;
        rec.uses = [...rec.uses || [], { n: h && h.n || n, bookingId: sessionId, ref: ref || null, at: (/* @__PURE__ */ new Date()).toISOString() }];
        return rec;
      });
    }
    async function releaseHold(db, code, sessionId) {
      return db.update(keyOf(code), (rec) => {
        if (!(rec.holds || {})[sessionId]) return rec;
        const holds = { ...rec.holds };
        delete holds[sessionId];
        rec.holds = holds;
        return rec;
      });
    }
    function emptyReason(rec) {
      if (rec.expiring && expiredLost(rec) && rec.credits - used(rec) - expiredLost(rec) <= 0) {
        return "The extra class on this code expired on " + new Date(rec.expiring.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" }) + ".";
      }
      return rec.kind === "pack" ? "This class code has already been fully used." : "This eGift code has already been fully used.";
    }
    module.exports = { emptyReason, normalizeCode, keyOf, available, usableNow, expiringLeft, expiredLost, used, createCodesForBooking, lookup, planCoverage, spend, hold, confirmHold, releaseHold };
  }
});

// ../cf/src/lib/email.js
var require_email = __commonJS({
  "../cf/src/lib/email.js"(exports, module) {
    var { CATALOG } = require_catalog();
    var esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    var money = (c) => "$" + (c / 100).toFixed(c % 100 ? 2 : 0);
    function niceDate(ymd) {
      const d = /* @__PURE__ */ new Date(ymd + "T12:00:00Z");
      return isNaN(d) ? ymd : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    }
    function buildConfirmation(booking) {
      const first = (booking.purchaser.name || "").split(" ")[0] || "there";
      const lines = booking.items.map((it) => {
        if (it.kind === "class") {
          const gc = it.giftCovered ? ` (${it.giftCovered} covered by your ${booking.giftRedemption && booking.giftRedemption.kind === "pack" ? "class code" : "eGift"})` : "";
          return {
            text: `${it.className}
  ${it.dateLabel} at ${it.time}
  ${it.location}
  ${it.spots} ${it.spots === 1 ? "spot" : "spots"}` + (it.attendees && it.attendees.length ? `: ${it.attendees.join(", ")}` : "") + gc,
            html: `<p style="margin:0 0 14px"><strong>${esc(it.className)}</strong><br>${esc(it.dateLabel)} at ${esc(it.time)}<br>${esc(it.location)}<br>${it.spots} ${it.spots === 1 ? "spot" : "spots"}${it.attendees && it.attendees.length ? ": " + esc(it.attendees.join(", ")) : ""}${esc(gc)}</p>`
          };
        }
        if (it.kind === "gift") {
          const gl = (it.gifts || []).map((g) => ({
            t: `  For ${g.toName} (${g.toEmail}): ${g.sendOn === "now" ? "emailed right away" : "emailed on " + niceDate(g.sendOn)}`,
            h: `For ${esc(g.toName)} (${esc(g.toEmail)}): ${g.sendOn === "now" ? "emailed right away" : "emailed on " + esc(niceDate(g.sendOn))}`
          }));
          return {
            text: `${it.className} \xD7 ${it.spots}
` + gl.map((x) => x.t).join("\n") + `
  You'll get a copy of each eGift when it's sent.`,
            html: `<p style="margin:0 0 14px"><strong>${esc(it.className)}</strong> \xD7 ${it.spots}<br>` + gl.map((x) => x.h).join("<br>") + `<br>You'll get a copy of each eGift when it's sent.</p>`
          };
        }
        if (it.packCode) {
          const cat = CATALOG[it.catalogId] || {}, rules = cat.codeRules || {};
          const start = Date.parse(booking.paidAt || booking.createdAt) || Date.now();
          const exp = rules.expiring ? new Date(start + rules.expiring.days * 864e5).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" }) : null;
          const n = (cat.credits || 0) * (it.spots || 1);
          const how = `Your class code: ${it.packCode}
  To book, add any class to your cart at seasculptclub.com/classes and enter your code at checkout` + (rules.ownerOnly ? " (use this email)" : "") + `. It covers ${n} class ${n === 1 ? "spot" : "spots"}` + (rules.maxPerBooking === 1 ? ", one per booking" : "") + "." + (exp ? `
  Your extra class must be booked by ${exp}.` : "");
          return {
            text: `${it.className}
  ${how}`,
            html: `<p style="margin:0 0 14px"><strong>${esc(it.className)}</strong><br>Your class code: <strong style="letter-spacing:.08em">${esc(it.packCode)}</strong><br>To book, add any class to your cart at <a href="https://seasculptclub.com/classes" style="color:#3D6789">seasculptclub.com/classes</a> and enter your code at checkout` + (rules.ownerOnly ? " (use this email)" : "") + `. It covers ${n} class ${n === 1 ? "spot" : "spots"}${rules.maxPerBooking === 1 ? ", one per booking" : ""}.` + (exp ? `<br>Your extra class must be booked by ${esc(exp)}.` : "") + `</p>`
          };
        }
        return {
          text: `${it.className} \xD7 ${it.spots}
  We'll reach out to schedule your classes.`,
          html: `<p style="margin:0 0 14px"><strong>${esc(it.className)}</strong> \xD7 ${it.spots}<br>We'll reach out to schedule your classes.</p>`
        };
      });
      const allGifts = booking.items.length && booking.items.every((it) => it.kind === "gift");
      const subject = booking.items.length === 1 && booking.items[0].kind === "class" ? `You're booked: ${booking.items[0].className}, ${booking.items[0].dateLabel}` : allGifts ? "Your Sea Sculpt Club eGift order" : "You're booked with Sea Sculpt Club";
      const text = `Hi ${first},

Thank you for booking with Sea Sculpt Club! Here are your details:

` + lines.map((l) => l.text).join("\n\n") + (booking.giftRedemption ? `

${booking.giftRedemption.kind === "pack" ? "Class code" : "eGift"} ${booking.giftRedemption.code}: ${booking.giftRedemption.credits} class ${booking.giftRedemption.credits === 1 ? "credit" : "credits"} used` : "") + `

Total paid: ${money(booking.amountTotal)}
Booking reference: ${booking.ref}` + (booking.intake && booking.intake.waiver ? `

You agreed to our Liability Waiver & Release (seasculptclub.com/waiver) for everyone in this booking.` : "") + `

Please bring your own mat. Questions? Just reply to this email.

See you on the mat,
Sea Sculpt Club`;
      const html = `<div style="font-family:Georgia,serif;color:#12314F;max-width:520px"><p>Hi ${esc(first)},</p><p>Thank you for booking with Sea Sculpt Club! Here are your details:</p>` + lines.map((l) => l.html).join("") + (booking.giftRedemption ? `<p>${booking.giftRedemption.kind === "pack" ? "Class code" : "eGift"} ${esc(booking.giftRedemption.code)}: ${booking.giftRedemption.credits} class ${booking.giftRedemption.credits === 1 ? "credit" : "credits"} used</p>` : "") + `<p>Total paid: <strong>${money(booking.amountTotal)}</strong><br>Booking reference: ${esc(booking.ref)}</p>` + (booking.intake && booking.intake.waiver ? `<p style="font-size:13px;color:#4A6683">You agreed to our <a href="https://seasculptclub.com/waiver" style="color:#3D6789">Liability Waiver &amp; Release</a> for everyone in this booking.</p>` : "") + `<p>Please bring your own mat. Questions? Just reply to this email.</p><p>See you on the mat,<br>Sea Sculpt Club</p></div>`;
      return { subject, text, html };
    }
    async function sendConfirmation(booking, env) {
      if (!env.RESEND_API_KEY) return { status: "not_sent", reason: "Email service not configured (Stripe receipt only)" };
      const msg = buildConfirmation(booking);
      const payload = {
        from: env.BOOKING_EMAIL_FROM || "Sea Sculpt Club <bookings@seasculptclub.com>",
        to: [booking.purchaser.email],
        reply_to: "seasculptclub@gmail.com",
        subject: msg.subject,
        text: msg.text,
        html: msg.html
      };
      if (env.BOOKING_EMAIL_BCC) payload.bcc = [env.BOOKING_EMAIL_BCC];
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `booking-${booking.sessionId}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { status: "failed", reason: data && (data.message || data.name) || `HTTP ${res.status}` };
        return { status: "sent", id: data.id || null, at: (/* @__PURE__ */ new Date()).toISOString() };
      } catch (err) {
        return { status: "failed", reason: String(err && err.message || err) };
      }
    }
    function buildGiftEmail(booking, item, gift) {
      const from = booking.purchaser.name || "Someone special";
      const firstTo = (gift.toName || "").split(" ")[0] || "there";
      const what = item.className.replace(/^eGift Card · /, "");
      const credits = CATALOG[item.catalogId] && CATALOG[item.catalogId].credits || 1;
      const spotsText = credits === 1 ? "1 class spot" : `${credits} class spots`;
      const subject = `${from} sent you a Sea Sculpt Club eGift`;
      const msgT = gift.message ? `

"${gift.message}"
\u2014 ${from}` : "";
      const msgH = gift.message ? `<p style="margin:18px 0;padding:14px 18px;background:#FFF9BE;border-radius:4px;font-style:italic">&ldquo;${esc(gift.message)}&rdquo;<br><span style="font-style:normal">&mdash; ${esc(from)}</span></p>` : "";
      const text = `Hi ${firstTo},

${from} sent you a Sea Sculpt Club eGift card for ${what}!${msgT}

Your gift code: ${gift.code}

How to use it: pick a class at https://seasculptclub.com/classes, add it to your cart, and enter your code at checkout. It covers ${spotsText} in any class, and anything it doesn't use stays on the code for next time.

Questions? Just reply to this email.

See you on the mat,
Sea Sculpt Club`;
      const html = `<div style="font-family:Georgia,serif;color:#12314F;max-width:520px"><div style="background:#B7D7F2;border-radius:10px;padding:28px 24px;text-align:center"><div style="font:12px/1 Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase">Sea Sculpt Club eGift</div><div style="font-size:30px;margin:12px 0 6px">${esc(what)}</div><div style="font:14px/1.4 Arial,sans-serif">Gift code: <strong style="letter-spacing:.08em">${esc(gift.code)}</strong></div></div><p style="margin-top:22px">Hi ${esc(firstTo)},</p><p>${esc(from)} sent you a Sea Sculpt Club eGift card for ${esc(what)}!</p>` + msgH + `<p><strong>How to use it:</strong> pick a class, add it to your cart, and enter your code at checkout. It covers ${esc(spotsText)} in any class, and anything it doesn&rsquo;t use stays on the code for next time.</p><p><a href="https://seasculptclub.com/classes" style="color:#3D6789">Choose your class &rarr;</a></p><p>Questions? Just reply to this email.</p><p>See you on the mat,<br>Sea Sculpt Club</p></div>`;
      return { subject, text, html };
    }
    async function sendGiftEmail(booking, item, gift, idemKey, env) {
      if (!env.RESEND_API_KEY) return { status: "not_sent", reason: "Email service not configured: send this eGift by hand." };
      const msg = buildGiftEmail(booking, item, gift);
      const payload = {
        from: env.BOOKING_EMAIL_FROM || "Sea Sculpt Club <bookings@seasculptclub.com>",
        to: [gift.toEmail],
        cc: booking.purchaser.email ? [booking.purchaser.email] : void 0,
        reply_to: "seasculptclub@gmail.com",
        subject: msg.subject,
        text: msg.text,
        html: msg.html
      };
      if (env.BOOKING_EMAIL_BCC) payload.bcc = [env.BOOKING_EMAIL_BCC];
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `gift-${idemKey}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { status: "failed", reason: data && (data.message || data.name) || `HTTP ${res.status}` };
        return { status: "sent", id: data.id || null, at: (/* @__PURE__ */ new Date()).toISOString() };
      } catch (err) {
        return { status: "failed", reason: String(err && err.message || err) };
      }
    }
    module.exports = { sendConfirmation, buildConfirmation, buildGiftEmail, sendGiftEmail };
  }
});

// ../cf/src/functions/create-checkout.js
var require_create_checkout = __commonJS({
  "../cf/src/functions/create-checkout.js"(exports) {
    var { randomHex } = require_webcrypto();
    var { CATALOG, priceIdFor, describe } = require_catalog();
    var { store } = require_store();
    var { lookup, planCoverage, spend, hold, emptyReason } = require_giftcodes();
    var { sendConfirmation } = require_email();
    var WAIVER_VERSION = "2026-10-27";
    var STRIPE_VERSION = "2026-03-25.dahlia; custom_checkout_payment_form_preview=v1";
    var INTEGRATION_ID = "538e8f4c-e01b-496b-96d2-98c3c2f2bee8";
    function json(statusCode, body) {
      return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
    }
    function keyMode(key, kind) {
      if (!key) return "missing";
      const prefixes = kind === "secret" ? ["sk", "rk"] : ["pk"];
      for (const p of prefixes) {
        if (key.startsWith(p + "_test_")) return "test";
        if (key.startsWith(p + "_live_")) return "live";
      }
      return kind === "secret" ? "invalid - should start with sk_ or rk_ (live or test)" : "invalid - should start with pk_live_ or pk_test_";
    }
    var clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function todayNJ() {
      if (process.env.BOOKING_TODAY_OVERRIDE) return process.env.BOOKING_TODAY_OVERRIDE;
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date());
    }
    function validate(body) {
      const errors = [];
      const p = body.purchaser || {};
      const purchaser = { name: clean(p.name, 100), email: clean(p.email, 200).toLowerCase(), phone: clean(p.phone, 30) };
      if (purchaser.name.length < 2) errors.push("Please enter your full name.");
      if (!EMAIL_RE.test(purchaser.email)) errors.push("Please enter a valid email address.");
      if (purchaser.phone.replace(/\D/g, "").length < 10) errors.push("Please enter a phone number we can reach you at.");
      if (!Array.isArray(body.items) || !body.items.length) errors.push("Your cart is empty.");
      const lines = [];
      for (const raw of body.items || []) {
        const id = raw && raw.id;
        const item = CATALOG[id];
        if (!item) {
          errors.push("One of the items in your cart is no longer available. Please refresh the page.");
          continue;
        }
        const cap = item.maxQty || 10;
        const qty = parseInt(raw.qty, 10);
        if (!(qty >= 1 && qty <= cap)) {
          errors.push(`Please choose between 1 and ${cap} for ${item.className}.`);
          continue;
        }
        if (item.kind === "class" && item.date && item.date < todayNJ()) {
          errors.push(`${item.className} on ${item.dateLabel} has already happened. Please remove it from your cart.`);
          continue;
        }
        if (lines.some((l) => l.id === id)) {
          errors.push("Your cart has a duplicate item. Please refresh the page.");
          continue;
        }
        let attendees = [];
        if (item.kind === "class") {
          const given = body.attendees && Array.isArray(body.attendees[id]) ? body.attendees[id] : [];
          attendees = given.slice(0, qty).map((n) => clean(n, 80));
          while (attendees.length < qty) attendees.push("");
          if (attendees.some((n) => n.length < 2)) errors.push(`Please enter a name for each spot in ${item.className} (${item.dateLabel}).`);
        }
        let gifts = [];
        if (item.kind === "gift") {
          const given = body.gifts && Array.isArray(body.gifts[id]) ? body.gifts[id] : [];
          const today = todayNJ(), last = addDays(today, 366);
          for (let n = 0; n < qty; n++) {
            const g = given[n] || {};
            const gift = {
              toName: clean(g.toName, 80),
              toEmail: clean(g.toEmail, 200).toLowerCase(),
              message: clean(g.message, 300),
              sendOn: g.send === "date" ? clean(g.sendOn, 10) : "now"
            };
            const label = qty > 1 ? `${item.className} (gift ${n + 1})` : item.className;
            if (gift.toName.length < 2) errors.push(`Please enter who ${label} is for.`);
            else if (!EMAIL_RE.test(gift.toEmail)) errors.push(`Please enter a valid email for the person receiving ${label}.`);
            else if (gift.sendOn !== "now" && (!/^\d{4}-\d{2}-\d{2}$/.test(gift.sendOn) || gift.sendOn < today || gift.sendOn > last)) {
              errors.push(`Please choose a send date for ${label} between today and one year from now.`);
            }
            if (gift.sendOn === today) gift.sendOn = "now";
            gifts.push(gift);
          }
        }
        lines.push({ id, qty, attendees, gifts });
      }
      const q = body.intake || {};
      const hasClass = lines.some((l) => CATALOG[l.id] && CATALOG[l.id].kind === "class");
      const intake = {
        heard: clean(q.heard, 60),
        heardOther: clean(q.heardOther, 120),
        injuries: String(q.injuries == null ? "" : q.injuries).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, 600),
        photoConsent: q.photo === "yes" || q.photo === "no" ? q.photo : "",
        waiver: null
      };
      if (!intake.heard) errors.push("Please tell us how you heard about us.");
      if (hasClass) {
        if (!intake.photoConsent) errors.push("Please choose Yes or No for photo and video consent.");
        if (q.waiver !== true) errors.push("Please agree to the Liability Waiver & Release to book a class.");
        else intake.waiver = { accepted: true, version: WAIVER_VERSION, at: (/* @__PURE__ */ new Date()).toISOString() };
      }
      return { errors, purchaser, lines, intake };
    }
    function addDays(ymd, days) {
      const d = /* @__PURE__ */ new Date(ymd + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    }
    function setupCheck() {
      const secret = (process.env.STRIPE_SECRET_KEY || "").trim();
      const mode = keyMode(secret, "secret");
      const report = {
        functionDeployed: true,
        stripeApiVersion: STRIPE_VERSION,
        secretKey: mode,
        publishableKey: keyMode((process.env.STRIPE_PUBLISHABLE_KEY || "").trim(), "publishable"),
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? "set" : "MISSING",
        adminPassword: (process.env.ADMIN_PASSWORD || "").length >= 12 ? "set" : "MISSING (12+ characters)",
        confirmationEmail: process.env.RESEND_API_KEY ? "set" : "not configured (Stripe receipt only)"
      };
      report.keysSameMode = report.secretKey === report.publishableKey && (mode === "test" || mode === "live");
      report.priceIds = {};
      for (const id of Object.keys(CATALOG)) report.priceIds[id] = priceIdFor(id, mode, process.env) ? "set" : "MISSING";
      report.ready = report.keysSameMode && report.webhookSecret === "set";
      return json(200, report);
    }
    exports.handler = async (event) => {
      if (event.httpMethod === "GET") return setupCheck();
      if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
      const secret = (process.env.STRIPE_SECRET_KEY || "").trim();
      const publishableKey = (process.env.STRIPE_PUBLISHABLE_KEY || "").trim();
      if (!secret || !publishableKey) return json(500, { error: "Checkout is not set up yet.", code: "keys_missing" });
      const mode = keyMode(secret, "secret");
      if (mode !== keyMode(publishableKey, "publishable")) return json(500, { error: "Checkout is not set up correctly.", code: "key_mode_mismatch" });
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch (e) {
        return json(400, { error: "Bad request" });
      }
      const hosted = body.mode === "hosted";
      const { errors, purchaser, lines, intake } = validate(body);
      if (intake.waiver) {
        const h = event.headers || {};
        intake.waiver.ip = String(h["cf-connecting-ip"] || h["x-forwarded-for"] || "").split(",")[0].trim() || null;
        intake.waiver.userAgent = clean(h["user-agent"], 200) || null;
      }
      if (errors.length) return json(400, { error: errors[0], errors, code: "invalid_details" });
      const ref = "SSC-" + randomHex(4).toUpperCase();
      let gift = null;
      let chargeLines = lines.map((l) => ({ ...l, chargeQty: l.qty }));
      if (body.giftCode) {
        const g = await lookup(store(event), body.giftCode, purchaser.email);
        if (g.error) return json(400, { error: g.error, code: "gift_invalid" });
        const plan = planCoverage(lines, g.usable);
        if (!plan.classSpots) return json(400, { error: "Codes cover class spots. Add a class to your cart to use yours.", code: "gift_invalid" });
        if (plan.n < 1) return json(400, { error: emptyReason(g.rec), code: "gift_invalid" });
        gift = { code: g.code, kind: g.rec.kind || "gift", credits: plan.n, value: plan.value, cover: plan.cover };
        chargeLines = lines.map((l) => ({ ...l, chargeQty: l.qty - (plan.cover[l.id] || 0) })).filter((l) => l.chargeQty > 0);
      }
      if (gift && !chargeLines.length) return freeBooking(event, { ref, mode, purchaser, lines, gift, intake });
      const byPrice = /* @__PURE__ */ new Map();
      const missing = [];
      for (const line of chargeLines) {
        const priceId = priceIdFor(line.id, mode, process.env);
        if (!priceId) {
          missing.push(CATALOG[line.id].className);
          continue;
        }
        if (!byPrice.has(priceId)) byPrice.set(priceId, []);
        byPrice.get(priceId).push(line);
      }
      if (missing.length) {
        return json(400, { error: `${missing.join(", ")} can't be booked online yet. Please email seasculptclub@gmail.com.`, code: "price_not_configured" });
      }
      const summary = lines.map((l) => describe(CATALOG[l.id], l.qty));
      if (gift) summary.push(`${gift.kind === "pack" ? "Class code" : "eGift"} ${gift.code} covers ${gift.credits} ${gift.credits === 1 ? "spot" : "spots"}`);
      const params = new URLSearchParams();
      params.append("ui_mode", hosted ? "hosted_page" : "form");
      params.append("mode", "payment");
      params.append("billing_address_collection", "auto");
      params.append("phone_number_collection[enabled]", "false");
      params.append("automatic_tax[enabled]", "false");
      params.append("submit_type", "auto");
      if (!hosted) params.append("integration_identifier", INTEGRATION_ID);
      params.append("customer_email", purchaser.email);
      params.append("client_reference_id", ref);
      let i = 0;
      for (const [priceId, group] of byPrice) {
        params.append(`line_items[${i}][price]`, priceId);
        params.append(`line_items[${i}][quantity]`, String(group.reduce((n, l) => n + l.chargeQty, 0)));
        params.append(`line_items[${i}][metadata][items]`, group.map((l) => `${l.id}:${l.chargeQty}`).join(","));
        i++;
      }
      params.append("metadata[booking_ref]", ref);
      params.append("metadata[purchaser_name]", purchaser.name);
      params.append("metadata[purchaser_email]", purchaser.email);
      params.append("metadata[purchaser_phone]", purchaser.phone);
      params.append("metadata[items]", lines.map((l) => `${l.id}:${l.qty}`).join(","));
      lines.forEach((l, n) => {
        if (l.attendees.length) params.append(`metadata[attendees_${n}]`, `${l.id}=${l.attendees.join(" | ")}`.slice(0, 500));
      });
      lines.forEach((l, n) => {
        if (l.gifts && l.gifts.length) params.append(`metadata[gifts_${n}]`, `${l.id}=${l.gifts.map((g) => `${g.toName}~${g.toEmail}~${g.sendOn}`).join(" | ")}`.slice(0, 500));
      });
      if (gift) {
        params.append("metadata[gift_code]", gift.code);
        params.append("metadata[gift_credits]", String(gift.credits));
        params.append("metadata[gift_kind]", gift.kind);
        params.append("metadata[gift_cover]", Object.entries(gift.cover).map(([id, q]) => `${id}:${q}`).join(","));
        params.append("expires_at", String(Math.floor(Date.now() / 1e3) + 31 * 60));
      }
      if (intake.heard) params.append("metadata[intake_heard]", (intake.heard + (intake.heardOther ? ": " + intake.heardOther : "")).slice(0, 200));
      if (intake.photoConsent) params.append("metadata[intake_photo]", intake.photoConsent);
      if (intake.injuries) params.append("metadata[intake_injuries]", intake.injuries.slice(0, 500));
      if (intake.waiver) params.append("metadata[intake_waiver]", `accepted v${intake.waiver.version} at ${intake.waiver.at}`);
      const description = `Sea Sculpt Club booking ${ref}: ${summary.join("; ")}`;
      params.append("custom_text[submit][message]", ("Booking: " + summary.join(" \u2022 ")).slice(0, 1200));
      params.append("payment_intent_data[description]", description.slice(0, 1e3));
      params.append("payment_intent_data[receipt_email]", purchaser.email);
      params.append("payment_intent_data[metadata][booking_ref]", ref);
      const site = (process.env.SITE_URL || "").replace(/\/+$/, "") || event.headers && (event.headers.origin || "https://" + event.headers.host) || "";
      const doneUrl = site + "/classes.html?checkout=complete&session_id={CHECKOUT_SESSION_ID}";
      if (hosted) {
        params.append("success_url", doneUrl);
        params.append("cancel_url", site + "/classes.html?checkout=cancel#events");
      } else {
        params.append("return_url", doneUrl);
      }
      let data, res;
      try {
        res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Stripe-Version": STRIPE_VERSION, "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString()
        });
        data = await res.json();
      } catch (err) {
        console.error("Stripe request failed", err);
        return json(502, { error: "Checkout couldn't start. Please try again in a moment.", code: "stripe_unreachable" });
      }
      if (!res.ok) {
        const msg = data && data.error && data.error.message || "";
        console.error("Stripe error:", data && data.error);
        const code = res.status === 403 || /permission/i.test(msg) ? "stripe_key_missing_permission" : /No such price/i.test(msg) ? "stripe_price_not_found" : "stripe_" + (data && data.error && (data.error.code || data.error.type) || "error");
        return json(502, { error: "Checkout couldn't start. Please try again in a moment.", code, detail: msg });
      }
      if (gift) {
        const until = new Date(Date.now() + 36 * 60 * 1e3).toISOString();
        try {
          await hold(store(event), gift.code, gift.credits, data.id, until);
        } catch (err) {
          await expireSession(secret, data.id);
          if (err.code === "not_enough") return json(409, { error: "This code was just used. Please check it and try again.", code: "gift_invalid" });
          console.error("Could not hold eGift credits:", err && err.message);
          return json(502, { error: "Checkout couldn't start. Please try again in a moment.", code: "gift_hold_failed" });
        }
      }
      try {
        await store(event).setJSON(`pending/${data.id}`, {
          ref,
          sessionId: data.id,
          livemode: mode === "live",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          purchaser,
          intake,
          lines: lines.map((l) => ({ ...l, ...pick(CATALOG[l.id]), giftCovered: gift ? gift.cover[l.id] || 0 : 0 })),
          giftRedemption: gift ? { code: gift.code, kind: gift.kind, credits: gift.credits, value: gift.value } : null,
          expectedAmount: chargeLines.reduce((n, l) => n + CATALOG[l.id].amount * l.chargeQty, 0)
        });
      } catch (err) {
        console.error("Could not save pending booking (metadata backup will be used):", err && err.message);
      }
      if (hosted) return json(200, { url: data.url, ref });
      return json(200, { clientSecret: data.client_secret, publishableKey, ref });
    };
    function pick(item) {
      const { kind, className, date, dateLabel, time, location, amount } = item;
      return { kind, className, date: date || null, dateLabel: dateLabel || null, time: time || null, location: location || null, unitAmount: amount };
    }
    async function expireSession(secret, id) {
      try {
        await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}/expire`, {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Stripe-Version": STRIPE_VERSION }
        });
      } catch (e) {
      }
    }
    async function freeBooking(event, { ref, mode, purchaser, lines, gift, intake }) {
      const db = store(event);
      const id = "gift_" + ref;
      try {
        await spend(db, gift.code, gift.credits, id, ref);
      } catch (err) {
        if (err.code === "not_enough") return json(409, { error: "This code was just used. Please check it and try again.", code: "gift_invalid" });
        console.error("Could not use eGift credits:", err && err.message);
        return json(502, { error: "Booking couldn't be completed. Please try again in a moment.", code: "gift_spend_failed" });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const booking = {
        id,
        ref,
        status: "paid",
        livemode: mode === "live",
        purchaser,
        intake,
        items: lines.map((l) => {
          const it = pick(CATALOG[l.id]);
          return {
            catalogId: l.id,
            kind: it.kind,
            className: it.className,
            date: it.date,
            dateLabel: it.dateLabel,
            time: it.time,
            location: it.location,
            spots: l.qty,
            attendees: l.attendees || [],
            unitAmount: it.unitAmount,
            giftCovered: gift.cover[l.id] || 0
          };
        }),
        amountTotal: 0,
        currency: "usd",
        paymentIntent: null,
        sessionId: null,
        stripeEventId: null,
        source: "egift",
        flags: [],
        giftRedemption: { code: gift.code, kind: gift.kind, credits: gift.credits, value: gift.value },
        createdAt: now,
        paidAt: now,
        confirmation: { status: "pending" }
      };
      await db.setJSON(`bookings/${id}`, booking, { onlyIfNew: true });
      booking.confirmation = await sendConfirmation(booking, process.env);
      await db.setJSON(`bookings/${id}`, booking);
      return json(200, { free: true, ref });
    }
  }
});

// ../cf/src/lib/stripe-signature.js
var require_stripe_signature = __commonJS({
  "../cf/src/lib/stripe-signature.js"(exports, module) {
    var { hmacSha256, fromHex, timingSafeEqual } = require_webcrypto();
    async function verifyStripeSignature(rawBody, header, secret, toleranceSeconds = 300, now = Math.floor(Date.now() / 1e3)) {
      if (!secret) return { ok: false, reason: "webhook secret not configured" };
      if (!header) return { ok: false, reason: "missing Stripe-Signature header" };
      let timestamp = null;
      const signatures = [];
      for (const part of String(header).split(",")) {
        const i = part.indexOf("=");
        if (i < 0) continue;
        const k = part.slice(0, i).trim();
        const v = part.slice(i + 1).trim();
        if (k === "t") timestamp = parseInt(v, 10);
        if (k === "v1") signatures.push(v);
      }
      if (!timestamp || !signatures.length) return { ok: false, reason: "malformed Stripe-Signature header" };
      if (Math.abs(now - timestamp) > toleranceSeconds) return { ok: false, reason: "timestamp outside tolerance" };
      const expected = await hmacSha256(secret, `${timestamp}.${rawBody}`);
      const match = signatures.some((sig) => timingSafeEqual(fromHex(sig), expected));
      return match ? { ok: true } : { ok: false, reason: "signature mismatch" };
    }
    module.exports = { verifyStripeSignature };
  }
});

// ../cf/src/lib/recovery.js
var require_recovery = __commonJS({
  "../cf/src/lib/recovery.js"(exports, module) {
    var { CATALOG } = require_catalog();
    var WAVE_FALL_AT = Date.parse("2026-10-01T00:00:00Z");
    var WAVE_NOV_AT = Date.parse("2026-10-24T04:00:00Z");
    var RESCHEDULED_AT = Date.parse("2026-09-26T20:00:00Z");
    var PRICE_RULES = {
      "price_1UNj9B1UP4OSvubVuvnfC50h": () => ({ catalogId: "pumpkins-oct18" }),
      "price_1ULtsA1UP4OSvubVgRljGfr6": () => ({
        className: "Seaview Sculpt at McLoone's Pier House",
        date: null,
        dateLabel: "Nov 4 or Nov 18 (not recorded)",
        time: "10:00 AM",
        location: "McLoone's Pier House, 1 Ocean Blvd, Long Branch, NJ",
        flag: "Date not recorded: paid through a Payment Link that doesn't ask for Nov 4 vs Nov 18. Confirm with the customer."
      }),
      "price_1U8sHQ1UP4OSvubVQcIG5TRv": (created) => ({
        className: "Belmar Sunset Sculpt",
        date: "2026-10-02",
        dateLabel: "Friday, October 2, 2026",
        time: "6:00 PM",
        location: "Belmar Beach, NJ",
        flag: created < RESCHEDULED_AT ? "Bought when this class was set for Sept 25; it was moved to Oct 2." : null
      }),
      "price_1U8sw81UP4OSvubVEe80VqnC": (created) => ({
        className: "Belmar Beach Sculpt",
        date: "2026-10-03",
        dateLabel: "Saturday, October 3, 2026",
        time: "10:00 AM",
        location: "Belmar Beach, NJ",
        flag: created < RESCHEDULED_AT ? "Bought when this class was set for Sept 26 at 9 AM; it was moved to Oct 3 at 10 AM." : null
      }),
      "price_1UBi8l1UP4OSvubVee9J1fqo": () => ({
        className: "Sea Bright Beach Sculpt",
        date: "2026-09-19",
        dateLabel: "Saturday, September 19, 2026",
        time: "9:00 AM",
        location: "Sea Bright Beach, NJ"
      }),
      "price_1UVBrH1UP4OSvubVkW6s7LNp": () => ({ catalogId: "friendsgiving-nov21" }),
      // Wave Friendsgiving link
      "price_1U981k1UP4OSvubVnoRtLkX9": (created, desc) => created >= WAVE_NOV_AT ? { catalogId: "wave-nov14" } : created >= WAVE_FALL_AT ? {
        className: "Wave Sculpt",
        date: null,
        dateLabel: "Fri Oct 16 or Oct 23 (not recorded)",
        time: "8:00 AM",
        location: "Indoors at Wave Resort, Long Branch, NJ",
        flag: "Date not recorded: paid through the Wave Sculpt Payment Link, which doesn't ask for Oct 16 vs Oct 23. Confirm with the customer."
      } : /9\/12/.test(desc || "") ? { className: "Poolside Pilates at Wave Resort", date: "2026-09-12", dateLabel: "Saturday, September 12, 2026", time: "1:00 PM", location: "Wave Resort, Long Branch, NJ" } : { className: "Wave Sculpt / Poolside Pilates", date: null, dateLabel: "Unknown", time: null, location: "Wave Resort, Long Branch, NJ", flag: "Class date unclear from the payment." },
      "price_1U89771UP4OSvubVLZecB51C": (created) => created >= WAVE_FALL_AT ? {
        className: "Wave Sculpt (paid via old Poolside Pilates link)",
        date: null,
        dateLabel: "Probably Fri Oct 16 or Oct 23",
        time: "8:00 AM",
        location: "Indoors at Wave Resort, Long Branch, NJ",
        flag: 'Paid through the old summer "Poolside Pilates" link (the QR on the first Wave flyer). Most likely Wave Sculpt; confirm the date with the customer.'
      } : {
        className: "Poolside Pilates at Wave Resort",
        date: null,
        dateLabel: "Probably Saturday, Aug 29, 2026",
        time: "1:00 PM",
        location: "Wave Resort, Long Branch, NJ",
        flag: "Date unclear: the Payment Link covered weekly Saturday classes. Most likely Aug 29."
      },
      "price_1U71u01UP4OSvubVzV57Zqmu": () => ({
        className: "Event (custom amount)",
        date: null,
        dateLabel: "Unknown",
        time: null,
        location: null,
        flag: `Generic "Event" payment: class and date can't be determined.`
      })
    };
    var BY_LIVE_PRICE = {};
    for (const [id, item] of Object.entries(CATALOG)) if (item.priceId) BY_LIVE_PRICE[item.priceId] = BY_LIVE_PRICE[item.priceId] || id;
    function itemFromCatalog(id, spots, attendees) {
      const c = CATALOG[id];
      return {
        catalogId: id,
        kind: c.kind,
        className: c.className,
        date: c.date || null,
        dateLabel: c.dateLabel || null,
        time: c.time || null,
        location: c.location || null,
        spots,
        attendees: attendees || [],
        unitAmount: c.amount
      };
    }
    function catalogIdFromName(desc) {
      const d = (desc || "").toLowerCase();
      if (d.startsWith("bogo")) return "intro-bogo";
      if (d.startsWith("3-class pack")) return "pack-3";
      if (d.startsWith("4-class pack")) return "pack-4";
      if (d.startsWith("single class")) return "single";
      if (d.startsWith("egift") && d.includes("2 class")) return "gift-2";
      if (d.startsWith("egift") && d.includes("1 class")) return "gift-1";
      if (d.startsWith("pumpkins")) return "pumpkins-oct18";
      if (d.includes("seaview") && d.includes("nov 4")) return "seaview-nov4";
      if (d.includes("seaview") && d.includes("nov 18")) return "seaview-nov18";
      return null;
    }
    function phoneOf(session) {
      const cd = session.customer_details || {};
      if (cd.phone) return cd.phone;
      for (const f of session.custom_fields || []) {
        const v = f.text && f.text.value || f.numeric && f.numeric.value;
        if (v && /phone/i.test(f.key || "")) return v;
      }
      return "";
    }
    function classifySession(session, lineItems) {
      const created = (session.created || 0) * 1e3;
      const items = [];
      const flags = [];
      const md = session.metadata || {};
      if (md.items) {
        for (const pair of md.items.split(",")) {
          const [id, q] = pair.split(":");
          if (CATALOG[id]) items.push(itemFromCatalog(id, parseInt(q, 10) || 1));
        }
      } else if (md.cart) {
        for (const part of md.cart.split(",")) {
          const m = part.trim().match(/^(\S+) x(\d+)$/);
          if (m && CATALOG[m[1]]) items.push(itemFromCatalog(m[1], parseInt(m[2], 10)));
        }
      }
      if (!items.length) {
        for (const li of lineItems || []) {
          const priceId = li.price && li.price.id;
          const qty = li.quantity || 1;
          if (priceId && BY_LIVE_PRICE[priceId] && !PRICE_RULES[priceId]) {
            items.push(itemFromCatalog(BY_LIVE_PRICE[priceId], qty));
            continue;
          }
          if (priceId && PRICE_RULES[priceId]) {
            const r = PRICE_RULES[priceId](created, li.description);
            if (r.catalogId) {
              items.push(itemFromCatalog(r.catalogId, qty));
              continue;
            }
            items.push({
              catalogId: null,
              kind: "class",
              className: r.className,
              date: r.date,
              dateLabel: r.dateLabel,
              time: r.time,
              location: r.location,
              spots: qty,
              attendees: [],
              unitAmount: li.price.unit_amount
            });
            if (r.flag) flags.push(r.flag);
            continue;
          }
          const byName = catalogIdFromName(li.description);
          if (byName) {
            items.push(itemFromCatalog(byName, qty));
            continue;
          }
          items.push({
            catalogId: null,
            kind: "unknown",
            className: li.description || "Unknown item",
            date: null,
            dateLabel: "Unknown",
            time: null,
            location: null,
            spots: qty,
            attendees: [],
            unitAmount: li.price && li.price.unit_amount
          });
          flags.push(`Couldn't match "${li.description}" to a class.`);
        }
      }
      if (!items.length) flags.push("No line items found for this payment.");
      const cd = session.customer_details || {};
      const email = (md.purchaser_email || cd.email || "").toLowerCase();
      if (email === "seasculptclub@gmail.com") flags.push("Paid with your own email, so this is probably a test purchase. Consider refunding it in Stripe.");
      const phone = md.purchaser_phone || phoneOf(session);
      const notes = phone ? [] : ["No phone number on this payment (older checkout didn't ask for one)."];
      return {
        id: session.id,
        ref: md.booking_ref || session.client_reference_id || null,
        status: session.payment_status === "paid" ? "paid" : session.payment_status,
        livemode: !!session.livemode,
        purchaser: { name: md.purchaser_name || cd.name || "", email, phone },
        items,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
        sessionId: session.id,
        paymentLink: session.payment_link || null,
        createdAt: new Date(created).toISOString(),
        source: "recovered",
        confidence: flags.length ? "check" : "confident",
        flags,
        notes
      };
    }
    function flagDuplicates(records) {
      const sorted = [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i], b = sorted[j];
          if (Date.parse(b.createdAt) - Date.parse(a.createdAt) > 15 * 60 * 1e3) break;
          const sameClass = a.items.map((x) => x.className).join() === b.items.map((x) => x.className).join();
          if (a.purchaser.email && a.purchaser.email === b.purchaser.email && sameClass) {
            const note = `Possible double payment: same email and class paid twice within minutes (${a.sessionId.slice(0, 18)}\u2026 and ${b.sessionId.slice(0, 18)}\u2026).`;
            for (const r of [a, b]) {
              if (!r.flags.includes(note)) {
                r.flags.push(note);
                r.confidence = "check";
              }
            }
          }
        }
      }
      return records;
    }
    module.exports = { classifySession, flagDuplicates, PRICE_RULES };
  }
});

// ../cf/src/lib/gifts.js
var require_gifts = __commonJS({
  "../cf/src/lib/gifts.js"(exports, module) {
    var { randomBytes } = require_webcrypto();
    var { sendGiftEmail } = require_email();
    var SEND_HOUR_NJ = 9;
    var MAX_TRIES = 5;
    function njNow(now) {
      const d = now || /* @__PURE__ */ new Date();
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(d).reduce((o, p) => (o[p.type] = p.value, o), {});
      return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: parseInt(parts.hour, 10) };
    }
    function newCode() {
      const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const b = randomBytes(8);
      let s = "";
      for (let i = 0; i < 8; i++) s += A[b[i] % A.length];
      return `SSC-${s.slice(0, 4)}-${s.slice(4)}`;
    }
    function prepareGifts(booking) {
      for (const it of booking.items || []) {
        const cat = require_catalog().CATALOG[it.catalogId];
        if (it.kind === "pack" && cat && cat.credits && !it.packCode) it.packCode = newCode();
        if (it.kind !== "gift" || !Array.isArray(it.gifts)) continue;
        it.gifts = it.gifts.map((g) => ({ ...g, code: g.code || newCode(), status: g.status || "scheduled", tries: g.tries || 0 }));
      }
    }
    function isDue(g, now) {
      if (!["scheduled", "failed"].includes(g.status)) return false;
      if (g.status === "failed" && (g.tries || 0) >= MAX_TRIES) return false;
      if (g.sendOn === "now") return true;
      const t = njNow(now);
      return g.sendOn < t.date || g.sendOn === t.date && t.hour >= SEND_HOUR_NJ;
    }
    async function sendDueGifts(booking, env, now) {
      let changed = false;
      const items = booking.items || [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind !== "gift" || !Array.isArray(it.gifts)) continue;
        for (let n = 0; n < it.gifts.length; n++) {
          const g = it.gifts[n];
          if (!isDue(g, now)) continue;
          const r = await sendGiftEmail(booking, it, g, `${booking.sessionId}-${i}-${n}`, env);
          g.tries = (g.tries || 0) + (r.status === "failed" ? 1 : 0);
          g.status = r.status;
          if (r.status === "sent") {
            g.sentAt = r.at;
            g.emailId = r.id || null;
          } else {
            g.reason = r.reason || null;
          }
          changed = true;
        }
      }
      return changed;
    }
    module.exports = { prepareGifts, sendDueGifts, isDue, njNow, newCode, SEND_HOUR_NJ };
  }
});

// ../cf/src/functions/stripe-webhook.js
var require_stripe_webhook = __commonJS({
  "../cf/src/functions/stripe-webhook.js"(exports) {
    var { verifyStripeSignature } = require_stripe_signature();
    var { CATALOG } = require_catalog();
    var { store } = require_store();
    var { sendConfirmation } = require_email();
    var { classifySession } = require_recovery();
    var { prepareGifts, sendDueGifts } = require_gifts();
    var { createCodesForBooking, confirmHold, releaseHold, normalizeCode } = require_giftcodes();
    var ok = (body) => ({ statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    var fail = (statusCode, error) => ({ statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error }) });
    function rawBodyOf(event) {
      if (!event.body) return "";
      if (!event.isBase64Encoded) return event.body;
      const bin = atob(event.body);
      return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    }
    function fromMetadata(session) {
      const md = session.metadata || {};
      if (!md.items) return null;
      const attendees = {};
      for (const [k, v] of Object.entries(md)) {
        if (!k.startsWith("attendees_")) continue;
        const eq = v.indexOf("=");
        if (eq > 0) attendees[v.slice(0, eq)] = v.slice(eq + 1).split(" | ").filter(Boolean);
      }
      const gifts = {};
      for (const [k, v] of Object.entries(md)) {
        if (!k.startsWith("gifts_")) continue;
        const eq = v.indexOf("=");
        if (eq > 0) gifts[v.slice(0, eq)] = v.slice(eq + 1).split(" | ").filter(Boolean).map((g) => {
          const [toName, toEmail, sendOn] = g.split("~");
          return { toName: toName || "", toEmail: toEmail || "", message: "", sendOn: sendOn || "now" };
        });
      }
      const cover = {};
      for (const pair of String(md.gift_cover || "").split(",")) {
        const [id, q] = pair.split(":");
        if (id && CATALOG[id]) cover[id] = parseInt(q, 10) || 0;
      }
      const lines = md.items.split(",").map((pair) => {
        const [id, q] = pair.split(":");
        const item = CATALOG[id];
        if (!item) return null;
        return {
          id,
          qty: parseInt(q, 10) || 1,
          attendees: attendees[id] || [],
          gifts: gifts[id] || [],
          kind: item.kind,
          className: item.className,
          date: item.date || null,
          dateLabel: item.dateLabel || null,
          time: item.time || null,
          location: item.location || null,
          unitAmount: item.amount,
          giftCovered: cover[id] || 0
        };
      }).filter(Boolean);
      const giftRedemption = md.gift_code ? {
        code: md.gift_code,
        kind: md.gift_kind || "gift",
        credits: parseInt(md.gift_credits, 10) || 0,
        value: lines.reduce((n, l) => n + l.unitAmount * (l.giftCovered || 0), 0)
      } : null;
      const wv = /^accepted v(\S+) at (\S+)$/.exec(md.intake_waiver || "");
      const heard = String(md.intake_heard || "");
      const intake = md.intake_heard || md.intake_photo || md.intake_waiver ? {
        heard: heard.split(": ")[0],
        heardOther: heard.includes(": ") ? heard.slice(heard.indexOf(": ") + 2) : "",
        injuries: md.intake_injuries || "",
        photoConsent: md.intake_photo || "",
        waiver: wv ? { accepted: true, version: wv[1], at: wv[2] } : null
      } : null;
      return {
        ref: md.booking_ref || session.client_reference_id || null,
        intake,
        purchaser: { name: md.purchaser_name || "", email: md.purchaser_email || "", phone: md.purchaser_phone || "" },
        lines,
        giftRedemption,
        expectedAmount: lines.reduce((n, l) => n + l.unitAmount * (l.qty - (l.giftCovered || 0)), 0)
      };
    }
    async function finalize(db, session, evt) {
      const key = `bookings/${session.id}`;
      const existing = await db.get(key, { type: "json" });
      if (existing) return { duplicate: true, bookingId: session.id };
      let order = await db.get(`pending/${session.id}`, { type: "json" });
      let source = "pending";
      if (!order) {
        order = fromMetadata(session);
        source = "metadata";
      }
      let extraFlags = [];
      if (!order || !order.lines || !order.lines.length) {
        const matched = await matchByLineItems(session);
        if (matched) {
          order = matched.order;
          extraFlags = matched.flags;
          source = "payment_link";
        } else {
          order = { ref: session.client_reference_id || null, purchaser: {}, lines: [], expectedAmount: null };
          source = "unmatched";
        }
      }
      const cd = session.customer_details || {};
      const flags = [...extraFlags];
      if (source === "unmatched") flags.push("Not created by the website cart: check this payment in Stripe.");
      if (source !== "payment_link" && order.expectedAmount != null && session.amount_total !== order.expectedAmount) {
        flags.push(`Amount paid (${session.amount_total}) differs from the website price (${order.expectedAmount}).`);
      }
      const booking = {
        id: session.id,
        ref: order.ref,
        status: "paid",
        livemode: !!session.livemode,
        purchaser: {
          name: order.purchaser.name || cd.name || "",
          email: order.purchaser.email || cd.email || "",
          phone: order.purchaser.phone || cd.phone || ""
        },
        items: order.lines.map((l) => ({
          catalogId: l.id,
          kind: l.kind,
          className: l.className,
          date: l.date,
          dateLabel: l.dateLabel,
          time: l.time,
          location: l.location,
          spots: l.qty,
          attendees: l.attendees || [],
          unitAmount: l.unitAmount,
          ...l.giftCovered ? { giftCovered: l.giftCovered } : {},
          ...l.kind === "gift" ? { gifts: l.gifts || [] } : {}
        })),
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent && session.payment_intent.id || null,
        sessionId: session.id,
        stripeEventId: evt.id,
        source,
        flags,
        ...order.intake ? { intake: order.intake } : {},
        ...order.giftRedemption ? { giftRedemption: order.giftRedemption } : {},
        createdAt: new Date((session.created || Date.now() / 1e3) * 1e3).toISOString(),
        paidAt: (/* @__PURE__ */ new Date()).toISOString(),
        confirmation: source === "pending" || source === "metadata" ? { status: "pending" } : { status: "not_sent", reason: "Not a website-cart booking (e.g. old Payment Link); Stripe's receipt was the only email." }
      };
      prepareGifts(booking);
      const written = await db.setJSON(key, booking, { onlyIfNew: true });
      if (written && written.modified === false) return { duplicate: true, bookingId: session.id };
      try {
        await createCodesForBooking(db, booking);
      } catch (err) {
        console.error("Could not save eGift codes:", err && err.message);
      }
      if (booking.giftRedemption) {
        try {
          await confirmHold(db, booking.giftRedemption.code, session.id, booking.giftRedemption.credits, booking.ref);
        } catch (err) {
          console.error("Could not record eGift use:", err && err.message);
          booking.flags.push(`eGift ${booking.giftRedemption.code} use could not be recorded: check its balance.`);
          await db.setJSON(key, booking);
        }
      }
      if (source === "pending" || source === "metadata") {
        booking.confirmation = await sendConfirmation(booking, process.env);
        await sendDueGifts(booking, process.env);
        await db.setJSON(key, booking);
      }
      try {
        await db.delete(`pending/${session.id}`);
      } catch (e) {
      }
      return { created: true, bookingId: session.id, confirmation: booking.confirmation.status };
    }
    exports.handler = async (event) => {
      if (event.httpMethod !== "POST") return fail(405, "Method not allowed");
      const raw = rawBodyOf(event);
      const header = event.headers && (event.headers["stripe-signature"] || event.headers["Stripe-Signature"]) || "";
      const check = await verifyStripeSignature(raw, header, (process.env.STRIPE_WEBHOOK_SECRET || "").trim());
      if (!check.ok) {
        console.warn("Rejected webhook:", check.reason);
        return fail(400, "Invalid signature");
      }
      let evt;
      try {
        evt = JSON.parse(raw);
      } catch (e) {
        return fail(400, "Invalid JSON");
      }
      const session = evt.data && evt.data.object;
      if (!session || session.object !== "checkout.session") return ok({ ignored: evt.type });
      const db = store(event);
      try {
        switch (evt.type) {
          case "checkout.session.completed":
            if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
              return ok(await finalize(db, session, evt));
            }
            await markPending(db, session.id, "awaiting_payment");
            return ok({ awaitingPayment: true });
          case "checkout.session.async_payment_succeeded":
            return ok(await finalize(db, session, evt));
          case "checkout.session.async_payment_failed":
            await markPending(db, session.id, "payment_failed");
            await releaseGiftHold(db, session);
            return ok({ paymentFailed: true });
          case "checkout.session.expired":
            await markPending(db, session.id, "expired");
            await releaseGiftHold(db, session);
            return ok({ expired: true });
          default:
            return ok({ ignored: evt.type });
        }
      } catch (err) {
        console.error("Webhook processing error:", err);
        return fail(500, "Processing error");
      }
    };
    async function matchByLineItems(session) {
      const secret = (process.env.STRIPE_SECRET_KEY || "").trim();
      if (!secret) return null;
      try {
        const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session.id)}/line_items?limit=100`, {
          headers: { Authorization: `Bearer ${secret}`, "Stripe-Version": "2026-03-25.dahlia" }
        });
        if (!res.ok) {
          console.warn("Line item lookup failed:", res.status);
          return null;
        }
        const data = await res.json();
        const r = classifySession(session, data.data || []);
        if (!r.items.length) return null;
        return {
          order: {
            ref: r.ref,
            purchaser: r.purchaser,
            expectedAmount: null,
            lines: r.items.map((it) => ({
              id: it.catalogId,
              qty: it.spots,
              attendees: [],
              kind: it.kind,
              className: it.className,
              date: it.date,
              dateLabel: it.dateLabel,
              time: it.time,
              location: it.location,
              unitAmount: it.unitAmount
            }))
          },
          flags: ["Paid through a Stripe Payment Link (not the website cart): no attendee names.", ...r.flags]
        };
      } catch (err) {
        console.warn("Line item lookup error:", err && err.message);
        return null;
      }
    }
    async function releaseGiftHold(db, session) {
      const code = normalizeCode(session.metadata && session.metadata.gift_code);
      if (!code) return;
      try {
        await releaseHold(db, code, session.id);
      } catch (err) {
        if (err.code !== "not_found") console.error("Could not release eGift hold:", err && err.message);
      }
    }
    async function markPending(db, sessionId, status) {
      const key = `pending/${sessionId}`;
      const p = await db.get(key, { type: "json" });
      if (p) {
        p.status = status;
        p.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await db.setJSON(key, p);
      }
    }
  }
});

// ../cf/src/functions/admin-bookings.js
var require_admin_bookings = __commonJS({
  "../cf/src/functions/admin-bookings.js"(exports) {
    var { sha256, toHex, timingSafeEqual } = require_webcrypto();
    var { store } = require_store();
    var { classifySession, flagDuplicates } = require_recovery();
    var STRIPE_VERSION = "2026-03-25.dahlia";
    var MAX_FAILS = 10;
    var WINDOW_MS = 15 * 60 * 1e3;
    var json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }, body: JSON.stringify(body) });
    async function passwordOk(given, expected) {
      return timingSafeEqual(await sha256(String(given || "")), await sha256(String(expected || "")));
    }
    async function clientKey(event) {
      const h = event.headers || {};
      const ip = h["cf-connecting-ip"] || h["x-nf-client-connection-ip"] || h["x-forwarded-for"] || "unknown";
      return "auth/" + toHex(await sha256(String(ip).split(",")[0].trim())).slice(0, 24);
    }
    async function checkAuth(event, db) {
      const expected = process.env.ADMIN_PASSWORD || "";
      if (expected.length < 12) return json(503, { error: "The bookings page isn't set up yet: add ADMIN_PASSWORD (12+ characters) in your hosting settings." });
      const key = await clientKey(event);
      const now = Date.now();
      let rec = await db.get(key, { type: "json" }) || { count: 0, first: now };
      if (now - rec.first > WINDOW_MS) rec = { count: 0, first: now };
      if (rec.count >= MAX_FAILS) return json(429, { error: "Too many wrong passwords. Try again in 15 minutes." });
      const given = event.headers && (event.headers["x-admin-password"] || event.headers["X-Admin-Password"]) || "";
      if (!await passwordOk(given, expected)) {
        rec.count += 1;
        await db.setJSON(key, rec);
        return json(401, { error: "Wrong password." });
      }
      if (rec.count) await db.delete(key);
      return null;
    }
    async function listBookings(db) {
      const { blobs } = await db.list({ prefix: "bookings/" });
      const out = [];
      for (const b of blobs) {
        const rec = await db.get(b.key, { type: "json" });
        if (rec) out.push(rec);
      }
      return out.sort((a, b) => (b.paidAt || b.createdAt || "").localeCompare(a.paidAt || a.createdAt || ""));
    }
    async function recoverFromStripe(db) {
      const secret = (process.env.STRIPE_SECRET_KEY || "").trim();
      if (!secret) return { error: "STRIPE_SECRET_KEY is not set." };
      const sessions = [];
      let after = null;
      for (let page = 0; page < 20; page++) {
        const qs = new URLSearchParams({ limit: "100", status: "complete" });
        qs.append("expand[]", "data.line_items");
        if (after) qs.append("starting_after", after);
        const res = await fetch("https://api.stripe.com/v1/checkout/sessions?" + qs.toString(), {
          headers: { Authorization: `Bearer ${secret}`, "Stripe-Version": STRIPE_VERSION }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data.error && data.error.message || `HTTP ${res.status}`;
          if (res.status === 403 || /permission/i.test(msg)) {
            return { error: 'Your Stripe restricted key needs "Checkout Sessions: Read" to look up past payments. Edit the key in Stripe \u2192 Developers \u2192 API keys.' };
          }
          return { error: "Stripe error: " + msg };
        }
        sessions.push(...data.data || []);
        if (!data.has_more || !data.data.length) break;
        after = data.data[data.data.length - 1].id;
      }
      const saved = new Set((await db.list({ prefix: "bookings/" })).blobs.map((b) => b.key.slice("bookings/".length)));
      const records = sessions.filter((s) => s.payment_status === "paid" && !saved.has(s.id)).map((s) => classifySession(s, s.line_items && s.line_items.data || []));
      return { records: flagDuplicates(records) };
    }
    function giftText(gifts) {
      return gifts.map((g) => `Gift for ${g.toName} <${g.toEmail}> \xB7 code ${g.code || "?"} \xB7 ${g.sendOn === "now" ? "send now" : "send " + g.sendOn} \xB7 ${g.status || "?"}`).join("; ");
    }
    var CSV_HEADERS = [
      "Class",
      "Date",
      "Time",
      "Location",
      "Purchaser name",
      "Attendee names",
      "Email",
      "Phone",
      "Spots",
      "Payment status",
      "Amount paid",
      "Booking ref",
      "Stripe payment reference",
      "Stripe checkout session",
      "Booked at",
      "Confirmation email",
      "Mode",
      "Needs attention / notes",
      "Heard about us",
      "Injuries / modifications",
      "Photo consent",
      "Waiver accepted"
    ];
    function toCsv(records) {
      const cell = (v) => {
        let s = String(v == null ? "" : v);
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = [CSV_HEADERS];
      for (const r of records) {
        const items = r.items && r.items.length ? r.items : [{ className: "(unknown)", spots: "" }];
        for (const it of items) {
          rows.push([
            it.className,
            it.date || it.dateLabel || "",
            it.time || "",
            it.location || "",
            r.purchaser.name,
            it.gifts ? giftText(it.gifts) : (it.attendees || []).join("; "),
            r.purchaser.email,
            r.purchaser.phone,
            it.spots,
            r.status,
            r.amountTotal != null ? (r.amountTotal / 100).toFixed(2) : "",
            r.ref || "",
            r.paymentIntent || "",
            r.sessionId,
            r.paidAt || r.createdAt,
            r.confirmation && r.confirmation.status || "",
            r.livemode ? "live" : "TEST",
            [...r.flags || [], ...r.notes || []].join(" | "),
            r.intake ? [r.intake.heard, r.intake.heardOther].filter(Boolean).join(": ") : "",
            r.intake ? r.intake.injuries || "" : "",
            r.intake ? r.intake.photoConsent || "" : "",
            r.intake && r.intake.waiver ? `Yes (v${r.intake.waiver.version}, ${r.intake.waiver.at})` : ""
          ]);
        }
      }
      return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
    }
    var NETLIFY_SITE = "https://sweet-kringle-6c45eb.netlify.app";
    async function importFromNetlify(event, db) {
      const base = (process.env.NETLIFY_SITE || NETLIFY_SITE).replace(/\/+$/, "");
      const pw = event.headers && event.headers["x-admin-password"] || "";
      const pull = async (view) => {
        let res;
        try {
          res = await fetch(`${base}/.netlify/functions/admin-bookings?view=${view}`, { headers: { "x-admin-password": pw } });
        } catch (e) {
          throw new Error("Couldn't reach the old Netlify site. Is it still online?");
        }
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("The old Netlify site rejected the password. Use the same ADMIN_PASSWORD on both sites.");
        if (!res.ok) return null;
        return Array.isArray(data.records) ? data.records : null;
      };
      let bookings;
      try {
        bookings = await pull("bookings");
      } catch (err) {
        return json(502, { error: err.message });
      }
      if (!bookings) return json(502, { error: "Couldn't reach the old Netlify bookings. Is the Netlify site still online?" });
      let added = 0, already = 0, forms = 0;
      for (const b of bookings) {
        if (!b || !b.id) continue;
        const r = await db.setJSON(`bookings/${b.id}`, { ...b, importedFrom: "netlify" }, { onlyIfNew: true });
        r.modified ? added++ : already++;
      }
      let formRecs = null;
      try {
        formRecs = await pull("forms");
      } catch (e) {
        formRecs = null;
      }
      for (const f of formRecs || []) {
        if (!f || !f.id || !f.createdAt) continue;
        const r = await db.setJSON(`forms/${f.createdAt}-${f.id}`, f, { onlyIfNew: true });
        if (r.modified) forms++;
      }
      return json(200, { imported: added, alreadyHere: already, formMessages: forms, found: bookings.length });
    }
    exports.handler = async (event) => {
      const q = event.queryStringParameters || {};
      const isImport = event.httpMethod === "POST" && q.action === "import-netlify";
      if (event.httpMethod !== "GET" && !isImport) return json(405, { error: "Method not allowed" });
      const db = store(event);
      const denied = await checkAuth(event, db);
      if (denied) return denied;
      if (isImport) return importFromNetlify(event, db);
      const view = q.view || "bookings";
      let records;
      if (view === "forms") {
        const forms = await listForms(db);
        if (q.format === "csv") {
          return { statusCode: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="sea-sculpt-form-messages.csv"', "Cache-Control": "no-store" }, body: formsCsv(forms) };
        }
        return json(200, { view, count: forms.length, records: forms });
      }
      if (view === "giftcards") {
        const cards = await listGiftCards(db);
        if (q.format === "csv") {
          return { statusCode: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="sea-sculpt-egift-cards.csv"', "Cache-Control": "no-store" }, body: giftCsv(cards) };
        }
        return json(200, { view, count: cards.length, records: cards });
      }
      if (view === "recovered") {
        const r = await recoverFromStripe(db);
        if (r.error) return json(502, { error: r.error });
        records = r.records;
      } else {
        records = await listBookings(db);
      }
      if (q.format === "csv") {
        const name = view === "recovered" ? "sea-sculpt-past-payments.csv" : "sea-sculpt-bookings.csv";
        return {
          statusCode: 200,
          headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
          body: toCsv(records)
        };
      }
      return json(200, { view, count: records.length, records });
    };
    async function listForms(db) {
      const { blobs } = await db.list({ prefix: "forms/" });
      const out = [];
      for (const b of blobs) {
        const rec = await db.get(b.key, { type: "json" });
        if (rec) out.push(rec);
      }
      return out.sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
    }
    function formsCsv(forms) {
      const cell = (v) => {
        const t = String(v == null ? "" : v);
        return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
      };
      const rows = [["Received", "Form", "Name", "Email", "Reason", "Message", "Other details", "Emailed"]];
      for (const r of forms) {
        const f = r.fields || {};
        const other = Object.entries(f).filter(([k]) => !["name", "email", "reason", "message"].includes(k)).map(([k, v]) => `${k}: ${v}`).join(" | ");
        rows.push([r.createdAt, r.form, f.name || "", f.email || "", f.reason || "", f.message || "", other, r.email && r.email.status || ""]);
      }
      return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
    }
    exports._toCsv = toCsv;
    var { available, used, expiringLeft, expiredLost } = require_giftcodes();
    async function listGiftCards(db) {
      const { blobs } = await db.list({ prefix: "giftcodes/" });
      const out = [];
      for (const b of blobs) {
        const r = await db.get(b.key);
        if (!r) continue;
        const left = available(r);
        const lost = expiredLost(r);
        out.push({ ...r, used: used(r), left, expired: lost, expiringLeft: expiringLeft(r), held: Math.max(0, (r.credits || 0) - used(r) - lost - left) });
      }
      return out.sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
    }
    function giftCsv(cards) {
      const cell = (v) => {
        const t = String(v == null ? "" : v);
        return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
      };
      const rows = [["Code", "eGift", "Credits", "Used", "Left", "For", "For email", "From", "From email", "Purchase ref", "Created", "Used on (booking refs)"]];
      for (const c of cards) rows.push([c.code, c.giftName, c.credits, c.used, c.left, c.toName, c.toEmail, c.fromName, c.fromEmail, c.purchaseRef, c.createdAt, (c.uses || []).map((u) => `${u.ref || u.bookingId} (${u.n})`).join("; ")]);
      return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
    }
  }
});

// ../cf/src/functions/get-posts.js
var require_get_posts = __commonJS({
  "../cf/src/functions/get-posts.js"(exports) {
    var json = (statusCode, body, cache) => ({
      statusCode,
      headers: { "Content-Type": "application/json", "Cache-Control": cache || "no-store" },
      body: JSON.stringify(body)
    });
    var pick = (f, names) => {
      for (const n of names) if (f[n] != null && f[n] !== "") return f[n];
      return null;
    };
    var slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    function isPublished(f) {
      if (f.Published === true) return true;
      const status = f.Status && (typeof f.Status === "string" ? f.Status : f.Status.name);
      return String(status || "").trim().toLowerCase() === "published";
    }
    function imageUrl(att) {
      const a = Array.isArray(att) ? att[0] : null;
      if (!a) return "";
      return a.thumbnails && a.thumbnails.full && a.thumbnails.full.url || a.url || "";
    }
    function toPost(record) {
      const f = record.fields || {};
      const title = pick(f, ["Title", "Blog Title"]);
      if (!title || !isPublished(f)) return null;
      const date = String(pick(f, ["Date", "Publish Date"]) || (record.createdTime || "").slice(0, 10));
      return {
        id: record.id,
        slug: pick(f, ["Slug"]) || slugify(title),
        title: String(title).trim(),
        date: date.slice(0, 10),
        excerpt: pick(f, ["Excerpt"]) || "",
        image: imageUrl(pick(f, ["Image", "Featured Image"])),
        body: pick(f, ["Body", "Content"]) || ""
      };
    }
    exports.handler = async function() {
      const token = process.env.AIRTABLE_TOKEN;
      const baseId = process.env.AIRTABLE_BASE_ID;
      const table = process.env.AIRTABLE_TABLE || "Posts";
      if (!token || !baseId) return json(200, { posts: [], note: "Blog not connected to Airtable yet (AIRTABLE_TOKEN / AIRTABLE_BASE_ID)." });
      try {
        const records = [];
        let offset = null;
        for (let page = 0; page < 10; page++) {
          const qs = new URLSearchParams({ pageSize: "100" });
          if (offset) qs.set("offset", offset);
          const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${qs}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) {
            const details = await res.text();
            console.error("Airtable request failed", res.status, details.slice(0, 300));
            return json(502, { error: "Airtable request failed", status: res.status });
          }
          const data = await res.json();
          records.push(...data.records || []);
          if (!data.offset) break;
          offset = data.offset;
        }
        const posts = records.map(toPost).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
        return json(200, { posts }, "public, max-age=60");
      } catch (err) {
        console.error("get-posts failed", err);
        return json(500, { error: "Unexpected error" });
      }
    };
    exports._toPost = toPost;
  }
});

// ../cf/src/functions/form.js
var require_form = __commonJS({
  "../cf/src/functions/form.js"(exports) {
    var { randomHex } = require_webcrypto();
    var { store } = require_store();
    var FORMS = {
      contact: "Contact form",
      newsletter: "Newsletter signup",
      "private-inquiry": "Private session question"
    };
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
    var esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    var LABELS = { name: "Name", email: "Email", reason: "Reason", message: "Message", phone: "Phone", company: "Company" };
    function parse(event) {
      const type = String(event.headers && (event.headers["content-type"] || event.headers["Content-Type"]) || "");
      const raw = event.body || "";
      if (/application\/json/i.test(type)) {
        try {
          return JSON.parse(raw) || {};
        } catch (e) {
          return null;
        }
      }
      return Object.fromEntries(new URLSearchParams(raw));
    }
    function wantsPage(event) {
      const accept = String(event.headers && event.headers.accept || "");
      return /text\/html/i.test(accept) && !/application\/json/i.test(accept);
    }
    function reply(event, status, body) {
      if (wantsPage(event)) {
        const back = event.headers && (event.headers.referer || event.headers.referrer) || "/";
        let url = "/";
        try {
          const u = new URL(back);
          url = u.pathname + (status < 300 ? "?sent=1" : "?sent=0") + u.hash;
        } catch (e) {
        }
        return { statusCode: 303, headers: { Location: url, "Cache-Control": "no-store" }, body: "" };
      }
      return { statusCode: status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
    }
    async function sendFormEmail(rec, env) {
      if (!env.RESEND_API_KEY) return { status: "not_sent", reason: "Email service not configured: see the Form messages tab on the bookings page." };
      const title = FORMS[rec.form] || rec.form;
      const who = rec.fields.name || rec.fields.email || "Someone";
      const rows = Object.entries(rec.fields);
      const text = `${title} from seasculptclub.com

` + rows.map(([k, v]) => `${LABELS[k] || k}: ${v}`).join("\n") + `

Sent ${rec.createdAt}`;
      const html = `<div style="font-family:Georgia,serif;color:#12314F;max-width:560px"><h2 style="font-weight:400">${esc(title)}</h2>` + rows.map(([k, v]) => `<p style="margin:0 0 10px"><strong>${esc(LABELS[k] || k)}</strong><br>${esc(v).replace(/\n/g, "<br>")}</p>`).join("") + `<p style="color:#6b7f93;font-size:12px">Sent from seasculptclub.com \xB7 ${esc(rec.createdAt)}</p></div>`;
      const payload = {
        from: env.BOOKING_EMAIL_FROM || "Sea Sculpt Club <bookings@seasculptclub.com>",
        to: [env.FORMS_EMAIL_TO || "seasculptclub@gmail.com"],
        subject: rec.form === "newsletter" ? `New newsletter signup: ${rec.fields.email}` : `${title}: ${who}`,
        text,
        html
      };
      if (EMAIL_RE.test(rec.fields.email || "")) payload.reply_to = rec.fields.email;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `form-${rec.id}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { status: "failed", reason: data && (data.message || data.name) || `HTTP ${res.status}` };
        return { status: "sent", id: data.id || null };
      } catch (err) {
        return { status: "failed", reason: String(err && err.message || err) };
      }
    }
    exports.handler = async (event) => {
      if (event.httpMethod !== "POST") return reply(event, 405, { error: "Method not allowed" });
      if ((event.body || "").length > 2e4) return reply(event, 413, { error: "That message is too long." });
      const body = parse(event);
      if (!body) return reply(event, 400, { error: "Bad request" });
      if (clean(body["bot-field"], 200)) return reply(event, 200, { ok: true });
      const form2 = clean(body["form-name"], 40);
      if (!FORMS[form2]) return reply(event, 400, { error: "Unknown form." });
      const fields = {};
      for (const [k, v] of Object.entries(body)) {
        if (k === "form-name" || k === "bot-field" || typeof v !== "string") continue;
        if (!/^[a-z_-]{1,40}$/i.test(k) || Object.keys(fields).length >= 12) continue;
        const val = clean(v, k === "message" ? 4e3 : 300);
        if (val) fields[k] = val;
      }
      if (fields.email) fields.email = fields.email.toLowerCase();
      if (!EMAIL_RE.test(fields.email || "")) return reply(event, 400, { error: "Please enter a valid email address." });
      if (form2 !== "newsletter" && !fields.message) return reply(event, 400, { error: "Please include a message." });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const rec = { id: randomHex(6), form: form2, fields, createdAt: now, page: clean(event.headers && (event.headers.referer || ""), 300) };
      const key = `forms/${now}-${rec.id}`;
      const db = store(event);
      let saved = false;
      try {
        await db.setJSON(key, rec);
        saved = true;
      } catch (err) {
        console.error("Could not save form submission:", err && err.message);
      }
      rec.email = await sendFormEmail(rec, process.env);
      if (saved) {
        try {
          await db.setJSON(key, rec);
        } catch (e) {
        }
      }
      if (!saved && rec.email.status !== "sent") return reply(event, 502, { error: "Your message couldn't be sent. Please email seasculptclub@gmail.com." });
      return reply(event, 200, { ok: true });
    };
    exports._sendFormEmail = sendFormEmail;
  }
});

// ../cf/src/functions/send-gifts.js
var require_send_gifts = __commonJS({
  "../cf/src/functions/send-gifts.js"(exports) {
    var { store } = require_store();
    var { sendDueGifts, isDue } = require_gifts();
    var { sha256, timingSafeEqual } = require_webcrypto();
    async function run(event, now) {
      const db = store(event);
      const { blobs } = await db.list({ prefix: "bookings/" });
      let sent = 0, checked = 0;
      for (const b of blobs) {
        const booking = await db.get(b.key, { type: "json" });
        if (!booking || !Array.isArray(booking.items)) continue;
        const due = booking.items.some((it) => it.kind === "gift" && (it.gifts || []).some((g) => isDue(g, now)));
        if (!due) continue;
        checked++;
        if (await sendDueGifts(booking, process.env, now)) {
          await db.setJSON(b.key, booking);
          sent += booking.items.reduce((n, it) => n + (it.gifts || []).filter((g) => g.status === "sent").length, 0);
        }
      }
      return { bookingsWithDueGifts: checked };
    }
    async function authorized(event) {
      const expected = (process.env.CRON_SECRET || "").trim();
      if (expected.length < 16) return false;
      const given = String(event.headers && event.headers["x-cron-secret"] || "");
      return timingSafeEqual(await sha256(given), await sha256(expected));
    }
    exports.handler = async (event) => {
      if (!await authorized(event)) return { statusCode: 401, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Not allowed" }) };
      try {
        const r = await run(event);
        return { statusCode: 200, body: JSON.stringify(r) };
      } catch (err) {
        console.error("send-gifts failed:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "send-gifts failed" }) };
      }
    };
    exports._run = run;
  }
});

// ../cf/src/functions/gift-code.js
var require_gift_code = __commonJS({
  "../cf/src/functions/gift-code.js"(exports) {
    var { store } = require_store();
    var { lookup, emptyReason, expiringLeft } = require_giftcodes();
    var { sha256, toHex } = require_webcrypto();
    var MAX_FAILS = 20;
    var WINDOW_MS = 15 * 60 * 1e3;
    var json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
    async function limiter(event, db) {
      const h = event.headers || {};
      const ip = String(h["cf-connecting-ip"] || h["x-forwarded-for"] || "unknown").split(",")[0].trim();
      const key = "giftcheck/" + toHex(await sha256(ip)).slice(0, 24);
      const now = Date.now();
      let rec = await db.get(key) || { count: 0, first: now };
      if (now - rec.first > WINDOW_MS) rec = { count: 0, first: now };
      return { key, rec, blocked: rec.count >= MAX_FAILS };
    }
    exports.handler = async (event) => {
      if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch (e) {
        return json(400, { error: "Bad request" });
      }
      const db = store(event);
      const lim = await limiter(event, db);
      if (lim.blocked) return json(429, { error: "Too many tries. Please wait 15 minutes, or email seasculptclub@gmail.com." });
      const r = await lookup(db, body.code, body.email);
      if (r.error) {
        if (!r.code) {
          lim.rec.count += 1;
          await db.setJSON(lim.key, lim.rec);
        }
        return json(r.code ? 403 : 404, { error: r.error });
      }
      if (r.usable < 1) return json(409, { error: emptyReason(r.rec), code: r.code, creditsLeft: 0, credits: r.rec.credits });
      return json(200, {
        ok: true,
        code: r.code,
        kind: r.rec.kind || "gift",
        creditsLeft: r.available,
        usableNow: r.usable,
        credits: r.rec.credits,
        perBooking: r.rec.maxPerBooking || null,
        expiring: expiringLeft(r.rec)
      });
    };
  }
});

// ../cf/src/cloudflare/api.js
var createCheckout = __toESM(require_create_checkout());
var stripeWebhook = __toESM(require_stripe_webhook());
var adminBookings = __toESM(require_admin_bookings());
var getPosts = __toESM(require_get_posts());
var form = __toESM(require_form());
var sendGifts = __toESM(require_send_gifts());
var giftCode = __toESM(require_gift_code());
var HANDLERS = {
  "create-checkout": createCheckout.handler,
  "stripe-webhook": stripeWebhook.handler,
  "admin-bookings": adminBookings.handler,
  "get-posts": getPosts.handler,
  "form": form.handler,
  "send-gifts": sendGifts.handler,
  "gift-code": giftCode.handler
};
function useEnv(env) {
  if (!globalThis.process) globalThis.process = { env: {} };
  if (!globalThis.process.env) globalThis.process.env = {};
  for (const [k, v] of Object.entries(env || {})) if (typeof v === "string") globalThis.process.env[k] = v;
  globalThis.__SSC_DB = env && env.DB;
}
async function onRequest(context) {
  const { request, env, params } = context;
  const name = [].concat(params.path || []).join("/");
  const handler8 = HANDLERS[name];
  if (!handler8) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  useEnv(env);
  const url = new URL(request.url);
  const headers = {};
  request.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });
  const event = {
    httpMethod: request.method,
    headers,
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: request.method === "GET" || request.method === "HEAD" ? "" : await request.text(),
    isBase64Encoded: false,
    path: url.pathname,
    db: env && env.DB
  };
  let r;
  try {
    r = await handler8(event);
  } catch (err) {
    console.error(`/api/${name} failed:`, err && (err.stack || err.message || err));
    const msg = /Database not connected/.test(String(err && err.message)) ? err.message : "Something went wrong. Please try again.";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
  const status = r && r.statusCode || 200;
  const body = status === 204 || status === 304 ? null : r && r.body || "";
  return new Response(body, { status, headers: r && r.headers || {} });
}
export {
  onRequest
};
