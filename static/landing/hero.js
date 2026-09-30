// ---- Proof figures roll up once, the first time they come into view ----
(function () {
  if (typeof anime === 'undefined' || !('IntersectionObserver' in window)) return;
  var items = document.querySelectorAll('.proof-item');
  if (!items.length) return;
  var counted = new WeakSet();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting || counted.has(e.target)) return;
      counted.add(e.target);
      // Observe the .proof-item, not the <b> inside it: the i18n pass
      // replaces that inner span wholesale, so a <b> observed up front ends
      // up detached and the counter would tick on a node nobody can see.
      var num = e.target.querySelector('b');
      if (!num) return;
      var target = parseFloat(String(num.textContent).replace(/[^0-9.]/g, ''));
      if (!target) return;
      io.unobserve(e.target);
      // Animate a plain counter object, not the element: anime v3 only reads
      // back real CSS values from the instance, so a custom `count` key on
      // the element target would come back NaN on every frame.
      var counter = { value: 0 };
      anime({
        targets: counter,
        value: target,
        duration: 1200,
        easing: 'easeOutExpo',
        update: function () { num.textContent = Math.round(counter.value); }
      });
    });
  }, { threshold: 0.4 });
  Array.prototype.forEach.call(items, function (n) { io.observe(n); });
})();

// ---- Hero mini-heatmap (deterministic synthetic pattern) ----
(function () {
  var host = document.getElementById('miniHeat');
  if (!host) return;
  var weeks = 20, days = 7, seed = 7;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  var frag = document.createDocumentFragment();
  for (var w = 0; w < weeks; w++) {
    for (var d = 0; d < days; d++) {
      var weekend = (d === 0 || d === 6);
      var base = rnd();
      var lvl = base < 0.18 ? 0 : Math.min(9, Math.floor((base * (weekend ? 6 : 10))));
      var cell = document.createElement('div');
      cell.className = 'hcell l' + lvl;
      frag.appendChild(cell);
    }
  }
  host.appendChild(frag);
  // legend swatches
  var legend = document.getElementById('legend');
  if (legend) { for (var i = 0; i <= 4; i++) { var s = document.createElement('span'); s.className = 'hcell l' + (i*2); s.style.display = 'inline-block'; s.style.margin = '0 1px'; s.style.verticalAlign = 'middle'; legend.appendChild(s); } }
})();

