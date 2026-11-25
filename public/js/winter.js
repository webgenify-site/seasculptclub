/* Seasonal winter decor (Dec 2026). To remove: delete this file's <script> tags and the "Winter decor" block in coastal.css. */
(function () {
  if (window.__sscWinter) return; window.__sscWinter = true;
  var A = "assets/";
  function img(src, cls) { var i = new Image(); i.src = A + src; i.alt = ""; i.className = "wd " + cls; i.decoding = "async"; i.setAttribute("aria-hidden", "true"); return i; }
  // 1. Garland under the header, at the top of every page (scrolls away with the page)
  var header = document.querySelector("body > header");
  if (header && !document.querySelector(".wd-garland")) {
    var g = document.createElement("div"); g.className = "wd-garland"; g.setAttribute("aria-hidden", "true");
    header.insertAdjacentElement("afterend", g);
  }
  // 2. A few accents on key sections (only where that section exists on the page)
  var spots = [
    [".cl-buy-hero", "win-tree.webp", "wd-tree"],
    ["#packs", "win-tree.webp", "wd-tree wd-left"],
    ["#packs", "win-presents.webp", "wd-presents"],
    ["#gift-cards", "win-bow-bulb.webp", "wd-hang"],
    ["#faq", "win-stockings.webp", "wd-stockings"],
    ["#how", "win-drop-yellow.webp", "wd-hang wd-drop"],
    ["#shop", "win-ball-blue.webp", "wd-hang"],
    ["#upcoming", "win-presents.webp", "wd-presents wd-bottom"],
    [".ed-reviews", "win-bow-bulb.webp", "wd-hang"],
    [".ed-signup", "win-stockings.webp", "wd-stockings"]
  ];
  spots.forEach(function (s) {
    var sec = document.querySelector(s[0]);
    if (!sec || sec.querySelector('.wd[src$="' + s[1] + '"]') || getComputedStyle(sec).display === "none") return;
    sec.classList.add("wd-host");
    sec.appendChild(img(s[1], s[2]));
  });
})();
