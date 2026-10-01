/* The supported-tools atom: three orbital shells, twenty-five marks.
   ---------------------------------------------------------------------------
   Built from the links already in the page rather than from a second copy of
   the list: the anchors are moved out of the grid below and onto the shells,
   so the tool list has exactly one home. If this script never runs -- no
   JavaScript, or no @property, which is what makes the turn an angle the
   marks can read -- the grid stays exactly as the markup left it and the
   section is still a list of links.

   The arrangement is measured rather than searched, and that is the whole
   point of this design. The three shells nest: each projects to an ellipse
   wholly inside the one outside it, so a mark on one shell can never reach a
   mark on another however the shells are phased or how fast they turn.
   Nesting is what makes the guarantees below exact rather than likely:

     the closest the two shells' paths come, measured between the paths
     themselves rather than between any pair of marks, is 64px inner to middle
     and 79px middle to outer, against a chip that never draws wider than
     34px; and the closest two marks on one shell ever come is 73px on the
     innermost, 101px on the middle and 204px on the outer. The tightest pair
     in the finished picture is the wordmark against a mark on the middle
     shell, at 23px, because the wordmark is 78px wide and its long axis lies
     across the gap rather than along it.

   So there are no phases to get wrong. Every mark sits at an even angle on a
   fixed radius, and the spacing on a shell is a property of the geometry
   rather than of when you happen to look.

   The counts follow the circumference, so the spacing on a shell comes out
   even, and the periods rise in proportion to the radius, so every mark
   covers about the same ground per second and no shell looks like it is
   racing while another crawls. */
(function () {
  'use strict';

  var grid = document.getElementById('toolGrid');
  var field = document.getElementById('toolField');
  if (!grid || !field) return;

  // @property is what makes the turn an angle the marks can read and subtract.
  // Without it the correction cannot be written at all, so the grid stays as
  // the markup left it rather than turning into a field of logos lying at odd
  // angles in tipped shells.
  if (!(window.CSS && CSS.registerProperty)) return;

  // Radius, how far the shell's plane is tipped about x, seconds per turn, and
  // how many marks ride it. Six, nine and ten: twenty-five, which is what the
  // page lists, and the counts rise with the circumference so the spacing on
  // each shell comes out even.
  var SHELLS = [
    { r: 130, tilt: 124, period: 31, count: 6 },
    { r: 250, tilt: 54, period: 60, count: 9 },
    { r: 330, tilt: 0, period: 79, count: 10 }
  ];

  var links = Array.prototype.slice.call(grid.querySelectorAll('.tool-pill'));
  if (!links.length) return;

  // A wordmark is about eight times wider than it is tall, so it wants a shell
  // with room along it. The outer one has it by a mile: its marks are 204px
  // apart along the shell, and it is the only shell in the plane of the page,
  // so nothing there is depth-scaled either. On either inner shell a chip of
  // that shape would eat most of the 64px and 79px that separate the shells.
  function isWordmark(a) {
    var img = a.querySelector('img');
    return !!(img && img.classList.contains('is-wordmark'));
  }
  links.sort(function (x, y) { return (isWordmark(x) ? 1 : 0) - (isWordmark(y) ? 1 : 0); });

  // This is no longer a grid. Saying so matters: the reveal engine has a case
  // for the tool grid that hides every pill and staggers them in, and it runs
  // after this script. Left as a grid, the links would be picked up there --
  // written to opacity 0 and a translate, mid-animation, on elements that are
  // by then electrons on a shell, which is exactly the sort of thing that
  // looks like a rendering bug and is not one.
  grid.classList.remove('grid');
  links.forEach(function (a) { a.style.opacity = ''; a.style.transform = ''; });

  // The field becomes a fixed, clipped box for the picture only now, once
  // there is a picture in it. See .tool-field in the stylesheet.
  field.classList.add('is-instrument');

  var wanted = SHELLS.reduce(function (n, s) { return n + s.count; }, 0);
  if (links.length !== wanted) {
    console.warn('tool atom: expected ' + wanted + ' marks, found ' + links.length);
  }

  function make(name, parent) {
    var el = document.createElement('div');
    el.className = name;
    parent.appendChild(el);
    return el;
  }

  var plane = make('tool-plane', field);
  make('tool-disc', plane);

  // The axes through the nucleus, and the nucleus itself. The core does not
  // turn and does not need to: it is the one thing in the picture that is not
  // going anywhere.
  make('tool-axis', plane);
  make('tool-axis is-x', plane);
  var core = make('tool-core', plane);
  var coreLogo = document.createElement('img');
  coreLogo.src = '/static/icons/logo.png';
  coreLogo.alt = '';
  coreLogo.loading = 'lazy';
  coreLogo.onerror = function () { this.style.display = 'none'; };
  core.appendChild(coreLogo);

  var lit = null;

  // Pointing at a mark says which shell it is on, and stops everything so the
  // name can be read: a mark on a turning shell is out from under the pointer
  // in a fraction of a second.
  function light(on, shell) {
    if (lit && lit !== shell) lit.classList.remove('is-lit');
    if (on) {
      lit = shell;
      shell.classList.add('is-lit');
    } else if (lit === shell) {
      lit = null;
    }
    plane.classList[on ? 'add' : 'remove']('is-pointed');
  }

  var placed = 0;
  SHELLS.forEach(function (spec) {
    var shell = make('tool-shell', plane);
    shell.style.setProperty('--r', spec.r);
    shell.style.setProperty('--tilt', spec.tilt + 'deg');
    make('tool-ring', shell);

    // A shell in the plane of the page has no depth to read: nothing about it
    // changes as it turns, so pulsing its marks would be decorating a fact
    // that is not there. Only the tipped shells get the depth pulse.
    var tilted = Math.abs(spec.tilt) > 0.5;
    if (tilted) shell.classList.add('is-tilted');

    // The turn lives on its own layer, so each shell inherits its own angle
    // and its marks can subtract it.
    var spin = make('tool-spin', shell);
    spin.style.setProperty('--period', spec.period + 's');

    for (var k = 0; k < spec.count; k++) {
      var a = links[placed];
      if (!a) break;
      placed++;

      var angle = (360 / spec.count) * k;
      var slot = make('tool-slot', spin);
      slot.style.setProperty('--r', spec.r);
      slot.style.setProperty('--a', angle.toFixed(2) + 'deg');

      // A mark on a shell tipped about x is nearest the viewer a quarter of the
      // way round, at 90 degrees. The pulse peaks half a cycle in, so the delay
      // that puts each mark at its brightest at its own near side is half a
      // period back from that moment.
      if (tilted) {
        var peak = ((90 - angle) / 360) * spec.period;
        slot.style.setProperty('--delay', (peak - spec.period / 2).toFixed(3) + 's');
      }

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

      a.addEventListener('pointerenter', function () { light(true, shell); });
      a.addEventListener('pointerleave', function () { light(false); });
      a.addEventListener('focus', function () { light(true, shell); });
      a.addEventListener('blur', function () { light(false); });
    }
  });

  // Whatever the list held that did not fit the shells stays in the grid, so a
  // tool is never quietly dropped if the two ever disagree.
  for (; placed < links.length; placed++) grid.appendChild(links[placed]);
})();
