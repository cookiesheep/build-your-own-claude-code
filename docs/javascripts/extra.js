/* ─── BYOCC — Scroll animations (replay on every entry) ─── */
(function () {
  "use strict";

  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("byocc-visible");
          entry.target.classList.remove("byocc-hidden");
        } else {
          entry.target.classList.remove("byocc-visible");
          entry.target.classList.add("byocc-hidden");
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  document.addEventListener("DOMContentLoaded", function () {
    var animated = document.querySelectorAll(".byocc-animate");
    for (var i = 0; i < animated.length; i++) {
      animated[i].classList.add("byocc-hidden");
      revealObserver.observe(animated[i]);
    }
  });
})();
