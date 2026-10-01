/* The supported-tools instrument: five concentric orbits, twenty-five marks.
   ---------------------------------------------------------------------------
   Built from the links already in the page rather than from a second copy of
   the list: the anchors are moved out of the grid below and into the orbits,
   so the tool list has exactly one home. If this script never runs -- no
   JavaScript, or no @property, which is what makes --spin an angle the marks
   can read -- the grid stays exactly as the markup left it and the section is
   still a list of links.

   The arrangement is measured, not eyeballed. The five orbits step 62px in
   radius, so a mark on one orbit and a mark on the next can never be closer
   than 62px centre to centre; marks on one orbit are evenly spaced and turn
   together, so their spacing never changes either, the tightest being 180px
   on the innermost orbit's three. Every mark is a 34px chip except the one
   wordmark in the set, which is 78 by 24 and rides the outermost orbit, where
   its neighbours along the orbit are 305px away. Measured over a full turn,
   the closest any two chips ever come is 15px corner to corner -- which is
   the diagonal case, two 34px boxes whose centres are 62px apart -- and
   nothing can overlap. */
(function () {
  'use strict';

  var grid = document.getElementById('toolGrid');
  var field = document.getElementById('toolField');
  if (!grid || !field) return;

  // @property is what makes --spin an angle the marks can read and subtract.
  // Without it the correction below cannot be written at all, so the grid
  // stays as the markup left it rather than turning into a field of logos
  // lying at odd angles.
  if (!(window.CSS && CSS.registerProperty)) return;

  // Radius, how many marks ride it, and seconds per turn.
  //
  // The radii step by 62 and the counts are 3, 4, 5, 6, 7: twenty-five marks,
  // which is what the page lists. Counts follow the circumference, so the
  // spacing on an orbit comes out even rather than crowded at the top, and
  // the periods rise in proportion to the radius, so every mark covers about
  // the same ground per second -- 28px, near enough, from the innermost to
  // the outermost -- and no orbit looks like it is racing while another crawls.
  var ORBITS = [
    { r: 104, count: 3, period: 24 },
    { r: 166, count: 4, period: 37 },
    { r: 228, count: 5, period: 51 },
    { r: 290, count: 6, period: 65 },
    { r: 352, count: 7, period: 79 }
  ];

  var links = Array.prototype.slice.call(grid.querySelectorAll('.tool-pill'));
  if (!links.length) return;

  // A wordmark is about eight times wider than it is tall, so it wants an
  // orbit with room along it. The outer one has it: its marks are 305px apart
  // along the orbit and there is nothing outside it at all, where a wide mark
  // on a middle orbit eats most of the 62px that separates the rings from each
  // other. Everything else keeps the order the page lists it in.
  function isWordmark(a) {
    var img = a.querySelector('img');
    return !!(img && img.classList.contains('is-wordmark'));
  }
  links.sort(function (x, y) { return (isWordmark(x) ? 1 : 0) - (isWordmark(y) ? 1 : 0); });

  // This is no longer a grid. Saying so matters: the reveal engine has a case
  // for the tool grid that hides every pill and staggers them in, and it runs
  // after this script. Left as a grid, the links would be picked up there --
  // written to opacity 0 and a translate, mid-animation, on elements that are
  // by then marks on an orbit, which is exactly the sort of thing that looks
  // like a rendering bug and is not one.
  grid.classList.remove('grid');
  links.forEach(function (a) { a.style.opacity = ''; a.style.transform = ''; });

  // The field becomes a fixed, clipped box for the picture only now, once
  // there is a picture in it. See .tool-field in the stylesheet.
  field.classList.add('is-instrument');

  var wanted = ORBITS.reduce(function (n, o) { return n + o.count; }, 0);
  if (links.length !== wanted) {
    console.warn('tool orbits: expected ' + wanted + ' marks, found ' + links.length);
  }

  function make(name, parent) {
    var el = document.createElement('div');
    el.className = name;
    parent.appendChild(el);
    return el;
  }

  var plane = make('tool-plane', field);

  // The panel, its graduated edge (one tick per tool, so the instrument reads
  // as an instrument), and the core.
  make('tool-disc', plane);
  var ticks = make('tool-ticks', plane);
  ticks.style.setProperty('--tick', (360 / links.length).toFixed(3) + 'deg');
  var core = make('tool-core', plane);
  var coreLogo = document.createElement('img');
  coreLogo.src = '/static/icons/logo.png';
  coreLogo.alt = '';
  coreLogo.loading = 'lazy';
  coreLogo.onerror = function () { this.style.display = 'none'; };
  core.appendChild(coreLogo);

  var lit = null;

  // Pointing at a mark says which orbit it is on and where on it, and stops
  // the turn so the name can be read: a mark on a turning circle is out from
  // under the pointer in a fraction of a second.
  function light(on, orbit, angle) {
    if (lit && lit !== orbit) lit.classList.remove('is-lit');
    if (on) {
      lit = orbit;
      orbit.classList.add('is-lit');
      orbit.style.setProperty('--lit', angle);
    } else if (lit === orbit) {
      lit = null;
    }
    plane.classList[on ? 'add' : 'remove']('is-pointed');
  }

  var placed = 0;
  ORBITS.forEach(function (spec, i) {
    var orbit = make('tool-orbit', plane);
    orbit.style.setProperty('--r', spec.r);
    orbit.style.setProperty('--period', spec.period + 's');
    // Depth without a single degree of tilt: each orbit out is drawn a little
    // smaller and a little dimmer than the one inside it.
    orbit.style.setProperty('--o', (1 - i * 0.085).toFixed(3));
    orbit.style.setProperty('--s', (1 - i * 0.055).toFixed(3));
    make('tool-ring', orbit);

    var spin = make('tool-spin', orbit);
    // The arc lives inside the turning layer, so "the top" it grows from is
    // the top of that layer and the angle to the mark is the mark's own place
    // on the orbit -- a number that never changes while it turns.
    make('tool-arc', spin);

    for (var k = 0; k < spec.count; k++) {
      var a = links[placed];
      if (!a) break;
      placed++;

      var angle = (360 / spec.count) * k;
      var slot = make('tool-slot', spin);
      slot.style.setProperty('--a', angle.toFixed(2) + 'deg');

      // The tail and the mark share one slot, so the tail is always exactly
      // behind its own mark.
      make('tool-tail', slot);

      var img = a.querySelector('img');
      var name = a.getAttribute('data-name') || a.textContent.trim() || a.title || '';

      a.className = 'tool-mark';
      if (isWordmark(a)) {
        // Squashed into a square chip a wordmark is four pixels of nothing, so
        // it gets a chip of its own shape instead.
        a.style.setProperty('--w', '78px');
        a.style.setProperty('--h', '24px');
        img.classList.remove('is-wordmark');
      }

      var face = document.createElement('span');
      face.className = 'tool-face';
      if (img) {
        // The name span below carries the accessible name from here on.
        img.alt = '';
        face.appendChild(img);
      }
      // Safe now: the logo has been moved out, so this only takes the text.
      a.textContent = '';
      var label = document.createElement('span');
      label.className = 'tool-name';
      label.textContent = name;
      face.appendChild(label);
      a.appendChild(face);

      slot.appendChild(a);

      a.addEventListener('pointerenter', function () { light(true, orbit, angle + 'deg'); });
      a.addEventListener('pointerleave', function () { light(false); });
      a.addEventListener('focus', function () { light(true, orbit, angle + 'deg'); });
      a.addEventListener('blur', function () { light(false); });
    }
  });

  // Whatever the list held that did not fit the orbits stays in the grid, so
  // a tool is never quietly dropped if the two ever disagree.
  for (; placed < links.length; placed++) grid.appendChild(links[placed]);
})();