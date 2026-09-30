// ---- Scroll-driven Staggered Reveal Engine ----
(function () {
  var root = document.documentElement;
  var isReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var allReveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (isReduced || !('IntersectionObserver' in window) || typeof anime === 'undefined') {
    allReveals.forEach(function (e) { e.classList.add('in'); });
    return;
  }

  root.classList.add('anim-active');
  var handledSet = new WeakSet();

  // Per-property timing, which is the one thing here worth taking from the
  // library's own notes. Travelling and fading on one curve means the text
  // is still arriving at the same moment the card is, so the eye follows
  // the movement and reads nothing until it stops. Letting the opacity
  // finish early and the position settle on a spring means the words are
  // already legible while the card is still finding its place, and the
  // spring leaves it with about a pixel of overshoot on the way, which is
  // what separates an arrival from a slide.
  //
  // Under reduced motion both collapse to one plain fade, and the spring
  // is not used at all.
  function lift(el, travel, duration, delay) {
    var p = { targets: el, duration: isReduced ? 550 : duration };
    if (isReduced) {
      p.opacity = [0, 1];
      p.easing = 'linear';
    } else {
      p.opacity = { value: [0, 1], duration: duration * 0.5, easing: 'linear' };
      p.translateY = { value: [travel, 0], easing: 'spring(1, 120, 14, 0)' };
    }
    if (delay != null) p.delay = delay;
    return p;
  }

  // Spring-lift animation for a single element
  function animateSingle(el) {
    if (!el || handledSet.has(el) || el.classList.contains('in')) return;
    handledSet.add(el);

    anime(Object.assign(lift(el, 26, 750), {
      begin: function () {
        el.style.willChange = 'transform, opacity';
      },
      complete: function () {
        el.classList.add('in');
        el.style.willChange = '';
        el.style.transform = '';
      }
    }));
  }

  // Cascading stagger animation for a group/grid of cards
  function animateGrid(parent, items, staggerMs) {
    var unhandled = items.filter(function (el) {
      return !handledSet.has(el) && !el.classList.contains('in');
    });
    if (!unhandled.length) return;

    unhandled.forEach(function (el) { handledSet.add(el); });

    var params = lift(unhandled, 28, 750, anime.stagger(isReduced ? 25 : (staggerMs || 55), { start: 40 }));
    Object.assign(params, {
      begin: function (anim) {
        anim.animatables.forEach(function (a) {
          a.target.style.willChange = 'transform, opacity';
        });
      },
      complete: function (anim) {
        anim.animatables.forEach(function (a) {
          a.target.classList.add('in');
          a.target.style.willChange = '';
          a.target.style.transform = '';
        });
      }
    });
    anime(params);
  }

  // Detect grid/group containers that have 2 or more direct reveal children
  var managedParents = [];
  allReveals.forEach(function (el) {
    var parentGrid = el.closest('.grid');
    if (parentGrid && parentGrid !== el) {
      if (!managedParents.some(function (mp) { return mp.container === parentGrid; })) {
        var siblings = Array.prototype.slice.call(parentGrid.querySelectorAll(':scope > .reveal, :scope > div > .reveal'));
        if (siblings.length >= 2) {
          managedParents.push({
            container: parentGrid,
            items: siblings,
            stagger: siblings.length > 8 ? 40 : 60
          });
        }
      }
    }
  });

  // Special handling for #tools .grid (24+ tool pills)
  var toolsGrid = document.querySelector('#tools .grid');
  if (toolsGrid) {
    var pills = Array.prototype.slice.call(toolsGrid.querySelectorAll('.tool-pill'));
    if (pills.length > 0) {
      toolsGrid.classList.add('in');
      pills.forEach(function (p) {
        p.style.opacity = '0';
        if (!isReduced) p.style.transform = 'translateY(18px)';
      });
      managedParents.push({
        container: toolsGrid,
        items: pills,
        stagger: 24
      });
    }
  }

  // Observer for grid containers
  var groupIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var match = managedParents.find(function (g) { return g.container === entry.target; });
        if (match) {
          animateGrid(match.container, match.items, match.stagger);
          groupIo.unobserve(entry.target);
        }
      }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

  managedParents.forEach(function (g) {
    groupIo.observe(g.container);
  });

  // Observer for individual standalone .reveal elements
  var singleIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var isInsideManagedGrid = managedParents.some(function (g) {
          return g.items.indexOf(entry.target) !== -1 || (g.container === entry.target);
        });
        if (!isInsideManagedGrid) {
          animateSingle(entry.target);
        }
        singleIo.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.08 });

  allReveals.forEach(function (el) {
    var isManagedContainer = managedParents.some(function (g) { return g.container === el; });
    if (!isManagedContainer) {
      singleIo.observe(el);
    }
  });
})();