// ---- Hero mini-dashboard entrance ----
// Runs after the heatmap above, because it animates the cells that block
// just built. The four KPI cards do not simply fade up where they sit: each
// one starts away from its real grid cell, in 3D, and converges fast. The
// heatmap then drops into place behind them, leftmost column first and
// finishing on the right, with enough per-cell jitter that the wave never
// reads as a linear sweep. The randomiser is reseeded on every visit.
(function () {
  var dash = document.querySelector('.preview-dash');
  if (!dash || typeof anime === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var kpis = Array.prototype.slice.call(dash.querySelectorAll('.kpi-in'));
  var cells = Array.prototype.slice.call(dash.querySelectorAll('#miniHeat .hcell'));
  // The dashboard's own labels get the same per-character reveal the
  // section headings use, so the preview reads as the same object as the
  // rest of the page rather than as a static screenshot.
  var texts = Array.prototype.slice.call(dash.querySelectorAll('.kpi-label, .pv-text'));
  var played = false;
  if (!kpis.length) return;

  // Hold every piece back until the entrance plays. The intro fades out
  // over the hero, so without this the finished dashboard shows through
  // the fade, then blanks and plays in again.
  kpis.concat(cells, texts).forEach(function (el) { el.style.opacity = '0'; });

  function rnd(min, max) { return min + Math.random() * (max - min); }

  // Split into .heading-char spans and reveal them left to right, exactly
  // as the section headings do. This reuses their class rather than
  // animating opacity directly: the class carries the transition, the
  // reduced-motion override, and the settled-state check in
  // verify_landing.py, all of which key off .heading-char.in.
  // Spaces stay plain text nodes: wrapping one in a span would remove the
  // line-break opportunity, which is the bug the heading splitter already
  // had to fix for the same reason.
  function staggerChars(el, offset) {
    if (!el) return;
    var text = el.textContent;
    if (!text) return;
    el.textContent = '';
    var chars = text.split('');
    var frag = document.createDocumentFragment();
    var spans = [];
    for (var i = 0; i < chars.length; i++) {
      if (chars[i] === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
      var s = document.createElement('span');
      s.className = 'heading-char';
      s.textContent = chars[i];
      frag.appendChild(s);
      spans.push(s);
    }
    el.appendChild(frag);
    for (var j = 0; j < spans.length; j++) {
      (function (span, at) {
        setTimeout(function () { span.classList.add('in'); }, at);
      })(spans[j], offset + j * 14);
    }
  }

  // Tween a headline figure while keeping its affixes and precision, so
  // "$312.40" never lands as "$312.2" and "5,847" keeps its separator.
  // The figures deliberately keep this instead of the character reveal:
  // the counter rewrites textContent on every frame, which would destroy
  // the character spans the reveal needs. Labels shimmer, numbers roll.
  //
  // The roll waits for the card to have most of the way home. A figure
  // that starts counting the moment its card starts moving reads the
  // number as arriving somewhere else, and the zero is written straight
  // away so the wait is a held zero rather than the finished value sitting
  // there for a beat and then rolling backwards to it.
  function countUp(el, delay) {
    if (!el) return;
    var text = el.textContent.trim();
    el.dataset.value = text;   // the real figure, for the ticker below
    var m = text.match(/^([^\d.-]*)(-?[\d.,]+)([\s\S]*)$/);
    if (!m) return;
    var pre = m[1], raw = m[2], post = m[3];
    var decimals = ((raw.split('.')[1] || '').match(/\d/g) || []).length;
    var grouped = raw.indexOf(',') !== -1;
    var end = parseFloat(raw.replace(/,/g, ''));
    if (!isFinite(end)) return;
    var o = { v: 0 };
    el.textContent = pre + (grouped ? (0).toLocaleString('en-US') : (0).toFixed(decimals)) + post;
    anime({
      targets: o, v: end, duration: 950, delay: delay || 0, easing: 'easeOutExpo',
      update: function () {
        var n = grouped ? Math.round(o.v).toLocaleString('en-US') : o.v.toFixed(decimals);
        el.textContent = pre + n + post;
      },
      complete: function () { el.textContent = text; }
    });
  }

  function play() {
    if (played) return;
    played = true;
    // Each text is split into hidden characters below, in this same task,
    // so none of them paints before its reveal starts.
    texts.forEach(function (el) { el.style.opacity = ''; });

    // Ask for the layers the entrance needs, and only for the entrance.
    // The reveal engine already releases its own promotions when it
    // finishes; without the same here, 140 cells sit on their own
    // compositor layers for the rest of the session.
    kpis.concat(cells).forEach(function (el) { el.classList.add('will-anim'); });

    var tl = anime.timeline({
      easing: 'cubicBezier(0.22, 1, 0.36, 1)',
      complete: function () {
        kpis.concat(cells).forEach(function (el) { el.classList.remove('will-anim'); });
        // The ticker below waits for this, so it never writes over a
        // figure that is still rolling in.
        dash.classList.add('entered');
        try { document.dispatchEvent(new CustomEvent('tokdash:hero-entered')); } catch (e) {}
      }
    });

    kpis.forEach(function (kpi, i) {
      // One draw of the gap per card. This used to ask for a random gap
      // twice, once for the card and once for its label, so the label was
      // timed off a different number and could drift a few hundred
      // milliseconds away from the box it belongs to.
      var cardStart = i === 0 ? 0 : i * rnd(74, 150);
      tl.add({
        targets: kpi,
        translateX: [rnd(-52, 52), 0],
        translateY: [rnd(-38, 38), 0],
        translateZ: [rnd(-280, -110), 0],
        rotateX: [rnd(-28, 28), 0],
        rotateZ: [rnd(-6, 6), 0],
        scale: [rnd(0.84, 0.95), 1],
        // Same per-property timing the reveals use: the card is at full
        // strength a third of the way in, so it is readable while it is
        // still turning, and the fade is over long before it lands.
        opacity: { value: [0, 1], duration: 300, easing: 'linear' },
        duration: 560,
        easing: 'cubicBezier(0.16, 1, 0.3, 1)'
      }, cardStart);
      // Each card's label and figure caption read a beat after the card
      // itself lands, so the numbers arrive after the box they belong to.
      countUp(kpi.querySelector('.kpi-val'), cardStart + 260);
      staggerChars(kpi.querySelector('.kpi-label'), cardStart + 260);
      var cap = kpi.querySelector('.pv-text');
      if (cap) staggerChars(cap, cardStart + 340);
    });

    // When the cards are done, read once and named. The heatmap's own
    // labels are timed off this rather than off a magic number, so
    // retiming the cards moves the labels with them.
    var cardsEnd = tl.duration;

    // The window chrome reads first, before anything inside it.
    Array.prototype.slice.call(dash.querySelectorAll('.preview-topbar .pv-text'))
      .forEach(function (el, i) { staggerChars(el, i * 90); });

    var heat = dash.querySelector('#miniHeat');
    var heatCard = heat && heat.parentNode;
    if (heatCard) {
      var actLabel = heatCard.querySelector('.kpi-label');
      if (actLabel) staggerChars(actLabel, cardsEnd * 0.45);
      Array.prototype.slice.call(heatCard.querySelectorAll('.pv-text')).forEach(function (w, i) {
        staggerChars(w, cardsEnd * 0.55 + i * 120);
      });
    }

    // The heat wave opens a beat before the cards have finished landing, so
    // the two overlap instead of queueing up.
    var n = cells.length;
    if (!n) return;
    var wave = 1500;   // left-to-right spread of the whole wave
    var jitter = 640;  // how far ahead of the wave any one cell may start
    var open = Math.max(0, cardsEnd - 280);

    cells.forEach(function (cell, i) {
      var start = Math.max(0, (i / (n - 1)) * wave - rnd(0, jitter));
      var dur = rnd(520, 780);
      tl.add({
        targets: cell,
        translateZ: [rnd(-880, -540), 0],
        translateY: [rnd(-110, -34), 0],
        rotateX: [rnd(96, 142), 0],
        rotateZ: [rnd(-26, 26), 0],
        scale: [0.55, 1],
        // The colour lands first and the tile finishes tumbling in under
        // it, so the wave reads as a shape arriving rather than as a row
        // of grey squares turning into colour.
        opacity: { value: [0, 1], duration: dur * 0.45, easing: 'linear' },
        duration: dur,
        easing: 'cubicBezier(0.22, 1, 0.36, 1)'
      }, open + start);
    });
  }

  // The intro overlay covers the hero on a first visit, so wait for it to
  // clear rather than playing the whole choreography behind the curtain.
  if (document.documentElement.classList.contains('lander-skipped')) {
    play();
  } else {
    var mo = new MutationObserver(function () {
      if (!document.documentElement.classList.contains('lander-skipped')) return;
      mo.disconnect();
      play();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
})();

// ---- The hero keeps running ----
// A screenshot of a dashboard tells you what the product looks like. One
// that is quietly updating tells you it is alive and local.
//
// The figures hold still and then jump, the way a real one does: a new
// reading lands every few seconds and the digits roll to it. An earlier
// version drifted continuously and always upward, which was wrong twice
// over -- a number that never stops moving reads as a screensaver rather
// than as data, and one that only ever climbs reads as a lie. Here every
// step is signed and the gap between steps is randomised, so two visits
// never look the same and no figure is reliably rising.
//
// The whole block is gated twice over. `canAnimate` covers the device and
// the motion preference; the IntersectionObserver means none of it runs
// once the hero has scrolled away, which is where the battery cost would
// otherwise go.
(function () {
  if (!canAnimate) return;
  var dash = document.querySelector('.preview-dash');
  if (!dash) return;
  if (typeof anime === 'undefined') return;

  var clock = document.getElementById('pvClock');
  var vals = Array.prototype.slice.call(dash.querySelectorAll('.kpi-val'));
  if (!clock && !vals.length) return;

  // Parse "48.2M" / "$312.40" / "5,847" into an affix, a number and a unit,
  // so an updating figure keeps reading exactly like a real one.
  function parseFigure(el) {
    var text = (el.dataset.value || el.textContent).trim();
    var m = text.match(/^([^\d.-]*)(-?[\d.,]+)([\s\S]*)$/);
    if (!m) return null;
    var raw = m[2];
    var end = parseFloat(raw.replace(/,/g, ''));
    if (!isFinite(end)) return null;
    return {
      pre: m[1], post: m[3], end: end,
      decimals: ((raw.split('.')[1] || '').match(/\d/g) || []).length,
      grouped: raw.indexOf(',') !== -1
    };
  }
  function writeFigure(f, v) {
    var n = f.grouped ? Math.round(v).toLocaleString('en-US') : v.toFixed(f.decimals);
    return f.pre + n + f.post;
  }

  var running = true;

  // Each figure keeps its own anchor, which is what it wanders around, and
  // its own value, which is what is on screen. Separating them is what
  // stops the drift compounding: a long run of same-signed steps decays
  // toward the anchor instead of walking off.
  function step(t) {
    // Signed, so the figure is as likely to fall as to rise.
    var pct = (Math.random() * 2 - 1) * 0.028;
    var target = t.anchor * (1 + pct);
    var box = { v: t.value };
    anime({
      targets: box,
      v: target,
      duration: 620,
      easing: 'cubicBezier(0.22, 1, 0.36, 1)',
      update: function () {
        if (!running) return;
        t.el.textContent = writeFigure(t.f, box.v);
      },
      complete: function () {
        t.value = target;
        t.anchor += (t.anchor - target) * 0.35;   // decay toward the anchor
        if (running) t.el.textContent = writeFigure(t.f, target);
      }
    });
  }

  function schedule(t) {
    setTimeout(function () {
      if (running) step(t);
      // Re-randomised every time, so the gaps between readings are not
      // themselves a pattern the eye can lock onto.
      t.next = 2400 + Math.random() * 5200;
      schedule(t);
    }, t.next);
  }

  // The clock runs in real time. It was previously scaled up about
  // threefold, which meant five seconds of the page passing cost fifteen
  // seconds of the clock -- the giveaway that the panel was not real.
  var clockBase = 9 * 3600 + 41 * 60 + 7;   // a plausible mid-morning start
  var clockFrom = 0;
  function paintClock() {
    if (!running) return;
    var total = Math.floor(clockBase + (performance.now() - clockFrom) / 1000) % 86400;
    var hh = String(Math.floor(total / 3600)).padStart(2, '0');
    var mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    var ss = String(Math.floor(total % 60)).padStart(2, '0');
    clock.textContent = 'tokdash · localhost:55423 · ' + hh + ':' + mm + ':' + ss;
  }

  // Nothing starts until the entrance has landed the figures. Started any
  // earlier, a returning visitor (who skips the intro, so the entrance runs
  // first) had the ticker read the zeros the count-up starts from and keep
  // writing them back.
  function start() {
    vals.map(function (el, i) {
      var f = parseFigure(el);
      if (!f) return null;
      return {
        el: el, f: f, value: f.end, anchor: f.end,
        // Different figures land at different times, so the four never
        // change in unison -- synchronised motion reads as a loop.
        next: 2600 + i * 1500 + Math.random() * 3200
      };
    }).filter(Boolean).forEach(schedule);
    if (clock) {
      clockFrom = performance.now();
      paintClock();
      setInterval(paintClock, 1000);
    }
  }
  if (dash.classList.contains('entered')) start();
  else document.addEventListener('tokdash:hero-entered', start, { once: true });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      running = entries.some(function (e) { return e.isIntersecting; });
    }, { threshold: 0.05 });
    io.observe(dash);
  }
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden && dash.getBoundingClientRect().bottom > 0;
  });
})();
