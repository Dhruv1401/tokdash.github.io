(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof Lenis === 'undefined') return;

  var lenis = new Lenis({
    lerp: 0.062,
    wheelMultiplier: 0.88,
    touchMultiplier: 1.2,
    smoothWheel: true,
    gestureOrientation: 'vertical',
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  window.__lenis = lenis;

  // Intercept anchor links for buttery-smooth scrolling with navbar offset
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var targetId = a.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, {
          offset: -76,
          duration: 1.4,
          easing: function (t) {
            return Math.min(1, 1.001 - Math.pow(2, -10 * t));
          }
        });
        try { history.pushState(null, '', targetId); } catch (err) {}
      }
    });
  });
})();
