/* Sea Sculpt Club – Classes page cart + on-site Stripe checkout.
   Prices here are for display only. Stripe charges the Price IDs mapped in the server catalog
   (netlify/functions source: lib/catalog.js). Keep ids, names and amounts in sync with it. */
(function () {
  var CATALOG = {
    "pumpkins-oct18": { kind: "class", date: "2026-10-18", name: "Pumpkins & Pilates", detail: "Sun, Oct 18 · 10:00 AM · Annie's Orchard, Cream Ridge, NJ", amount: 2500 },
    "wave-oct23":     { kind: "class", date: "2026-10-23", name: "Wave Sculpt", detail: "Fri, Oct 23 · 8:00 AM · Indoors at Wave Resort, Long Branch, NJ", amount: 3500 },
    "spooky-oct30":   { kind: "class", date: "2026-10-30", name: "Spooky Sculpt", detail: "Fri, Oct 30 · 6:00 PM · Monmouth Flow, Shrewsbury, NJ · Wear your costume!", amount: 3500 },
    "seaview-nov4":   { kind: "class", date: "2026-11-04", name: "Seaview Sculpt", detail: "Wed, Nov 4 · 10:00 AM · McLoone's Pier House, Long Branch, NJ", amount: 3500 },
    "wave-nov14":     { kind: "class", date: "2026-11-14", name: "Wave Sculpt: Ocean View Pilates", detail: "Sat, Nov 14 · 10:00 AM · High Crest at Wave Resort, Long Branch, NJ", amount: 3500 },
    "friendsgiving-nov21": { kind: "class", date: "2026-11-21", name: "Friendsgiving Pilates & Brunch", detail: "Sat, Nov 21 · 10:00 AM · High Crest at Wave Resort, Long Branch, NJ · Complimentary Bellini", amount: 3500 },
    "seaview-nov18":  { kind: "class", date: "2026-11-18", name: "Seaview Sculpt", detail: "Wed, Nov 18 · 10:00 AM · McLoone's Pier House, Long Branch, NJ", amount: 3500 },
    // Not bookable online until a Stripe Price ID is added for it in the server catalog.
    "single":         { kind: "pack", name: "Single Class", detail: "One class", amount: 3500 },
    "pack-3":         { kind: "pack", name: "3-Class Pack", detail: "$30/class · No expiration", amount: 9000 },
    "pack-4":         { kind: "pack", name: "4-Class Pack", detail: "$27.50/class · No expiration", amount: 11000 },
    "intro-bogo":     { kind: "pack", name: "BOGO 50% Off", detail: "New members · 2 classes · extra class expires in 21 days", amount: 5000, maxQty: 1 },
    "gift-1":         { kind: "gift", name: "eGift Card · 1 Class", detail: "A class for someone special", amount: 3500 },
    "gift-2":         { kind: "gift", name: "eGift Card · 2 Classes", detail: "Two classes for someone special", amount: 5000 }
  };
  var DETAILS_KEY = "seaSculptDetails";
  // Payment form look, as configured in Stripe Checkout Studio.
  var APPEARANCE = {
    theme: "stripe", labels: "auto", inputs: "spaced",
    variables: {
      borderRadius: "4px", colorBackground: "#ffffff", colorDanger: "#df1b41", colorPrimary: "#00c7fc",
      colorSuccess: "#00c853", colorText: "#30313d", fontFamily: "default", fontSizeBase: "16px", spacingUnit: "4px"
    }
  };
  var KEY = "seaSculptCart";
  var MAX_QTY = 10;

  function track(name, params) { if (typeof gtag === "function") gtag("event", name, params); }
  function money(c) { return "$" + (c / 100).toFixed(c % 100 ? 2 : 0); }
  function load() {
    try { var c = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(c) ? c.filter(function (i) { var it = CATALOG[i.id]; return it && !(it.date && window.SEA_SCULPT_TODAY && it.date < window.SEA_SCULPT_TODAY); }) : []; }
    catch (e) { return []; }
  }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }
  var cart = load();
  function total() { return cart.reduce(function (s, i) { return s + CATALOG[i.id].amount * i.qty; }, 0); }
  function count() { return cart.reduce(function (s, i) { return s + i.qty; }, 0); }
  function gaItems(list) { return list.map(function (i) { return { item_id: i.id, item_name: CATALOG[i.id].name, price: CATALOG[i.id].amount / 100, quantity: i.qty }; }); }

  /* ---------- UI shell ---------- */
  var shell = document.createElement("div");
  shell.innerHTML =
        '<div class="cart-toast" role="status" aria-live="polite"></div>' +
    '<div class="cart-scrim" hidden></div>' +
    '<aside class="cart-drawer" aria-label="Your cart" aria-hidden="true">' +
      '<div class="cart-head"><h2>Your Cart</h2><button type="button" class="cart-x" aria-label="Close cart">&times;</button></div>' +
      '<div class="cart-body"></div>' +
      '<form class="cart-details" hidden novalidate>' +
        '<button type="button" class="cart-back">&larr; Back to cart</button>' +
        '<h3>Your details</h3>' +
        '<label>Full name<input name="name" autocomplete="name" required maxlength="100"></label>' +
        '<label>Email<input name="email" type="email" autocomplete="email" required maxlength="200"></label>' +
        '<label>Phone<input name="phone" type="tel" autocomplete="tel" required maxlength="30"></label>' +
        '<div class="cart-attendees"></div>' +
        '<div class="cart-code" hidden>' +
          '<label for="cartGiftCode">Have an eGift or class code?</label>' +
          '<div class="cart-code-row"><input id="cartGiftCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="SSC-XXXX-XXXX">' +
          '<button type="button" class="cart-code-apply">Apply</button></div>' +
          '<p class="cart-code-msg" role="status" aria-live="polite"></p>' +
        '</div>' +
        '<p class="cart-details-error" role="alert"></p>' +
      '</form>' +
      '<div class="cart-foot">' +
        '<div class="cart-credit" hidden><span></span><strong></strong></div>' +
        '<div class="cart-total"><span>Subtotal</span><strong></strong></div>' +
        '<p class="cart-msg" role="alert"></p>' +
        '<button type="button" class="cl-btn cl-btn-fill cart-checkout">Checkout</button>' +
        '<p class="cart-fine">Secure payment by Stripe. A receipt is emailed to you after checkout.</p>' +
      '</div>' +
    '</aside>' +
    '<dialog class="cart-pay" aria-label="Checkout">' +
      '<button type="button" class="cart-x cart-pay-x" aria-label="Close checkout">&times;</button>' +
      '<div id="cartCheckout"></div>' +
      '<p class="cart-pay-error" role="alert"></p>' +
      '<p class="cart-pay-alt">Having trouble? <button type="button" class="cart-hosted">Continue to secure checkout &rarr;</button></p>' +
    '</dialog>';
  document.body.appendChild(shell);

  var fab = document.createElement("button");
  fab.type = "button"; fab.className = "cart-btn"; fab.setAttribute("aria-label", "Open cart");
  fab.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><b class="cart-count">0</b>';
  var navWrap = document.querySelector(".nav-cta-wrap");
  if (navWrap) { var bookBtn = navWrap.querySelector(".btn"); navWrap.insertBefore(fab, bookBtn ? bookBtn.nextSibling : navWrap.firstChild); }
  else { fab.classList.add("cart-btn-float"); document.body.appendChild(fab); }
  var countEl = fab.querySelector(".cart-count");
  var drawer = shell.querySelector(".cart-drawer"), scrim = shell.querySelector(".cart-scrim");
  var body = shell.querySelector(".cart-body"), totalEl = shell.querySelector(".cart-total strong");
  var msg = shell.querySelector(".cart-msg"), checkoutBtn = shell.querySelector(".cart-checkout");
  var toast = shell.querySelector(".cart-toast"), pay = shell.querySelector(".cart-pay");
  var embedded = null, toastTimer = null;
  var details = shell.querySelector(".cart-details"), attendeesEl = shell.querySelector(".cart-attendees");
  var detailsErr = shell.querySelector(".cart-details-error");
  var step = "cart";
  // Note: form.name is the form's own name attribute, so fields are looked up explicitly.
  var codeBox = shell.querySelector(".cart-code"), codeInput = shell.querySelector("#cartGiftCode");
  var codeBtn = shell.querySelector(".cart-code-apply"), codeMsg = shell.querySelector(".cart-code-msg");
  var creditEl = shell.querySelector(".cart-credit"), totalLabel = shell.querySelector(".cart-total span");
  var giftState = null; // { code, creditsLeft } once a valid eGift code is applied
  var F = { name: details.querySelector('input[name="name"]'), email: details.querySelector('input[name="email"]'), phone: details.querySelector('input[name="phone"]') };

  // Same rule as the server: each eGift credit covers one class spot, most expensive spots first.
  function coverage() {
    if (!giftState) return { n: 0, value: 0 };
    var spots = [];
    cart.forEach(function (l) { var it = CATALOG[l.id]; if (it.kind === "class") for (var i = 0; i < l.qty; i++) spots.push(it.amount); });
    spots.sort(function (a, b) { return b - a; });
    var n = Math.min(giftState.creditsLeft, spots.length), v = 0;
    for (var i = 0; i < n; i++) v += spots[i];
    return { n: n, value: v };
  }
  function hasClass() { return cart.some(function (l) { return CATALOG[l.id].kind === "class"; }); }
  function render() {
    countEl.textContent = count();
    fab.classList.toggle("has-items", count() > 0);
    if (!cart.length) {
      body.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    } else {
      body.innerHTML = cart.map(function (i) {
        var p = CATALOG[i.id], cap = p.maxQty || MAX_QTY;
        return '<div class="cart-line" data-id="' + i.id + '">' +
          '<div class="cart-line-info"><strong>' + p.name + '</strong><span>' + p.detail + '</span>' +
            '<button type="button" class="cart-remove">Remove</button></div>' +
          '<div class="cart-line-side"><span class="cart-price">' + money(p.amount * i.qty) + '</span>' +
            (cap > 1 ? '<div class="cart-qty"><button type="button" class="cart-dec" aria-label="One fewer">&minus;</button><span>' + i.qty +
              '</span><button type="button" class="cart-inc" aria-label="One more"' + (i.qty >= cap ? " disabled" : "") + '>+</button></div>' : '') +
          '</div></div>';
      }).join("");
    }
    if (giftState && !hasClass()) { giftState = null; codeMsg.textContent = ""; }
    var cov = coverage();
    creditEl.hidden = !cov.n;
    if (cov.n) {
      creditEl.querySelector("span").textContent = (giftState.kind === "pack" ? "Class code (" : "eGift (") + cov.n + (cov.n === 1 ? " class spot)" : " class spots)");
      creditEl.querySelector("strong").textContent = "−" + money(cov.value);
    }
    totalLabel.textContent = cov.n ? "Total" : "Subtotal";
    totalEl.textContent = money(total() - cov.value);
    if (step === "details") checkoutBtn.textContent = cov.n && total() - cov.value === 0 ? (giftState.kind === "pack" ? "Book with code" : "Book with eGift") : "Continue to payment";
    checkoutBtn.disabled = !cart.length;
    msg.textContent = "";
    if (!cart.length && step === "details") showStep("cart");
  }

  /* ---------- details step: purchaser + a name for every class spot ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function loadDetails() { try { return JSON.parse(sessionStorage.getItem(DETAILS_KEY) || "{}"); } catch (e) { return {}; } }
  function saveDetails(d) { try { sessionStorage.setItem(DETAILS_KEY, JSON.stringify(d)); } catch (e) {} }
  function readDetails() {
    var d = { purchaser: { name: F.name.value.trim(), email: F.email.value.trim(), phone: F.phone.value.trim() }, attendees: {}, gifts: {} };
    attendeesEl.querySelectorAll("input[data-line]").forEach(function (inp) {
      var id = inp.getAttribute("data-line");
      (d.attendees[id] = d.attendees[id] || [])[+inp.getAttribute("data-spot")] = inp.value.trim();
    });
    attendeesEl.querySelectorAll("fieldset[data-gift]").forEach(function (fs) {
      var id = fs.getAttribute("data-gift"), n = +fs.getAttribute("data-n");
      var when = fs.querySelector('input[type="radio"]:checked');
      (d.gifts[id] = d.gifts[id] || [])[n] = {
        toName: fs.querySelector('[data-g="toName"]').value.trim(),
        toEmail: fs.querySelector('[data-g="toEmail"]').value.trim(),
        message: fs.querySelector('[data-g="message"]').value.trim(),
        send: when && when.value === "date" ? "date" : "now",
        sendOn: fs.querySelector('[data-g="sendOn"]').value
      };
    });
    return d;
  }
  function buildDetails() {
    var saved = loadDetails(), p = saved.purchaser || {};
    F.name.value = p.name || ""; F.email.value = p.email || ""; F.phone.value = p.phone || "";
    var html = "";
    cart.forEach(function (line) {
      var item = CATALOG[line.id];
      if (item.kind !== "class") return;
      var prev = (saved.attendees && saved.attendees[line.id]) || [];
      html += '<fieldset><legend>' + esc(item.name) + '<span>' + esc(item.detail) + ' · ' + line.qty + (line.qty === 1 ? " spot" : " spots") + '</span></legend>';
      for (var n = 0; n < line.qty; n++) {
        html += '<label>' + (n === 0 ? "Spot 1 name" : "Spot " + (n + 1) + " name (guest)") +
          '<input data-line="' + line.id + '" data-spot="' + n + '" maxlength="80" required value="' + esc(prev[n] || (n === 0 ? p.name || "" : "")) + '"' +
          (n === 0 ? ' data-follow="1"' : "") + '></label>';
      }
      html += '</fieldset>';
    });
    var gh = "", today = window.SEA_SCULPT_TODAY || new Date().toISOString().slice(0, 10);
    var maxD = new Date(today + "T12:00:00Z"); maxD.setUTCDate(maxD.getUTCDate() + 365); maxD = maxD.toISOString().slice(0, 10);
    var tomorrow = new Date(today + "T12:00:00Z"); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); tomorrow = tomorrow.toISOString().slice(0, 10);
    cart.forEach(function (line) {
      var item = CATALOG[line.id];
      if (item.kind !== "gift") return;
      var prev = (saved.gifts && saved.gifts[line.id]) || [];
      for (var n = 0; n < line.qty; n++) {
        var g = prev[n] || {}, later = g.send === "date", nm = "giftwhen-" + line.id + "-" + n;
        gh += '<fieldset class="cart-gift" data-gift="' + line.id + '" data-n="' + n + '"><legend>' + esc(item.name) +
          '<span>' + (line.qty > 1 ? "Gift " + (n + 1) + " of " + line.qty : "Who it&rsquo;s for") + '</span></legend>' +
          '<label>Recipient&rsquo;s name<input data-g="toName" maxlength="80" required value="' + esc(g.toName || "") + '"></label>' +
          '<label>Recipient&rsquo;s email<input data-g="toEmail" type="email" maxlength="200" required value="' + esc(g.toEmail || "") + '"></label>' +
          '<label>Personal message <em>(optional)</em><textarea data-g="message" maxlength="300" rows="3" placeholder="Happy birthday! Can&rsquo;t wait to sculpt with you.">' + esc(g.message || "") + '</textarea></label>' +
          '<div class="cart-gift-when" role="radiogroup" aria-label="When should we send it?">' +
            '<span class="cart-gift-when-label">When should we send it?</span>' +
            '<label class="cart-radio"><input type="radio" name="' + nm + '" value="now"' + (later ? "" : " checked") + '> Send now</label>' +
            '<label class="cart-radio"><input type="radio" name="' + nm + '" value="date"' + (later ? " checked" : "") + '> Schedule for</label>' +
            '<input data-g="sendOn" type="date" min="' + tomorrow + '" max="' + maxD + '" value="' + esc(g.sendOn || "") + '"' + (later ? "" : " disabled") + ' aria-label="Send date">' +
          '</div>' +
          '<p class="cart-gift-note">We&rsquo;ll email the eGift to them (from 9 AM on a scheduled date) and send you a copy.</p>' +
        '</fieldset>';
      }
    });
    attendeesEl.innerHTML = (html ? '<h3>Who&rsquo;s coming?</h3>' + html : "") + (gh ? '<h3>Gift details</h3>' + gh : "");
    codeBox.hidden = !html; // eGift codes cover class spots
    detailsErr.textContent = "";
  }
  // Spot 1 follows the purchaser's name until it's edited by hand.
  details.addEventListener("change", function (e) {
    if (e.target.type === "radio" && e.target.closest(".cart-gift")) {
      var dateIn = e.target.closest(".cart-gift").querySelector('[data-g="sendOn"]');
      dateIn.disabled = e.target.value !== "date";
      if (!dateIn.disabled) dateIn.focus();
      saveDetails(readDetails());
    }
  });
  details.addEventListener("input", function (e) {
    detailsErr.textContent = "";
    if (e.target.name === "name") {
      attendeesEl.querySelectorAll('input[data-follow="1"]').forEach(function (i) { i.value = e.target.value; });
    } else if (e.target.hasAttribute("data-follow")) {
      e.target.removeAttribute("data-follow");
    }
    saveDetails(readDetails());
  });
  function validateDetails(d) {
    if (d.purchaser.name.length < 2) return ["name", "Please enter your full name."];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.purchaser.email)) return ["email", "Please enter a valid email address."];
    if (d.purchaser.phone.replace(/\D/g, "").length < 10) return ["phone", "Please enter a phone number we can reach you at."];
    var bad = null;
    attendeesEl.querySelectorAll("input[data-line]").forEach(function (i) { if (!bad && i.value.trim().length < 2) bad = i; });
    if (bad) return [bad, "Please enter a name for every spot."];
    var gp = null, today = window.SEA_SCULPT_TODAY || new Date().toISOString().slice(0, 10);
    attendeesEl.querySelectorAll("fieldset[data-gift]").forEach(function (fs) {
      if (gp) return;
      var nm = fs.querySelector('[data-g="toName"]'), em = fs.querySelector('[data-g="toEmail"]'), dt = fs.querySelector('[data-g="sendOn"]');
      var later = fs.querySelector('input[type="radio"][value="date"]').checked;
      if (nm.value.trim().length < 2) gp = [nm, "Please enter who the eGift is for."];
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) gp = [em, "Please enter the recipient's email address."];
      else if (later && (!dt.value || dt.value <= today || (dt.max && dt.value > dt.max))) gp = [dt, "Please choose a send date after today (or choose Send now)."];
    });
    if (gp) return gp;
    return null;
  }
  function showStep(which) {
    step = which;
    var isDetails = which === "details";
    body.hidden = isDetails; details.hidden = !isDetails;
    shell.querySelector(".cart-head h2").textContent = isDetails ? "Checkout" : "Your Cart";
    checkoutBtn.textContent = isDetails ? "Continue to payment" : "Checkout";
    if (isDetails) { buildDetails(); render(); (F.name.value ? details.querySelector("input[data-line]") || F.phone : F.name).focus(); }
  }
  shell.querySelector(".cart-back").addEventListener("click", function () { showStep("cart"); });
  details.addEventListener("submit", function (e) { e.preventDefault(); checkoutBtn.click(); });

  function openDrawer() { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); scrim.hidden = false; }
  function closeDrawer() { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); scrim.hidden = true; if (step === "details") showStep("cart"); }
  function showToast(text) {
    toast.textContent = text; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  function add(id) {
    var p = CATALOG[id]; if (!p) return;
    if (p.unavailable) { showToast(p.name + " can't be purchased online yet. Email seasculptclub@gmail.com and we'll set it up."); return; }
    var cap = p.maxQty || MAX_QTY;
    var line = cart.filter(function (i) { return i.id === id; })[0];
    if (line) {
      if (line.qty >= cap) { showToast(cap === 1 ? "The new member offer is limited to one per person." : "That's the most you can add at once."); return; }
      line.qty++;
    } else { cart.push({ id: id, qty: 1 }); }
    save(cart); render();
    showToast(p.name + " added to your cart");
    track("add_to_cart", { currency: "USD", value: p.amount / 100, items: gaItems([{ id: id, qty: 1 }]) });
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var addBtn = e.target.closest("[data-add]");
    if (addBtn) {
      var id = addBtn.getAttribute("data-add");
      if (id === "select") {
        var sel = addBtn.closest(".cl-buy").querySelector("select");
        id = sel && sel.value;
        if (!id) {
          if (sel) { sel.classList.add("cl-date-needed"); sel.focus(); }
          showToast("Please choose a date first");
          return;
        }
        sel.classList.remove("cl-date-needed");
      }
      var dlg = addBtn.closest("dialog[open]");
      if (dlg && !dlg.classList.contains("cart-pay")) dlg.close();
      add(id);
      return;
    }
    var line = e.target.closest(".cart-line");
    if (line) {
      var item = cart.filter(function (i) { return i.id === line.getAttribute("data-id"); })[0];
      if (!item) return;
      if (e.target.closest(".cart-remove")) cart = cart.filter(function (i) { return i !== item; });
      else if (e.target.closest(".cart-inc")) item.qty = Math.min(item.qty + 1, CATALOG[item.id].maxQty || MAX_QTY);
      else if (e.target.closest(".cart-dec")) { item.qty--; if (item.qty < 1) cart = cart.filter(function (i) { return i !== item; }); }
      else return;
      save(cart); render();
    }
  });
  fab.addEventListener("click", openDrawer);
  scrim.addEventListener("click", closeDrawer);
  shell.querySelector(".cart-drawer .cart-x").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer(); });

  /* ---------- eGift code ---------- */
  function applyCode() {
    var code = codeInput.value.trim();
    if (!code) { codeMsg.textContent = "Enter the code from your email."; codeInput.focus(); return; }
    codeBtn.disabled = true; codeMsg.className = "cart-code-msg"; codeMsg.textContent = "Checking…";
    fetch("/api/gift-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code, email: F.email.value.trim() }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok) { giftState = null; codeMsg.className = "cart-code-msg is-bad"; codeMsg.textContent = x.d.error || "That code didn't work."; render(); return; }
        giftState = { code: x.d.code, creditsLeft: x.d.usableNow != null ? x.d.usableNow : x.d.creditsLeft, total: x.d.creditsLeft, kind: x.d.kind, expiring: x.d.expiring };
        codeInput.value = x.d.code;
        render();
        var cov = coverage();
        codeMsg.className = "cart-code-msg is-good";
        codeMsg.innerHTML = "&#10003; " + esc(x.d.code) + " covers " + cov.n + (cov.n === 1 ? " class spot" : " class spots") +
          (x.d.creditsLeft > cov.n ? " (" + (x.d.creditsLeft - cov.n) + " left for next time" + (x.d.perBooking ? ", " + x.d.perBooking + " per booking" : "") + ")" : "") +
          (x.d.expiring ? ". Book your extra class by " + new Date(x.d.expiring.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric" }) + "." : "") +
          ' <button type="button" class="cart-code-remove">Remove</button>';
        track("redeem_egift", { credits: cov.n });
      })
      .catch(function () { codeMsg.className = "cart-code-msg is-bad"; codeMsg.textContent = "Couldn't check the code right now. Please try again."; })
      .then(function () { codeBtn.disabled = false; });
  }
  codeBtn.addEventListener("click", applyCode);
  codeInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); applyCode(); } });
  codeMsg.addEventListener("click", function (e) {
    if (!e.target.closest(".cart-code-remove")) return;
    giftState = null; codeInput.value = ""; codeMsg.textContent = ""; render(); codeInput.focus();
  });

  /* ---------- checkout ---------- */
  function loadStripe() {
    return new Promise(function (resolve, reject) {
      if (window.Stripe) return resolve();
      var s = document.createElement("script");
      // Stripe.js must load directly from Stripe (dahlia build is required for the Checkout form).
      s.src = "https://js.stripe.com/dahlia/stripe.js";
      s.onload = resolve;
      s.onerror = reject;
      setTimeout(function () { reject(new Error("stripe_js_timeout")); }, 12000);
      document.head.appendChild(s);
    });
  }
  function closePay() {
    if (embedded) { try { embedded.unmount ? embedded.unmount() : embedded.destroy(); } catch (e) {} embedded = null; }
    var pe = pay.querySelector(".cart-pay-error"); if (pe) pe.textContent = "";
    if (pay.open) pay.close();
  }
  shell.querySelector(".cart-pay-x").addEventListener("click", closePay);
  pay.addEventListener("cancel", function (e) { e.preventDefault(); closePay(); });

  var currentDetails = { purchaser: {}, attendees: {}, gifts: {} };
  function requestSession(mode) {
    return fetch("/api/create-checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, mode: mode, purchaser: currentDetails.purchaser, attendees: currentDetails.attendees, gifts: currentDetails.gifts || {}, giftCode: giftState ? giftState.code : undefined })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) {
          var code = d.code || (r.status === 404 ? "function_not_deployed" : "http_" + r.status);
          var er = new Error(d.error || "Checkout isn't available right now."); er.friendly = true; er.server = true; er.code = code;
          if (window.console) console.warn("Checkout error:", code, d.detail || "");
          throw er;
        }
        return d;
      });
    }, function () { var er = new Error("Checkout isn't available right now."); er.friendly = true; er.server = true; er.code = "network"; throw er; });
  }
  function rememberPending() {
    try { localStorage.setItem(KEY + "Pending", JSON.stringify({ items: cart, value: total() })); } catch (e) {}
  }
  function showError(err) {
    var code = (err && err.code) || "stripe_js";
    msg.textContent = (err && err.friendly ? err.message : "Checkout couldn't start. Please try again in a moment.") +
      " You can also email seasculptclub@gmail.com to book. (" + code + ")";
  }
  // Backup: Stripe's own secure payment page. Used from the link in the payment window,
  // or automatically if the on-site payment form can't load in this browser.
  function goHosted() {
    checkoutBtn.disabled = true; checkoutBtn.textContent = "Opening secure checkout…";
    var alt = pay.querySelector(".cart-hosted"); if (alt) alt.disabled = true;
    return requestSession("hosted").then(function (d) {
      if (d.free) { closePay(); bookedWithGift(d); return; }
      if (!d.url) { var er = new Error("Checkout isn't available right now."); er.friendly = true; er.code = "no_url"; throw er; }
      rememberPending();
      window.location.href = d.url;
      return new Promise(function () {});
    }).catch(function (err) {
      closePay(); openDrawer(); showError(err);
      checkoutBtn.disabled = !cart.length; checkoutBtn.textContent = step === "details" ? "Continue to payment" : "Checkout";
      if (alt) alt.disabled = false;
    });
  }
  pay.querySelector(".cart-hosted").addEventListener("click", goHosted);

  checkoutBtn.addEventListener("click", function () {
    if (!cart.length) return;
    msg.textContent = "";
    if (step !== "details") { showStep("details"); return; }
    var d = readDetails(), problem = validateDetails(d);
    if (problem) {
      detailsErr.textContent = problem[1];
      var field = typeof problem[0] === "string" ? F[problem[0]] : problem[0];
      if (field && field.focus) field.focus();
      return;
    }
    detailsErr.textContent = "";
    currentDetails = d; saveDetails(d);
    checkoutBtn.disabled = true; checkoutBtn.textContent = "Loading…";
    track("begin_checkout", { currency: "USD", value: total() / 100, items: gaItems(cart) });
    requestSession("embedded")
      .then(function (d) {
        if (d.free) { bookedWithGift(d); return; }
        return loadStripe().then(function () {
          var stripe = window.Stripe(d.publishableKey, { betas: ["custom_checkout_payment_form_1"] });
          if (typeof stripe.initCheckoutFormSdk !== "function") throw new Error("checkout_form_unavailable");
          var checkout = stripe.initCheckoutFormSdk({ clientSecret: Promise.resolve(d.clientSecret), appearance: APPEARANCE });
          var form = checkout.createForm({ layout: "expanded" });
          rememberPending();
          closeDrawer(); pay.showModal();
          embedded = form; form.mount("#cartCheckout");
          checkoutBtn.disabled = !cart.length; checkoutBtn.textContent = "Checkout";
          return checkout.loadActions().then(function (result) {
            if (result.type !== "success") throw new Error("checkout_actions_failed");
            form.on("confirm", function (event) {
              var pe = pay.querySelector(".cart-pay-error"); pe.textContent = "";
              // On success Stripe sends the customer back to the Classes page (return_url).
              Promise.resolve(result.actions.confirm({ formConfirmEvent: event })).then(function (r) {
                if (r && r.type === "error" && r.error) pe.textContent = r.error.message || "Payment didn't go through. Please check your details and try again.";
              }).catch(function (error) {
                if (window.console) console.error("Payment confirmation error:", error);
                pe.textContent = "Payment didn't go through. Please check your details and try again.";
              });
            });
          });
        });
      })
      .catch(function (err) {
        if (err && err.code === "gift_invalid") {
          closePay(); openDrawer(); if (step !== "details") showStep("details");
          giftState = null; codeMsg.className = "cart-code-msg is-bad"; codeMsg.textContent = err.message; render();
          checkoutBtn.disabled = !cart.length; codeInput.focus();
        } else if (err && (err.code === "invalid_details" || err.code === "price_not_configured")) {
          // Something the customer can fix (or an item not bookable online): stay on the details step.
          closePay(); openDrawer(); if (step !== "details") showStep("details");
          detailsErr.textContent = err.message;
          checkoutBtn.disabled = !cart.length; checkoutBtn.textContent = "Continue to payment";
        } else if (err && (err.code === "keys_missing" || err.code === "key_mode_mismatch")) {
          closePay(); openDrawer(); showError(err);
          checkoutBtn.disabled = !cart.length; checkoutBtn.textContent = "Continue to payment";
        } else {
          // The on-site form couldn't start: send the customer to Stripe's secure page instead.
          if (window.console) console.warn("On-site checkout unavailable, using Stripe page:", err);
          closePay();
          goHosted();
        }
      });
  });

  function showThanks(text) {
    var note = document.createElement("div");
    note.className = "cart-thanks"; note.setAttribute("role", "status");
    note.innerHTML = '<div><strong>You&rsquo;re booked &mdash; thank you!</strong> ' + text + '</div>' +
      '<button type="button" aria-label="Dismiss">&times;</button>';
    note.querySelector("button").addEventListener("click", function () { note.remove(); });
    document.body.appendChild(note);
  }
  // Everything was covered by an eGift: booked without payment.
  function bookedWithGift(d) {
    track("purchase", { transaction_id: d.ref, currency: "USD", value: 0, coupon: "egift", items: gaItems(cart) });
    cart = []; save(cart); giftState = null; codeInput.value = ""; codeMsg.textContent = "";
    try { sessionStorage.removeItem(DETAILS_KEY); } catch (e) {}
    closeDrawer(); render();
    checkoutBtn.textContent = "Checkout";
    showThanks("Your code covered it. Your confirmation (ref " + esc(d.ref || "") + ") is on its way to your email.");
  }

  /* ---------- return from a completed payment ---------- */
  var q = new URLSearchParams(location.search);
  if (q.get("checkout") === "complete") {
    var pending = null;
    try { pending = JSON.parse(localStorage.getItem(KEY + "Pending") || "null"); localStorage.removeItem(KEY + "Pending"); } catch (e) {}
    if (pending) {
      track("purchase", { transaction_id: q.get("session_id") || undefined, currency: "USD", value: pending.value / 100, items: gaItems(pending.items) });
    }
    cart = []; save(cart);
    try { sessionStorage.removeItem(DETAILS_KEY); } catch (e) {}
    showThanks("Your booking confirmation and receipt are on their way to your email.");
    history.replaceState(null, "", location.pathname + location.hash);
  }

  render();
})();
