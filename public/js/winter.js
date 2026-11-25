/* Seasonal winter decor (Dec 2026). To remove: delete this file's <script> tags and the "Winter decor" block in coastal.css. */
(function () {
  if (window.__sscWinter) return; window.__sscWinter = true;
  var A = "assets/";
  function img(src, cls) { var i = new Image(); i.src = A + src; i.alt = ""; i.className = "wd " + cls; i.decoding = "async"; i.setAttribute("aria-hidden", "true"); return i; }
  // 1. Garland under the header, at the top of every page (scrolls away with the page)
  var header = document.querySelector("body > header");
  var garlandPage = /(^|\/)(merch|account|buy|classes)(\.html)?$/.test(location.pathname.replace(/\/$/, ""));
  if (header && garlandPage && !document.querySelector(".wd-garland")) {
    var g = document.createElement("div"); g.className = "wd-garland"; g.setAttribute("aria-hidden", "true");
    header.appendChild(g); // sits on the header's bottom edge
  }
  // 2. A few accents on key sections (only where that section exists on the page)
  var spots = [
    ["#packs", "win-tree.webp", "wd-tree wd-left"],
    ["#packs", "win-presents.webp", "wd-presents"],
    ["#gift-cards", "win-bow-bulb.webp", "wd-hang"],
    ["#how", "win-drop-yellow.webp", "wd-hang wd-drop"],
    ["#shop", "win-ball-blue.webp", "wd-hang"],
    ["#shop", "win-tree.webp", "wd-tree wd-left"],
    ["#upcoming", "win-presents.webp", "wd-presents wd-bottom"],
    [".ed-reviews", "win-bow-bulb.webp", "wd-hang"],
    [".ed-signup", "win-stockings.webp", "wd-stockings"]
  ];
  spots.forEach(function (s) {
    var sec = document.querySelector(s[0]);
    if (!sec || sec.querySelector('.wd[src$="' + s[1] + '"]') || getComputedStyle(sec).display === "none") return;
    if (/tree/.test(s[1]) && document.querySelector('img[src*="tree"]')) return; // one tree per page
    sec.classList.add("wd-host");
    sec.appendChild(img(s[1], s[2]));
  });
})();
