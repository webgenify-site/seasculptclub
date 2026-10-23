// ---------- Short links (/privates, /parties) when previewing the files directly ----------
// On seasculptclub.com Cloudflare serves /privates and /parties. Opened straight from a folder
// (or a plain local server) those addresses don't exist, so point them at the page files instead.
(function () {
  var local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!local) return;
  var map = { "/privates": "privates.html", "/private": "privates.html", "/parties": "bachelorette.html" };
  function fix() {
    Array.prototype.forEach.call(document.querySelectorAll("a[href^='/p']"), function (a) {
      var h = a.getAttribute("href"), m = h.match(/^(\/[a-z]+)(#.*)?$/);
      if (m && map[m[1]]) a.setAttribute("href", map[m[1]] + (m[2] || ""));
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fix); else fix();
})();

document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("menuToggle");
  const navlinks = document.getElementById("navlinks");
  if (toggle && navlinks) {
    toggle.addEventListener("click", () => navlinks.classList.toggle("open"));
    navlinks.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => navlinks.classList.remove("open"))
    );
  }

  // Website forms (saved + emailed by /api/form): submit via fetch so we can show an inline confirmation
  // without a full page reload/redirect.
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const form = e.target;
      const fields = document.getElementById("contactFields");
      const confirmMsg = form.querySelector(".confirm");
      const errorMsg = form.querySelector(".form-error");
      const data = new FormData(form);

      fetch("/api/form", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data).toString(),
      })
        .then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          if (errorMsg) errorMsg.style.display = "none";
          if (fields) fields.style.display = "none";
          if (confirmMsg) confirmMsg.style.display = "block";
        })
        .catch(() => {
          if (errorMsg) errorMsg.style.display = "block";
        });
    });
  }

  // ---------- Email signup popup ----------
  initSignupPopup();
  initFooterSignupForm();
  initConversionTracking();
});

// ---------- GA4 conversion tracking prep ----------
// Only fires events that correspond to real, existing functionality on this
// site (page views of specific pages, and actual form submissions). Does not
// fabricate events for functionality that doesn't exist yet (ticketing,
// checkout, purchases) — those require an external platform integration.
function initConversionTracking() {
  if (typeof gtag !== "function") return;

  var path = window.location.pathname;

  // view_private_events: fires on the actual Private Pilates Parties page.
  if (path.indexOf("bachelorette.html") !== -1 || /^\/parties\/?$/.test(path)) {
    gtag("event", "view_private_events", { page_path: path });
  }

  // view_event: fires on the actual Events page.
  if (path.indexOf("events.html") !== -1) {
    gtag("event", "view_event", { page_path: path });
  }

  // HubSpot embedded form submissions: HubSpot posts a message to the parent
  // window when a visitor submits one of its embedded forms. We listen for
  // that and fire a page-appropriate GA4 event — private_event_inquiry on
  // pages framed around private Pilates parties, partner_inquiry on pages
  // framed around business/wellness partnerships. Same underlying HubSpot
  // form, different intent depending on which page it was submitted from.
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "hsFormCallback") return;
    if (event.data.eventName !== "onFormSubmitted") return;

    var isPartnerPage =
      path.indexOf("wellness.html") !== -1 ||
      path.indexOf("collaborate.html") !== -1;

    var eventName = isPartnerPage ? "partner_inquiry" : "private_event_inquiry";
    gtag("event", eventName, { page_path: path });
  });
}

function initFooterSignupForm() {
  var footerForms = document.querySelectorAll(".footer-signup-form");
  footerForms.forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var wrapper = form.parentElement;
      var successMsg = wrapper.querySelector(".footer-signup-confirm");
      var errorMsg = wrapper.querySelector(".footer-signup-error");
      var data = new URLSearchParams();
      data.append("form-name", "newsletter");
      data.append("email", form.email.value);

      fetch("/api/form", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data.toString(),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          if (errorMsg) errorMsg.style.display = "none";
          form.style.display = "none";
          if (successMsg) successMsg.style.display = "block";
          if (typeof gtag === "function") {
            gtag("event", "email_signup", { form_location: "footer" });
          }
        })
        .catch(function () {
          if (errorMsg) errorMsg.style.display = "block";
        });
    });
  });
}

