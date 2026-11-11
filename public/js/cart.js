/* Sea Sculpt Club – Classes page cart + on-site Stripe checkout.
   Prices here are for display only. Stripe charges the Price IDs mapped in the server catalog
   (netlify/functions source: lib/catalog.js). Keep ids, names and amounts in sync with it. */
(function () {
  var TODAY_ET = (function () { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } })();
  var CATALOG = {
    "pumpkins-oct18": { kind: "class", date: "2026-10-18", name: "Pumpkins & Pilates", detail: "Sun, Oct 18 · 10:00 AM · Annie's Orchard, Cream Ridge, NJ", amount: 2500 },
    "wave-oct23":     { kind: "class", date: "2026-10-23", name: "Wave Sculpt", detail: "Fri, Oct 23 · 8:00 AM · Indoors at Wave Resort, Long Branch, NJ", amount: 3500 },
    "spooky-oct30":   { kind: "class", date: "2026-10-30", name: "Spooky Sculpt", detail: "Fri, Oct 30 · 6:00 PM · Monmouth Flow, Shrewsbury, NJ · Wear your costume!", amount: 3500 },
    "seaview-nov4":   { kind: "class", date: "2026-11-04", name: "Seaview Sculpt", detail: "Wed, Nov 4 · 10:00 AM · McLoone's Pier House, Long Branch, NJ", amount: 3500 },
    "wave-nov14":     { kind: "class", date: "2026-11-14", name: "Wave Sculpt: Ocean View Pilates", detail: "Sat, Nov 14 · 10:00 AM · High Crest at Wave Resort, Long Branch, NJ", amount: 3500 },
    "friendsgiving-nov21": { kind: "class", date: "2026-11-21", name: "Friendsgiving Pilates & Brunch", detail: "Sat, Nov 21 · 10:00 AM · High Crest at Wave Resort, Long Branch, NJ · Complimentary Bellini", amount: 3500 },
    "santa-dec5":     { kind: "class", date: "2026-12-05", name: "Santa Sculpt: A Christmas Party", detail: "Sat, Dec 5 · 12:00–2:00 PM · Tim McLoone's Supper Club, Asbury Park, NJ" + (TODAY_ET <= "2026-11-21" ? " · Early bird: code SANTA5 for $40 until Nov 21" : ""), amount: 4500 },
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
        '<div class="cart-step-account">' +
          '<h3>Your account</h3>' +
          '<p class="cart-step-note cart-signed-in" hidden></p>' +
          '<label>Full name<input name="name" autocomplete="name" required maxlength="100"></label>' +
          '<label>Email<input name="email" type="email" autocomplete="email" required maxlength="200"></label>' +
          '<label>Phone<input name="phone" type="tel" autocomplete="tel" required maxlength="30"></label>' +
          '<p class="cart-step-note">We&rsquo;ll set up your Sea Sculpt Club account with this email, so you can see your bookings and classes left anytime. Already have one? Just use the same email.</p>' +
        '</div>' +
        '<div class="cart-step-details">' +
        '<p class="cart-who-line"></p>' +
        '<div class="cart-attendees"></div>' +
        '<div class="cart-intake">' +
          '<div class="cart-intake-class">' +
            '<h3>Before you pay</h3>' +
            '<label class="cart-check"><input type="checkbox" name="waiver"> <span>I have read and agree to the <a href="/waiver" target="_blank" rel="noopener">Liability Waiver &amp; Release</a>, for myself and everyone in my booking.</span></label>' +
            '<label class="cart-check"><input type="checkbox" name="cancelPolicy"> <span>I understand the <a href="/terms#cancellations" target="_blank" rel="noopener">cancellation policy</a>: refunds are available up to 12 hours before class, with no refunds less than 12 hours before class. If weather cancels a class, I can choose a credit toward the next class or a refund.</span></label>' +
          '</div>' +
        '</div>' +
        '<div class="cart-code" hidden>' +
          '<label for="cartGiftCode">Have a promo code, eGift or class pack code?</label>' +
          '<div class="cart-code-row"><input id="cartGiftCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="Promo or SSC-XXXX-XXXX code">' +
          '<button type="button" class="cart-code-apply">Apply</button></div>' +
          '<p class="cart-code-msg" role="status" aria-live="polite"></p>' +
        '</div>' +
        '</div>' +
        '<p class="cart-details-error" role="alert"></p>' +
      '</form>' +
      '<div class="cart-foot">' +
        '<div class="cart-credit" hidden><span></span><strong></strong></div>' +
        '<div class="cart-total"><span>Subtotal</span><strong></strong></div>' +
        '<p class="cart-msg" role="alert"></p>' +
        '<button type="button" class="cl-btn cl-btn-fill cart-checkout">Checkout</button>' +
        '<div class="cart-paypal" hidden><div class="cart-or"><span>or</span></div><div class="cart-paypal-btns"></div><p class="cart-paypal-note" role="status" aria-live="polite"></p></div>' +
        '<p class="cart-fine">Secure payment by Stripe. A receipt is emailed to you after checkout.</p>' +
      '</div>' +
    '</aside>' +
    '<dialog class="cart-q" aria-labelledby="cartQTitle">' +
      '<form class="cart-q-form" novalidate>' +
        '<p class="cart-q-done">&#10003; You&rsquo;re all set</p>' +
        '<h2 id="cartQTitle">A few quick questions</h2>' +
        '<p class="cart-q-lead">Your confirmation is on its way to your email. These help us get ready for you.</p>' +
        '<label>How did you hear about us?<select name="qheard"><option value="">Choose one</option>' +
          '<option>Instagram</option><option>TikTok</option><option>Facebook</option><option>Friend or family</option><option>Google search</option>' +
          '<option>Wave Resort or another venue</option><option>Flyer or poster</option><option>Event or pop-up</option><option>Other</option></select></label>' +
        '<label class="cart-q-other" hidden>Tell us more <em>(optional)</em><input name="qheardOther" maxlength="120"></label>' +
        '<div class="cart-q-class">' +
          '<label>Any injuries, health conditions or modifications we should know about? <em>(optional)</em>' +
            '<textarea name="qinjuries" rows="3" maxlength="600" placeholder="For example: lower back pain, pregnancy, recent surgery. Leave blank if none."></textarea></label>' +
          '<fieldset class="cart-photo"><legend>Photo &amp; video consent<span>We sometimes take photos and videos in class to share on our website and social media.</span></legend>' +
            '<label class="cart-radio"><input type="radio" name="qphoto" value="yes"> Yes, I&rsquo;m happy to be in photos and videos</label>' +
            '<label class="cart-radio"><input type="radio" name="qphoto" value="no"> No, please keep me out of photos and videos</label>' +
          '</fieldset>' +
        '</div>' +
        '<p class="cart-q-msg" role="alert"></p>' +
        '<button type="submit" class="cl-btn cl-btn-navy cart-q-send">Send answers</button>' +
        '<button type="button" class="cart-q-skip">Skip for now</button>' +
      '</form>' +
    '</dialog>' +
    '<dialog class="cart-pay" aria-label="Checkout">' +
      '<button type="button" class="cart-x cart-pay-x" aria-label="Close checkout">&times;</button>' +
      '<div class="cart-code cart-pay-promo" hidden>' +
        '<label for="cartPayPromo">Promo code</label>' +
        '<div class="cart-code-row"><input id="cartPayPromo" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="Enter promo code">' +
        '<button type="button" class="cart-code-apply cart-pay-promo-apply">Apply</button></div>' +
        '<p class="cart-code-msg cart-pay-promo-msg" role="status" aria-live="polite"></p>' +
      '</div>' +
      '<div id="cartCheckout"></div>' +
      '<p class="cart-pay-error" role="alert"></p>' +
      '<p class="cart-pay-alt">Having trouble? <button type="button" class="cart-hosted">Continue to secure checkout &rarr;</button></p>' +
    '</dialog>';
  document.body.appendChild(shell);

  var fab = document.createElement("button");
  fab.type = "button"; fab.className = "cart-btn"; fab.setAttribute("aria-label", "Open cart");
  fab.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><b class="cart-count">0</b>';
  var navWrap = document.querySelector(".nav-cta-wrap");
  if (navWrap) { var btns = navWrap.querySelectorAll(".btn"), bookBtn = btns[btns.length - 1]; navWrap.insertBefore(fab, bookBtn ? bookBtn.nextSibling : navWrap.firstChild); }
  else { fab.classList.add("cart-btn-float"); document.body.appendChild(fab); }
  var countEl = fab.querySelector(".cart-count");
  var drawer = shell.querySelector(".cart-drawer"), scrim = shell.querySelector(".cart-scrim");
  var body = shell.querySelector(".cart-body"), totalEl = shell.querySelector(".cart-total strong");
  var msg = shell.querySelector(".cart-msg"), checkoutBtn = shell.querySelector(".cart-checkout");
  var toast = shell.querySelector(".cart-toast"), pay = shell.querySelector(".cart-pay");
  var embedded = null, toastTimer = null;
  var details = shell.querySelector(".cart-details"), attendeesEl = shell.querySelector(".cart-attendees");
  var detailsErr = shell.querySelector(".cart-details-error");
  var accountPart = shell.querySelector(".cart-step-account"), detailsPart = shell.querySelector(".cart-step-details");
  var signedInNote = shell.querySelector(".cart-signed-in"), whoLine = shell.querySelector(".cart-who-line");
  var step = "cart"; // cart -> account -> details -> payment
  var member = null; // signed-in account { name, email, phone }
  fetch("/api/account/me", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.user) member = { name: d.user.name || "", email: d.user.email || "", phone: d.user.phone || "" }; }).catch(function () {});
  // Note: form.name is the form's own name attribute, so fields are looked up explicitly.
  var codeBox = shell.querySelector(".cart-code"), codeInput = shell.querySelector("#cartGiftCode");
  var codeBtn = shell.querySelector(".cart-code-apply"), codeMsg = shell.querySelector(".cart-code-msg");
  var creditEl = shell.querySelector(".cart-credit"), totalLabel = shell.querySelector(".cart-total span");
  var IN = { waiver: details.querySelector('input[name="waiver"]'), cancelPolicy: details.querySelector('input[name="cancelPolicy"]'),
    classWrap: details.querySelector(".cart-intake-class") };
  var giftState = null; // { code, creditsLeft } once a valid eGift code is applied
  var promoState = null; // { code } for a Stripe promotion code such as SANTA5 (applied on the payment step)
  var F = { name: details.querySelector('input[name="name"]'), email: details.querySelector('input[name="email"]'), phone: details.querySelector('input[name="phone"]') };

  // Same rule as the server: each class on a code covers one class spot, worth up to $35.
  // Premium events cost more, so the customer pays the difference.
  var CREDIT_VALUE = 3500;
  function coverage() {
    if (!giftState) return { n: 0, value: 0, topUp: 0 };
    var spots = [];
    cart.forEach(function (l) { var it = CATALOG[l.id]; if (it.kind === "class" && (!giftState.onlyFor || giftState.onlyFor.indexOf(l.id) >= 0)) for (var i = 0; i < l.qty; i++) spots.push(it.amount); });
    spots.sort(function (a, b) { return b - a; });
    var n = Math.min(giftState.creditsLeft, spots.length), v = 0, t = 0;
    for (var i = 0; i < n; i++) { v += Math.min(spots[i], CREDIT_VALUE); t += Math.max(0, spots[i] - CREDIT_VALUE); }
    return { n: n, value: v, topUp: t };
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
    if (step === "account") checkoutBtn.textContent = "Continue";
    if (step === "details") checkoutBtn.textContent = cov.n && total() - cov.value === 0 ? (giftState.kind === "pack" ? "Book with code" : "Book with eGift") : "Continue to payment";
    renderPaypal(total() - cov.value);
    checkoutBtn.disabled = !cart.length;
    msg.textContent = "";
    if (!cart.length && step !== "cart") showStep("cart");
  }

  /* ---------- details step: purchaser + a name for every class spot ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function loadDetails() { try { return JSON.parse(sessionStorage.getItem(DETAILS_KEY) || "{}"); } catch (e) { return {}; } }
  function saveDetails(d) { try { sessionStorage.setItem(DETAILS_KEY, JSON.stringify(d)); } catch (e) {} }
  function readDetails() {
    var d = { purchaser: { name: F.name.value.trim(), email: F.email.value.trim(), phone: F.phone.value.trim() }, attendees: {}, gifts: {},
      intake: { waiver: IN.waiver.checked, cancelPolicy: IN.cancelPolicy.checked } };
    attendeesEl.querySelectorAll("[data-spotbox]").forEach(function (box) {
      var id = box.getAttribute("data-line"), n = +box.getAttribute("data-spot");
      var me = box.querySelector('input[value="me"]').checked;
      (d.attendees[id] = d.attendees[id] || [])[n] = me ? d.purchaser.name : box.querySelector("input[data-friend]").value.trim();
      (d.who = d.who || {})[id + ":" + n] = me ? "me" : "friend";
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
      var prev = (saved.attendees && saved.attendees[line.id]) || [], who = saved.who || {};
      html += '<fieldset><legend>' + esc(item.name) + '<span>' + esc(item.detail) + ' · ' + line.qty + (line.qty === 1 ? " spot" : " spots") + '</span></legend>';
      for (var n = 0; n < line.qty; n++) {
        var choice = who[line.id + ":" + n] || (n === 0 ? "me" : "friend"), nm = "who-" + line.id + "-" + n;
        var friendName = choice === "friend" ? prev[n] || "" : "";
        html += '<div class="cart-spot" data-spotbox="1" data-line="' + line.id + '" data-spot="' + n + '">' +
          (line.qty > 1 ? '<span class="cart-spot-label">Spot ' + (n + 1) + '</span>' : '') +
          '<div class="cart-spot-pick" role="radiogroup" aria-label="Spot ' + (n + 1) + '">' +
            '<label class="cart-pill"><input type="radio" name="' + nm + '" value="me"' + (choice === "me" ? " checked" : "") + '><span>Me</span></label>' +
            '<label class="cart-pill"><input type="radio" name="' + nm + '" value="friend"' + (choice === "friend" ? " checked" : "") + '><span>Friend</span></label>' +
          '</div>' +
          '<label class="cart-friend"' + (choice === "friend" ? "" : " hidden") + '>Friend&rsquo;s name<input data-friend="1" maxlength="80" value="' + esc(friendName) + '" autocomplete="off"></label>' +
        '</div>';
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
    whoLine.innerHTML = F.name.value ? "Booking as <strong>" + esc(F.name.value) + "</strong> &middot; " + esc(F.email.value) + ' <button type="button" class="cart-edit-account">Edit</button>' : "";
    codeBox.hidden = !html; // eGift codes cover class spots
    // Waiver + cancellation policy before payment (class bookings); the other questions come after payment.
    IN.waiver.checked = false; // agreed fresh at every checkout
    IN.cancelPolicy.checked = false;
    IN.classWrap.hidden = !html;
    detailsErr.textContent = "";
  }
  // Spot 1 follows the purchaser's name until it's edited by hand.
  details.addEventListener("change", function (e) {
    var spot = e.target.closest && e.target.closest("[data-spotbox]");
    if (spot && e.target.type === "radio") {
      var friend = e.target.value === "friend", fl = spot.querySelector(".cart-friend");
      fl.hidden = !friend;
      if (friend) fl.querySelector("input").focus();
      else {
        // Only one "Me" per class: other spots in the same class switch to "A friend".
        attendeesEl.querySelectorAll('[data-spotbox][data-line="' + spot.getAttribute("data-line") + '"]').forEach(function (other) {
          if (other === spot) return;
          var me = other.querySelector('input[value="me"]');
          if (me.checked) { other.querySelector('input[value="friend"]').checked = true; other.querySelector(".cart-friend").hidden = false; }
        });
      }
      saveDetails(readDetails());
      return;
    }
    if (e.target.type === "radio" && e.target.closest(".cart-gift")) {
      var dateIn = e.target.closest(".cart-gift").querySelector('[data-g="sendOn"]');
      dateIn.disabled = e.target.value !== "date";
      if (!dateIn.disabled) dateIn.focus();
      saveDetails(readDetails());
    }
  });
  details.addEventListener("input", function (e) {
    detailsErr.textContent = "";
    saveDetails(readDetails());
  });
  function validateAccount(d) {
    if (d.purchaser.name.length < 2) return ["name", "Please enter your full name."];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.purchaser.email)) return ["email", "Please enter a valid email address."];
    if (d.purchaser.phone.replace(/\D/g, "").length < 10) return ["phone", "Please enter a phone number we can reach you at."];
    return null;
  }
  function validateDetails(d) {
    var acc = validateAccount(d);
    if (acc) { showStep("account"); return acc; }
    var bad = null;
    attendeesEl.querySelectorAll("[data-spotbox]").forEach(function (box) {
      var f = box.querySelector("input[data-friend]");
      if (!bad && box.querySelector('input[value="friend"]').checked && f.value.trim().length < 2) bad = f;
    });
    if (bad) return [bad, "Please enter your friend's name."];
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
    if (hasClass()) {
      if (!d.intake.waiver) return [IN.waiver, "Please agree to the Liability Waiver & Release to book a class."];
      if (!d.intake.cancelPolicy) return [IN.cancelPolicy, "Please confirm you understand the cancellation policy to book a class."];
    }
    return null;
  }
  function fillAccount() {
    var saved = loadDetails(), p = saved.purchaser || {};
    F.name.value = p.name || (member && member.name) || "";
    F.email.value = p.email || (member && member.email) || "";
    F.phone.value = p.phone || (member && member.phone) || "";
    signedInNote.hidden = !member;
    if (member) signedInNote.innerHTML = "Signed in as <strong>" + esc(member.email) + "</strong>";
  }
  function showStep(which) {
    var inForm = which === "account" || which === "details";
    if (which === "details" && step !== "details") { saveDetails(readDetails()); }
    step = which;
    body.hidden = inForm; details.hidden = !inForm;
    accountPart.hidden = which !== "account"; detailsPart.hidden = which !== "details";
    shell.querySelector(".cart-back").innerHTML = which === "details" ? "&larr; Back" : "&larr; Back to cart";
    shell.querySelector(".cart-head h2").textContent = which === "account" || which === "details" ? "Checkout" : "Your Cart";
    checkoutBtn.textContent = which === "account" ? "Continue" : which === "details" ? "Continue to payment" : "Checkout";
    detailsErr.textContent = "";
    if (which === "account") { fillAccount(); render(); checkoutBtn.textContent = "Continue"; (F.name.value ? (F.phone.value ? F.email : F.phone) : F.name).focus(); }
    if (which === "details") { buildDetails(); render(); var first = details.querySelector(".cart-step-details input:not([type=radio]):not([hidden]), .cart-step-details select"); if (first && first.offsetParent) first.focus(); }
  }
  shell.querySelector(".cart-back").addEventListener("click", function () { showStep(step === "details" ? "account" : "cart"); });
  details.addEventListener("click", function (e) { if (e.target.closest(".cart-edit-account")) showStep("account"); });
  details.addEventListener("submit", function (e) { e.preventDefault(); checkoutBtn.click(); });

  function openDrawer() { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); scrim.hidden = false; }
  function closeDrawer() { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); scrim.hidden = true; if (step !== "cart") showStep("cart"); }
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
    // Anything that isn't an SSC- eGift/class code is a promo code (e.g. SANTA5): Stripe checks it at payment.
    if (!/^\s*SSC[-\s]?/i.test(code)) {
      promoState = { code: code.toUpperCase().replace(/[^A-Z0-9_-]/g, "") };
      giftState = null; codeInput.value = promoState.code; render();
      codeMsg.className = "cart-code-msg is-good";
      codeMsg.innerHTML = "&#10003; Promo code " + esc(promoState.code) + " will be applied on the next step, where you'll see your discount." +
        ' <button type="button" class="cart-code-remove">Remove</button>';
      track("apply_promo", { code: promoState.code });
      return;
    }
    promoState = null;
    codeBtn.disabled = true; codeMsg.className = "cart-code-msg"; codeMsg.textContent = "Checking…";
    fetch("/api/gift-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code, email: F.email.value.trim() }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok) { giftState = null; codeMsg.className = "cart-code-msg is-bad"; codeMsg.textContent = x.d.error || "That code didn't work."; render(); return; }
        giftState = { code: x.d.code, creditsLeft: x.d.usableNow != null ? x.d.usableNow : x.d.creditsLeft, total: x.d.creditsLeft, kind: x.d.kind, expiring: x.d.expiring, onlyFor: x.d.onlyFor || null };
        if (giftState.onlyFor && !coverage().n) { var only = (x.d.onlyForNames || []).join(" or "); giftState = null; codeMsg.className = "cart-code-msg is-bad"; codeMsg.textContent = "This code is for " + only + ". Add it to your cart to use your code."; render(); return; }
        codeInput.value = x.d.code;
        render();
        var cov = coverage();
        codeMsg.className = "cart-code-msg is-good";
        codeMsg.innerHTML = "&#10003; " + esc(x.d.code) + " covers " + cov.n + (cov.n === 1 ? " class spot" : " class spots") +
          (x.d.creditsLeft > cov.n ? " (" + (x.d.creditsLeft - cov.n) + " left for next time" + (x.d.perBooking ? ", " + x.d.perBooking + " per booking" : "") + ")" : "") +
          (cov.topUp ? ". Each class on a code is a $35 value, so you'll pay the " + money(cov.topUp) + " premium event difference" : "") +
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
    giftState = null; promoState = null; codeInput.value = ""; codeMsg.textContent = ""; render(); codeInput.focus();
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
  /* ---------- promo code on the payment step (applied through Stripe, e.g. SANTA5) ---------- */
  function setupPayPromo(actions, d) {
    var box = pay.querySelector(".cart-pay-promo"), input = box.querySelector("input"),
        btn = box.querySelector("button"), pm = box.querySelector(".cart-pay-promo-msg");
    pm.className = "cart-code-msg cart-pay-promo-msg"; pm.textContent = ""; input.value = "";
    if (!actions || typeof actions.applyPromotionCode !== "function" || d.promoApplied) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    function showApplied() {
      var s = actions.getSession ? actions.getSession() : null;
      var t = s && s.total && s.total.total ? s.total.total.amount : "";
      var disc = s && s.discountAmounts && s.discountAmounts[0];
      pm.className = "cart-code-msg cart-pay-promo-msg is-good";
      pm.innerHTML = "&#10003; " + esc(disc ? disc.displayName || input.value : input.value) + " applied" +
        (disc && disc.amount ? ": " + esc(disc.amount) + " off" : "") + (t ? ". New total " + esc(t) + "." : ".");
    }
    function apply(code) {
      code = String(code || "").trim().toUpperCase();
      if (!code) { pm.className = "cart-code-msg cart-pay-promo-msg is-bad"; pm.textContent = "Enter your promo code."; return Promise.resolve(); }
      btn.disabled = true; pm.className = "cart-code-msg cart-pay-promo-msg"; pm.textContent = "Applying…";
      return Promise.resolve(actions.applyPromotionCode(code)).then(function (r) {
        if (r && r.type === "error") {
          pm.className = "cart-code-msg cart-pay-promo-msg is-bad";
          pm.textContent = (r.error && r.error.message) || (code + " can't be used with this order.");
          if (promoState && promoState.code === code) promoState = null;
          return;
        }
        input.value = code; showApplied(); track("apply_promo", { code: code, step: "payment" });
      }).catch(function () {
        pm.className = "cart-code-msg cart-pay-promo-msg is-bad"; pm.textContent = "Couldn't apply that code. Please try again.";
      }).then(function () { btn.disabled = false; });
    }
    btn.onclick = function () { apply(input.value); };
    input.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); apply(input.value); } };
    if (promoState && promoState.code) apply(promoState.code);
  }

  function closePay() {
    if (embedded) { try { embedded.unmount ? embedded.unmount() : embedded.destroy(); } catch (e) {} embedded = null; }
    var pe = pay.querySelector(".cart-pay-error"); if (pe) pe.textContent = "";
    if (pay.open) pay.close();
  }
  shell.querySelector(".cart-pay-x").addEventListener("click", closePay);
  pay.addEventListener("cancel", function (e) { e.preventDefault(); closePay(); });

  var currentDetails = { purchaser: {}, attendees: {}, gifts: {} };
  function sessionPayload(extra) {
    var b = { items: cart, purchaser: currentDetails.purchaser, attendees: currentDetails.attendees, gifts: currentDetails.gifts || {}, intake: currentDetails.intake || {}, giftCode: giftState ? giftState.code : undefined, promoCode: promoState ? promoState.code : undefined };
    for (var k in extra) b[k] = extra[k];
    return JSON.stringify(b);
  }
  function requestSession(mode) {
    return fetch("/api/create-checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: sessionPayload({ mode: mode })
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
    if (step === "cart") {
      // Signed in with everything we need? Skip straight to the quick questions.
      fillAccount();
      showStep(member && !validateAccount(readDetails()) ? "details" : "account");
      return;
    }
    if (step === "account") {
      var a = readDetails(), ap = validateAccount(a);
      if (ap) { detailsErr.textContent = ap[1]; var af = F[ap[0]]; if (af && af.focus) af.focus(); return; }
      saveDetails(a); showStep("details"); return;
    }
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
            setupPayPromo(result.actions, d);
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
        if (err && err.code === "promo_invalid") {
          closePay(); openDrawer(); if (step !== "details") showStep("details");
          promoState = null; codeMsg.className = "cart-code-msg is-bad"; codeMsg.textContent = err.message || "That promo code didn't work."; render();
          checkoutBtn.disabled = !cart.length; checkoutBtn.textContent = "Continue to payment";
          return;
        }
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

  /* ---------- after payment: a few quick questions ---------- */
  var qDlg = shell.querySelector(".cart-q"), qForm = shell.querySelector(".cart-q-form");
  var qMsg = qForm.querySelector(".cart-q-msg"), qSend = qForm.querySelector(".cart-q-send");
  var qOther = qForm.querySelector(".cart-q-other"), qBooking = null, qThanks = "";
  qForm.qheard.addEventListener("change", function () { qOther.hidden = qForm.qheard.value !== "Other"; });
  function askQuestions(bookingId, withClass, thanksText) {
    qThanks = thanksText;
    if (!bookingId || typeof qDlg.showModal !== "function") { showThanks(thanksText); return; }
    qBooking = bookingId;
    qForm.querySelector(".cart-q-class").hidden = !withClass;
    qMsg.textContent = "";
    qDlg.showModal();
  }
  function finishQuestions() { if (qDlg.open) qDlg.close(); showThanks(qThanks); }
  function sendAnswers(body, tries) {
    return fetch("/api/booking-questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) {
        if ((r.status === 404 || r.status === 409) && tries > 0) return new Promise(function (res) { setTimeout(res, 2000); }).then(function () { return sendAnswers(body, tries - 1); });
        if (!r.ok) throw new Error("save_failed");
      });
  }
  qForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var photo = qForm.querySelector('input[name="qphoto"]:checked');
    var body = { bookingId: qBooking, heard: qForm.qheard.value, heardOther: qForm.qheardOther.value.trim(), injuries: qForm.qinjuries.value.trim(), photo: photo ? photo.value : "" };
    if (!body.heard && !body.injuries && !body.photo) { finishQuestions(); return; }
    qSend.disabled = true; qMsg.textContent = "Saving…";
    sendAnswers(body, 6).then(function () { track("booking_questions", { heard: body.heard }); finishQuestions(); })
      .catch(function () { qMsg.textContent = "Couldn't save your answers. You can reply to your confirmation email instead."; })
      .then(function () { qSend.disabled = false; });
  });
  qForm.querySelector(".cart-q-skip").addEventListener("click", finishQuestions);
  qDlg.addEventListener("cancel", function (e) { e.preventDefault(); finishQuestions(); });

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
    var hadClass = hasClass();
    track("purchase", { transaction_id: d.ref, currency: "USD", value: 0, coupon: "egift", items: gaItems(cart) });
    cart = []; save(cart); giftState = null; promoState = null; codeInput.value = ""; codeMsg.textContent = "";
    try { sessionStorage.removeItem(DETAILS_KEY); } catch (e) {}
    closeDrawer(); render();
    checkoutBtn.textContent = "Checkout";
    askQuestions(d.bookingId, hadClass, "Your code covered it. Your confirmation (ref " + esc(d.ref || "") + ") is on its way to your email.");
  }

  /* ---------- PayPal (shown only when the server says it's set up; ?paypal=preview for testing) ---------- */
  var ppWrap = shell.querySelector(".cart-paypal"), ppBtns = shell.querySelector(".cart-paypal-btns"), ppNote = shell.querySelector(".cart-paypal-note");
  var ppConfig = null, ppSdk = null, ppRendered = false, fineEl = shell.querySelector(".cart-fine");
  (function () {
    var preview = false;
    try {
      if (/[?&]paypal=preview\b/.test(location.search)) sessionStorage.setItem("sscPaypalPreview", "1");
      if (/[?&]paypal=off\b/.test(location.search)) sessionStorage.removeItem("sscPaypalPreview");
      preview = sessionStorage.getItem("sscPaypalPreview") === "1";
    } catch (e) {}
    fetch("/api/paypal-config" + (preview ? "?preview=1" : "")).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) { if (c && c.enabled && c.clientId) { ppConfig = c; render(); } }).catch(function () {});
  })();
  function ppSay(text, bad) { ppNote.textContent = text || ""; ppNote.className = "cart-paypal-note" + (bad ? " is-bad" : ""); }
  function loadPaypalSdk() {
    if (ppSdk) return ppSdk;
    ppSdk = new Promise(function (resolve, reject) {
      var sc = document.createElement("script");
      sc.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(ppConfig.clientId) + "&currency=USD&intent=capture&components=buttons&enable-funding=venmo&disable-funding=card";
      sc.setAttribute("data-page-type", "checkout");
      sc.onload = function () { window.paypal ? resolve(window.paypal) : reject(new Error("no_paypal")); };
      sc.onerror = function () { ppSdk = null; reject(new Error("paypal_sdk")); };
      document.head.appendChild(sc);
    });
    return ppSdk;
  }
  function renderPaypal(due) {
    if (!ppWrap) return;
    var show = !!ppConfig && step === "details" && cart.length > 0 && due > 0 && !promoState;
    ppWrap.hidden = !show;
    fineEl.textContent = ppConfig && step === "details" ? "Secure payment by Stripe or PayPal. A receipt is emailed to you after checkout." : "Secure payment by Stripe. A receipt is emailed to you after checkout.";
    if (ppConfig && step === "details" && promoState && due > 0) { ppWrap.hidden = false; ppBtns.hidden = true; ppSay("Promo codes work with card payment, so PayPal isn't available with a promo code."); return; }
    ppBtns.hidden = false;
    if (!show || ppRendered) return;
    ppRendered = true;
    loadPaypalSdk().then(function (paypal) {
      return paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "pill", label: "paypal", height: 46, tagline: false },
        onClick: function (data, actions) {
          ppSay("");
          var d = readDetails(), problem = validateDetails(d);
          if (problem) {
            detailsErr.textContent = problem[1];
            var el = typeof problem[0] === "string" ? F[problem[0]] : problem[0];
            if (el && el.focus) el.focus();
            return actions.reject();
          }
          currentDetails = d; saveDetails(d);
          track("begin_checkout", { currency: "USD", value: total() / 100, payment_type: "paypal", items: gaItems(cart) });
          return actions.resolve();
        },
        createOrder: function () {
          return fetch("/api/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: sessionPayload({ provider: "paypal" }) })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (x) {
              if (!x.ok || !x.d.paypalOrderId) {
                ppSay(x.d.error || "PayPal couldn't start. Please try again or pay by card.", true);
                if (x.d.code === "gift_invalid") { giftState = null; render(); }
                throw new Error(x.d.code || "paypal_create_failed");
              }
              return x.d.paypalOrderId;
            });
        },
        onApprove: function (data, actions) {
          ppSay("Confirming your payment…");
          return fetch("/api/paypal-capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderID: data.orderID }) })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (x) {
              if (!x.ok && x.d.restart) { ppSay(x.d.error || "Please choose another payment method in PayPal.", true); return actions.restart(); }
              if (!x.ok) { ppSay(x.d.error || "PayPal couldn't complete the payment. You haven't been charged.", true); return; }
              paidWithPaypal(x.d, data.orderID);
            })
            .catch(function () { ppSay("We couldn't confirm the payment. If PayPal shows it as paid, your confirmation email will arrive shortly.", true); });
        },
        onCancel: function (data) {
          ppSay("PayPal payment cancelled. You haven't been charged, and your cart is still here.");
          if (data && data.orderID) fetch("/api/paypal-cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderID: data.orderID }) }).catch(function () {});
        },
        onError: function () { if (!ppNote.textContent) ppSay("PayPal had a problem. Please try again or pay by card.", true); }
      }).render(ppBtns);
    }).catch(function () { ppRendered = false; ppWrap.hidden = true; });
  }
  function paidWithPaypal(d, orderID) {
    var hadClass = hasClass(), value = total();
    track("purchase", { transaction_id: d.ref || orderID, currency: "USD", value: value / 100, payment_type: "paypal", items: gaItems(cart) });
    cart = []; save(cart); giftState = null; promoState = null; codeInput.value = ""; codeMsg.textContent = ""; ppSay("");
    try { sessionStorage.removeItem(DETAILS_KEY); } catch (e) {}
    closeDrawer(); render(); checkoutBtn.textContent = "Checkout";
    if (d.pendingReview) { showThanks("PayPal is reviewing your payment. We'll email your confirmation as soon as it clears (ref " + esc(d.ref || "") + ")."); return; }
    askQuestions("pp_" + orderID, hadClass, "Paid with PayPal. Your confirmation (ref " + esc(d.ref || "") + ") is on its way to your email.");
  }

  /* ---------- direct links: any page with ?book=<item> adds it to the cart and opens checkout ---------- */
  (function () {
    var qs = new URLSearchParams(location.search), id = qs.get("book");
    if (!id) return;
    qs.delete("book");
    history.replaceState(null, "", location.pathname + (qs.toString() ? "?" + qs : "") + location.hash);
    var p = CATALOG[id];
    if (!p) return;
    if (p.date && p.date < TODAY_ET) { showToast(p.name + " has already happened. See what's coming up below."); return; }
    if (!cart.some(function (i) { return i.id === id; })) add(id);
    track("direct_link", { item: id });
    openDrawer();
  })();

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
    var hadClassPaid = !pending || (pending.items || []).some(function (i) { return CATALOG[i.id] && CATALOG[i.id].kind === "class"; });
    askQuestions(q.get("session_id"), hadClassPaid, "Your booking confirmation and receipt are on their way to your email.");
    history.replaceState(null, "", location.pathname + location.hash);
  }

  render();
})();
