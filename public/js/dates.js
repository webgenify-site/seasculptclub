/* Sea Sculpt Club – hides class dates that have already passed (New Jersey time).
   A session stays visible through its own day. Mark up dated items with data-date="YYYY-MM-DD":
   - a card/article: data-date = its LAST session date (hidden once that day has passed)
   - an <option>: data-date = that session's date (removed once passed)
   - schedule rows: <li> containing <time datetime="YYYY-MM-DD"> */
(function () {
  var today;
  try {
    today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch (e) {
    var d = new Date(); today = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function past(v) { return !!v && v < today; }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  each("option[data-date]", function (o) { if (past(o.getAttribute("data-date"))) o.parentNode.removeChild(o); });
  each("[data-date]:not(option)", function (el) { if (past(el.getAttribute("data-date"))) el.parentNode.removeChild(el); });
  each(".cl-dates li", function (li) {
    var t = li.querySelector("time[datetime]");
    if (t && past(t.getAttribute("datetime"))) li.parentNode.removeChild(li);
  });
  // Empty states
  each("[data-upcoming]", function (g) {
    if (!g.children.length) { var m = g.parentNode.querySelector(".hx-empty"); if (m) m.hidden = false; g.hidden = true; }
  });
  window.SEA_SCULPT_TODAY = today;
})();
