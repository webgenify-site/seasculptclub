/* Seasonal winter decor (Dec 2026). To remove: delete this file's <script> tags and the "Winter decor" block in coastal.css. */
(function () {
  if (window.__sscWinter) return; window.__sscWinter = true;
  var A = "assets/";
  function img(src, cls) { var i = new Image(); i.src = A + src; i.alt = ""; i.className = "wd " + cls; i.decoding = "async"; i.setAttribute("aria-hidden", "true"); return i; }
  // 1. Garland under the header, at the top of every page (scrolls away with the page)
  var header = document.querySelector("body > header");
  if (header && !document.querySelector(".wd-garland")) {
    var g = document.createElement("div"); g.className = "wd-garland"; g.setAttribute("aria-hidden", "true");
    g.appendChild(img("deco-garland-scallop.svg", "wd-garland-img"));
    header.insertAdjacentElement("afterend", g);
  }
  // 2. A few accents on key sections (only where that section exists on the page)
  var spots = [
    ["#packs", "deco-presents-pair.svg", "wd-presents"],
    ["#gift-cards", "deco-ornaments-pair.svg", "wd-hang"],
    ["#faq", "deco-stockings-pair.svg", "wd-stockings"],
    ["#how", "deco-ornaments-pair.svg", "wd-hang"],
    ["#shop", "deco-ornaments-pair.svg", "wd-hang"],
    ["#upcoming", "deco-presents-pair.svg", "wd-presents wd-bottom"],
    [".ed-reviews", "deco-ornaments-pair.svg", "wd-hang"],
    [".ed-signup", "deco-stockings-pair.svg", "wd-stockings"]
  ];
  spots.forEach(function (s) {
    var sec = document.querySelector(s[0]);
    if (!sec || sec.querySelector(".wd")) return;
    sec.classList.add("wd-host");
    sec.appendChild(img(s[1], s[2]));
  });
})();