// ---- Drawable SVGs Engine (Stroked Line Art Reveals) ----
(function () {
  if (typeof anime === 'undefined') return;

  var isReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReduced) return;

  var DRAW_EASING = 'cubicBezier(0.759, 0.059, 0.381, 0.929)';

  var drawableSvgs = Array.prototype.slice.call(
    document.querySelectorAll('.feature-icon svg, .svg-drawable, .copy-glyph, a.btn svg, .btn svg')
  );

  function getStrokables(svg) {
    var shapes = Array.prototype.slice.call(
      svg.querySelectorAll('path, rect, circle, line, polyline, polygon')
    );
    return shapes.filter(function (shape) {
      var stroke = shape.getAttribute('stroke');
      if (!stroke || stroke === 'none') {
        var comp = window.getComputedStyle(shape).stroke;
        if (!comp || comp === 'none') return false;
      }
      return true;
    });
  }

  function getFills(svg) {
    var shapes = Array.prototype.slice.call(
      svg.querySelectorAll('path, circle, rect')
    );
    return shapes.filter(function (shape) {
      if (shape.classList.contains('copy-front') || shape.classList.contains('copy-back')) return false;
      var fill = shape.getAttribute('fill');
      return fill && fill !== 'none' && fill !== 'transparent';
    });
  }

  // Initialize all drawable SVGs: calculate and set dashoffset so they are ready to draw
  drawableSvgs.forEach(function (svg) {
    var strokables = getStrokables(svg);
    var fills = getFills(svg);

    strokables.forEach(function (s) {
      var len = anime.setDashoffset(s);
      s.style.strokeDashoffset = len;
    });

    fills.forEach(function (f) {
      f.style.opacity = '0';
    });
  });

  function drawSvg(svg) {
    if (!svg || svg.dataset.drawn === 'true') return;
    svg.dataset.drawn = 'true';

    var strokables = getStrokables(svg);
    var fills = getFills(svg);

    if (strokables.length > 0) {
      anime({
        targets: strokables,
        strokeDashoffset: [anime.setDashoffset, 0],
        duration: 1100,
        delay: anime.stagger(90, { start: 40 }),
        easing: DRAW_EASING,
        complete: function (anim) {
          anim.animatables.forEach(function (a) {
            if (a.target.classList.contains('copy-front') || a.target.classList.contains('copy-back')) {
              a.target.removeAttribute('stroke-dasharray');
              a.target.removeAttribute('stroke-dashoffset');
              a.target.style.strokeDasharray = '';
              a.target.style.strokeDashoffset = '';
            }
          });
        }
      });
    }

    if (fills.length > 0) {
      // Filled shapes used an ease-in curve, so they were invisible for
      // the first two hundred and forty milliseconds of their six hundred
      // and then arrived all at once, just as the outline finished. A
      // fill that is there early and an outline drawn on top of it read
      // as one object being assembled; a fill that arrives last read as a
      // second object turning up.
      anime({
        targets: fills,
        opacity: [0, 1],
        duration: 600,
        delay: anime.stagger(80, { start: 400 }),
        easing: 'easeOutQuad'
      });
    }
  }

  // IntersectionObserver to trigger line drawing when SVGs scroll into view
  if (!('IntersectionObserver' in window)) {
    drawableSvgs.forEach(drawSvg);
    return;
  }

  var svgIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        drawSvg(entry.target);
        svgIo.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -5% 0px', threshold: 0.1 });

  drawableSvgs.forEach(function (svg) {
    svgIo.observe(svg);
  });
})();