function initSignupPopup() {
  var STORAGE_KEY = "seaSculptPopupV5";
  var DELAY_MS = 1500;

  // Don't show again if the visitor already closed it or subscribed before.
  if (localStorage.getItem(STORAGE_KEY)) return;

  var overlay = document.createElement("div");
  overlay.className = "signup-popup-overlay";
  overlay.innerHTML =
    '<div class="signup-popup-card" role="dialog" aria-modal="true" aria-label="Your reset starts here">' +
      '<button type="button" class="signup-popup-close" aria-label="Close">&times;</button>' +
      '<img class="signup-popup-shell" src="assets/popup-shell.png" alt="Spiral shell icon">' +
      '<h3>Your reset<span class="script">starts here.</span></h3>' +
      '<p>Pilates sculpt in beautiful places.</p>' +
      '<a href="classes.html#events" class="btn btn-fill signup-popup-waitlist-btn">Find your class</a>' +
    '</div>';
  document.body.appendChild(overlay);

  function closePopup(remember) {
    overlay.classList.remove("open");
    if (remember) localStorage.setItem(STORAGE_KEY, "1");
  }

  overlay.querySelector(".signup-popup-close").addEventListener("click", function () {
    closePopup(true);
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closePopup(true);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("open")) closePopup(true);
  });

  overlay.querySelector(".signup-popup-waitlist-btn").addEventListener("click", function () {
    if (typeof gtag === "function") {
      gtag("event", "popup_click", { event_name: "find_your_class_popup" });
    }
    closePopup(true);
  });

  setTimeout(function () {
    overlay.classList.add("open");
  }, DELAY_MS);
}

// Defensive autoplay for the hero videos: some mobile browsers (iOS Safari in
// particular) can silently refuse to autoplay even with the muted/playsinline
// attributes set, especially right after a media-query-driven display swap.
// Explicitly setting .muted and calling .play() covers those edge cases.
document.addEventListener("DOMContentLoaded", function () {
  var heroVideos = document.querySelectorAll(".hero-video");
  heroVideos.forEach(function (video) {
    video.muted = true;
    var tryPlay = function () {
      var playPromise = video.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(function () {
          // Autoplay blocked; retry once the video is confirmed loaded.
          video.addEventListener("loadeddata", function () {
            video.play().catch(function () {});
          }, { once: true });
        });
      }
    };
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("loadeddata", tryPlay, { once: true });
    }
  });
});

// ---------- Light motion: gentle fade-up on scroll ----------
// Content is fully visible without JS; motion is skipped for reduced-motion users.
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var SEL = [
    "main section h2", "section > .wrap > h2", ".ed-head", ".hx-head", ".cl-head", ".co-head",
    ".cl-dates li", ".hx-review", ".ed-way", ".mw-card", ".pv-card", ".co-card", ".value-card",
    ".cl-pack", ".cl-offer", ".cl-event", ".split-photo", ".split-text", ".hx-portrait",
    ".partner-wall li", ".pp2-card", ".pp-panel", ".strip-photo", ".co-gallery figure",
    ".hubspot-form-card", ".mantra-words", ".taggbox-widget-container", ".cl-feature-img", ".cl-feature-copy"
  ].join(",");
  function init() {
    var els = Array.prototype.filter.call(document.querySelectorAll(SEL), function (el) {
      return !el.closest("header, footer, dialog, .cart-drawer, .signup-popup-overlay, #upcoming");
    });
    if (!els.length) return;
    document.documentElement.classList.add("ss-motion");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) {
      // small stagger between siblings in the same row/list
      var i = 0, s = el.previousElementSibling;
      while (s && i < 4) { if (s.matches && s.matches(SEL)) i++; s = s.previousElementSibling; }
      el.style.setProperty("--ss-delay", (i * 70) + "ms");
      el.classList.add("ss-reveal");
      io.observe(el);
    });
    // safety: never leave anything hidden
    setTimeout(function () { els.forEach(function (el) { el.classList.add("is-in"); }); }, 6000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
