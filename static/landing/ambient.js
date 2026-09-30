(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.getElementById('ambientNetworkCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var width = 0, height = 0, dpr = 1;
  var particles = [];
  var maxDistance = 145;
  var mouse = { x: -1000, y: -1000, radius: 150 };

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function resize() {
    // Capped below the display's own ratio, unlike every other layer on
    // the page. This one is redrawn in full on every frame, forever, over
    // the whole viewport -- at 2x on a retina screen that is four times
    // the pixels, every frame, competing with the scroll. Measured by
    // scrolling 3000px: the canvas was costing about a third of the total
    // frame time. The particles are soft dots and faint lines, so 1.5x is
    // indistinguishable from 2x and gives back 44% of the fill.
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    initParticles();
  }

  function initParticles() {
    particles = [];
    var count = Math.min(55, Math.max(22, Math.floor((width * height) / 28000)));
    for (var i = 0; i < count; i++) {
      var isAmber = Math.random() < 0.22;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.42,
        vy: (Math.random() - 0.5) * 0.42,
        radius: Math.random() * 1.6 + 1.2,
        isAmber: isAmber,
        alpha: Math.random() * 0.45 + 0.35
      });
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });
  window.addEventListener('mouseleave', function () {
    mouse.x = -1000;
    mouse.y = -1000;
  }, { passive: true });

  var running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });

  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    var dark = isDark();
    // Light mode used to draw these dimmer than dark mode, on the
    // reasoning that saturated blue on white reads stronger. That is true
    // for the hue but not for the result: on a near-white canvas a 0.19
    // alpha dot disappears into the panel behind it, so the network was
    // effectively off in light mode and loud in dark. Both themes now
    // draw at a strength you can actually see, with light using deeper
    // colours because pale ones vanish against a light field.
    var blueDot = dark ? 'rgba(96, 165, 250, ' : 'rgba(37, 99, 235, ';
    var amberDot = dark ? 'rgba(251, 191, 36, ' : 'rgba(217, 119, 6, ';
    var lineBase = dark ? 'rgba(148, 163, 184, ' : 'rgba(71, 85, 105, ';
    var dotGain = dark ? 0.75 : 0.62;
    var lineGain = dark ? 0.18 : 0.155;

    var len = particles.length;
    for (var i = 0; i < len; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      else if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      else if (p.y > height) p.y = 0;

      // Mouse gentle nudge
      var dxm = p.x - mouse.x;
      var dym = p.y - mouse.y;
      var distMouse = Math.hypot(dxm, dym);
      if (distMouse < mouse.radius && distMouse > 0) {
        var force = (mouse.radius - distMouse) / mouse.radius * 0.5;
        p.x += (dxm / distMouse) * force;
        p.y += (dym / distMouse) * force;
      }

      // Draw dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = (p.isAmber ? amberDot : blueDot) + (p.alpha * dotGain) + ')';
      ctx.fill();

      // Connect nearby dots
      for (var j = i + 1; j < len; j++) {
        var p2 = particles[j];
        var dx = p.x - p2.x;
        var dy = p.y - p2.y;
        var dist = Math.hypot(dx, dy);
        if (dist < maxDistance) {
          var lineAlpha = (1 - dist / maxDistance) * lineGain;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = lineBase + lineAlpha + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
})();
