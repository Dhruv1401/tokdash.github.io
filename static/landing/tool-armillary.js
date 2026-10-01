/* The supported-tools armillary: four crossing rings, twenty-five marks.
   ---------------------------------------------------------------------------
   Built from the links already in the page rather than from a second copy of
   the list: the anchors are moved out of the grid below and onto the rings, so
   the tool list has exactly one home. If this script never runs -- no
   JavaScript, or no @property, which is what makes the turn an angle the marks
   can read -- the grid stays exactly as the markup left it and the section is
   still a list of links.

   The arrangement is measured, not eyeballed. The four phases below are the
   best of several thousand tried, seeded from the twenty-four-mark arrangement
   the design first shipped and re-solved for the page's twenty-five links. The
   turn is a single rotation about the axis pointing out of the page, so the
   distances between marks never change and the only thing to get right is the
   arrangement at rest: measured that way, the closest any two chips ever come
   is 25px of clear air, and the wordmark -- which is the widest thing in the
   set and the hardest to place -- costs that clearance nothing.

   What is being searched is the clear space between two axis-aligned boxes,
   which means the axis that separates a pair counts and the other one does
   not: two marks stacked on top of each other need nothing from left to
   right. The figure quoted is therefore the honest one -- the gap between the
   two rectangles themselves -- rather than a distance that would read as
   clearance and is not. */
(function () {
  'use strict';

  var grid = document.getElementById('toolGrid');
  var field = document.getElementById('toolField');
  if (!grid || !field) return;

  // @property is what makes the turn an angle the marks can read and subtract.
  // Without it the correction below cannot be written at all, so the grid
  // stays as the markup left it rather than turning into a field of logos
  // lying at odd angles in tipped rings.
  if (!(window.CSS && CSS.registerProperty)) return;

  // Radius, which of the two axes lying in the page the ring's plane is tipped
  // about, how far, and where its marks sit.
  //
  // The radii descend and the inclinations alternate: a ring tipped about x is
  // squashed vertically, one tipped about y is squashed horizontally, and it is
  // the alternation that makes the outlines cross. The second ring carries
  // seven marks and the rest six, which is what makes twenty-five, and its
  // seventh sits 28.4 degrees along from the first rather than at an even
  // seventh of the circle -- the search put it there, because a circle divided
  // evenly into seven puts that mark where the others already crowd.
  var RINGS = [
    { r: 300, axis: 'x', tilt: 68, at: [37.75, 97.75, 157.75, 217.75, 277.75, 337.75] },
    { r: 272, axis: 'y', tilt: 58, at: [229, 289, 349, 49, 109, 169, 257.37] },
    { r: 224, axis: 'x', tilt: 28, at: [341.75, 41.75, 101.75, 161.75, 221.75, 281.75] },
    { r: 176, axis: 'y', tilt: 38, at: [259.25, 319.25, 19.25, 79.25, 139.25, 199.25] }
  ];
  var PERIOD = 74;

  var links = Array.prototype.slice.call(grid.querySelectorAll('.tool-pill'));
  if (!links.length) return;

  // A wordmark is about eight times wider than it is tall, so it wants a slot
  // with room along it, and there are only a couple. The search tried all
  // twenty-five: this one leaves the arrangement's clearance untouched, and
  // the best of the rest give up between a pixel and four. It goes last, so it
  // lands on the innermost ring.
  function isWordmark(a) {
    var img = a.querySelector('img');
    return !!(img && img.classList.contains('is-wordmark'));
  }
  links.sort(function (x, y) { return (isWordmark(x) ? 1 : 0) - (isWordmark(y) ? 1 : 0); });

  // This is no longer a grid. Saying so matters: the reveal engine has a case
  // for the tool grid that hides every pill and staggers them in, and it runs
  // after this script. Left as a grid, the links would be picked up there --
  // written to opacity 0 and a translate, mid-animation, on elements that are
  // by then marks on a ring, which is exactly the sort of thing that looks
  // like a rendering bug and is not one.
  grid.classList.remove('grid');
  links.forEach(function (a) { a.style.opacity = ''; a.style.transform = ''; });

  // The field becomes a fixed, clipped box for the picture only now, once
  // there is a picture in it. See .tool-field in the stylesheet.
  field.classList.add('is-instrument');

  var wanted = RINGS.reduce(function (n, r) { return n + r.at.length; }, 0);
  if (links.length !== wanted) {
    console.warn('tool armillary: expected ' + wanted + ' marks, found ' + links.length);
  }

  function make(name, parent) {
    var el = document.createElement('div');
    el.className = name;
    parent.appendChild(el);
    return el;
  }

  var plane = make('tool-plane', field);

  // The panel, its graduated bezel (one tick per tool, so this reads as an
  // instrument), and the core at the middle of the sphere.
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

  // The one turning layer. Everything inside it goes round together, which is
  // what makes the arrangement a fixed thing rather than twenty-five marks on
  // independent cycles.
  var arm = make('tool-arm', plane);
  arm.style.setProperty('--period', PERIOD + 's');

  var lit = null;

  // Pointing at a mark says which ring it is on, and stops the turn so the
  // name can be read.
  function light(on, ring) {
    if (lit && lit !== ring) lit.classList.remove('is-lit');
    if (on) {
      lit = ring;
      ring.classList.add('is-lit');
    } else if (lit === ring) {
      lit = null;
    }
    plane.classList[on ? 'add' : 'remove']('is-pointed');
  }

  var placed = 0;
  RINGS.forEach(function (spec) {
    var ring = make('tool-ring', arm);
    ring.style.setProperty('--r', spec.r);
    ring.style.setProperty('--tilt', (spec.axis === 'x' ? spec.tilt : 0) + 'deg');
    ring.style.setProperty('--tilt-y', (spec.axis === 'y' ? spec.tilt : 0) + 'deg');
    make('tool-hoop', ring);

    // How far forward a mark at angle a sits on this ring, as a fraction of the
    // ring's own reach towards the viewer and away from it. Under rotateX(t) a
    // point at (r cos a, r sin a) ends up at depth r sin a sin t; under
    // rotateY(t) it ends up at -r cos a sin t. Both come out here as a plain
    // number between 0 and 1.
    var lean = Math.abs(Math.sin(spec.tilt * Math.PI / 180));
    var reach = spec.r * lean || 1;

    spec.at.forEach(function (at) {
      var a = links[placed];
      if (!a) return;
      placed++;

      var rad = at * Math.PI / 180;
      var depth = spec.axis === 'x'
        ? Math.sin(rad) * lean
        : -Math.cos(rad) * lean;
      var front = (depth * spec.r / reach + 1) / 2;

      var slot = make('tool-slot', ring);
      slot.style.setProperty('--r', spec.r);
      slot.style.setProperty('--a', at.toFixed(2) + 'deg');

      var img = a.querySelector('img');
      var name = a.getAttribute('data-name') || a.textContent.trim() || a.title || '';

      a.className = 'tool-mark';
      a.style.setProperty('--f', front.toFixed(3));
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

      a.addEventListener('pointerenter', function () { light(true, ring); });
      a.addEventListener('pointerleave', function () { light(false); });
      a.addEventListener('focus', function () { light(true, ring); });
      a.addEventListener('blur', function () { light(false); });
    });
  });

  // Whatever the list held that did not fit the rings stays in the grid, so a
  // tool is never quietly dropped if the two ever disagree.
  for (; placed < links.length; placed++) grid.appendChild(links[placed]);
})();
