// ---- Tools tickers: two rows, drifting against each other, connected ----
// The upper row drifts left, the lower row drifts right, and a mark that
// runs off the end of one turns up in the other. The pair is one loop: a
// mark crosses the upper row to the left, steps across into the lower row
// at its left edge, crosses that to the right, and steps back up into the
// upper row at its right edge.
//
// This is why the drift is script rather than a CSS animation. A mark has
// to be moved from one track to the other at the moment it leaves, and
// the only way to know that moment is to know where every mark is on every
// frame. A keyframe cannot see the marks, so the positions are kept here
// and written straight onto them.
//
// Both ends of every handover are under the row's fade, so a mark is never
// seen leaving or arriving: it is simply not there for the frame in which
// it changes rows.
(function () {
  // The drift, in pixels a second. This is the rate the single ticker used
  // to run at, kept so the pair reads at the same pace. A mark crosses one
  // row and then the other, so a tool still comes round about as often as
  // it used to.
  var SPEED = 82;
  // A fifth of the drift speed. Enough to hold a name still enough to aim
  // at it, still moving enough that the rows do not look seized.
  var SLOW = 0.2;
  // Roughly the length of one of the page's own transitions, so the rows
  // settle at the same pace the rest of the site changes state.
  var SETTLE_MS = 320;
  // A backgrounded tab hands back one enormous frame on return. Letting
  // that through would move every mark metres in a single step.
  var MAX_FRAME_MS = 64;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // ---- One pace for the pair ----
  // The two rows cannot be slowed apart. The handover only happens when
  // both rows are holding a mark that has gone, so a row running at full
  // speed beside one running slow spends marks off the end of the window
  // faster than they are replaced: it thins out, and then it is blank.
  // Pointing at one row has to point at both.
  //
  // The count is what makes moving between the rows work. Leaving the upper
  // row at the moment the pointer has already arrived on the lower one must
  // not let go of a row that is still being pointed at, or the pair flickers
  // between slow and full speed crossing the gap between them.
  function Pace() {
    this.held = 0;
    this.speed = 1;
    this.from = 1;
    this.to = 1;
    this.frame = 0;
    this.started = 0;
  }

  Pace.prototype.hold = function () {
    this.held++;
    if (this.held === 1) this.settle(SLOW);
  };

  Pace.prototype.release = function () {
    if (this.held > 0) this.held--;
    if (this.held === 0) this.settle(1);
  };

  // Eased rather than applied in one step, so the rows settle into the
  // slower pace instead of dropping into it.
  Pace.prototype.settle = function (target) {
    if (target === this.to && !this.frame) return;
    this.from = this.speed;
    this.to = target;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.started = 0;
    var self = this;
    this.frame = requestAnimationFrame(function tick(now) {
      if (!self.started) self.started = now;
      var t = (now - self.started) / SETTLE_MS;
      if (t >= 1) {
        self.speed = self.to;
        self.frame = 0;
        return;
      }
      self.speed = self.from + (self.to - self.from) * easeOut(t);
      self.frame = requestAnimationFrame(tick);
    });
  };

  // ---- One row ----
  // `dir` is -1 for a row drifting left and +1 for one drifting right.
  // Marks are held left to right in `items` whatever order the DOM is in,
  // because that is the order they change hands in: a row drifting left
  // loses the mark at the front, one drifting right loses the mark at the
  // back.
  //
  // The row owns where its marks are and nothing else. How fast they are
  // going belongs to the pace, which both rows share.
  function Row(el, track, dir, pace) {
    this.el = el;
    this.track = track;
    this.dir = dir;
    this.pace = pace;
    this.items = [];
    this.gap = 32;
    this.width = 0;

    el.addEventListener('pointerenter', function () { pace.hold(); });
    el.addEventListener('pointerleave', function () { pace.release(); });
    // A row reached by keyboard gets the same treatment, so the two ways
    // of arriving at a name do not behave differently.
    el.addEventListener('focusin', function () { pace.hold(); });
    el.addEventListener('focusout', function () { pace.release(); });
  }

  // Read the gap off the row rather than repeating the number here, so the
  // space between two marks is whatever the stylesheet says it is.
  Row.prototype.readGap = function () {
    var n = parseFloat(getComputedStyle(this.track).getPropertyValue('--tick-gap'));
    this.gap = isNaN(n) ? 32 : n;
  };

  // Lay the marks out side by side from the track's left edge, and take the
  // height the layout gave them: an absolutely placed mark is out of flow,
  // so nothing else would hold the row open.
  Row.prototype.layout = function () {
    var kids = this.track.children, i, h = 0, x = 0, kid;
    this.items = [];
    for (i = 0; i < kids.length; i++) {
      kid = kids[i];
      if (kid.offsetHeight > h) h = kid.offsetHeight;
      kid._x = x;
      kid._w = kid.offsetWidth;
      x += kid._w + this.gap;
      this.items.push(kid);
    }
    this.track.style.height = h + 'px';
  };

  Row.prototype.draw = function () {
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      it.style.transform = 'translate3d(' + it._x.toFixed(2) + 'px,0,0)';
    }
  };

  Row.prototype.step = function (dx) {
    for (var i = 0; i < this.items.length; i++) this.items[i]._x += dx;
  };

  // The mark that has run right off the end of the row: the leftmost on a
  // row drifting left, the rightmost on one drifting right.
  Row.prototype.gone = function () {
    if (!this.items.length) return null;
    var it = this.dir < 0 ? this.items[0] : this.items[this.items.length - 1];
    return (this.dir < 0 ? it._x + it._w < 0 : it._x > this.width) ? it : null;
  };

  Row.prototype.take = function (it) {
    var i = this.items.indexOf(it);
    if (i < 0) return false;
    this.items.splice(i, 1);
    return true;
  };

  // Put a mark in at one end, immediately behind whichever mark is already
  // nearest that end. It lands off the edge of the window: a row only ever
  // hands over when its nearest mark has already gone off that edge, which
  // is what leaves the space for it. It drifts into view from there.
  Row.prototype.give = function (it, atLeft) {
    var edge = atLeft ? this.items[0] : this.items[this.items.length - 1];
    if (atLeft) {
      it._x = edge ? edge._x - this.gap - it._w : -it._w;
      this.items.unshift(it);
    } else {
      it._x = edge ? edge._x + edge._w + this.gap : this.width;
      this.items.push(it);
    }
    this.track.appendChild(it);
  };

  function init() {
    if (!canAnimate) return;

    var rows = document.querySelectorAll('.tick-row');
    // Two rows is the whole idea. Anything else is not this component.
    if (rows.length !== 2) return;

    var pace = new Pace();
    var top = new Row(rows[0], rows[0].querySelector('.tick-track'),
      rows[0].classList.contains('tick-row-back') ? 1 : -1, pace);
    var bottom = new Row(rows[1], rows[1].querySelector('.tick-track'),
      rows[1].classList.contains('tick-row-back') ? 1 : -1, pace);

    function measure() {
      top.readGap();
      bottom.readGap();
      top.layout();
      bottom.layout();
      top.width = top.el.clientWidth;
      bottom.width = bottom.el.clientWidth;
      top.draw();
      bottom.draw();
    }

    measure();
    // The class goes on last, once there is something in place to move the
    // marks: a row is never drawn in its drifting state without a position
    // behind every mark.
    document.documentElement.classList.add('tick-live');

    var last = 0;
    function frame(now) {
      var dt = last ? now - last : 16;
      last = now;
      if (dt > MAX_FRAME_MS) dt = MAX_FRAME_MS;

      top.step(-SPEED * pace.speed * dt / 1000);
      bottom.step(SPEED * pace.speed * dt / 1000);

      // The handover. A mark leaving the upper row reappears in the lower
      // one at its left edge, and a mark leaving the lower row reappears in
      // the upper one at its right edge, so each mark turns round rather
      // than running off the end of the section.
      //
      // Both rows have to be holding a mark that has gone before either
      // gives one up. That is what keeps them the same size: each loses one
      // and gains one in the same step, so the pair always holds
      // twenty-four marks and a mark is never in both rows at once.
      var away = top.gone();
      var back = bottom.gone();
      if (away && back && top.take(away) && bottom.take(back)) {
        bottom.give(away, true);
        top.give(back, false);
      }

      top.draw();
      bottom.draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // The window can change width, and the edge a mark has to clear to count
    // as gone is that width. The marks themselves are content-sized and do
    // not move, so nothing has to be laid out again.
    window.addEventListener('resize', function () {
      top.width = top.el.clientWidth;
      bottom.width = bottom.el.clientWidth;
    });

    // A webfont arriving changes how wide a name is, which changes where
    // every mark after it sits. Lay the rows out again once, when the fonts
    // have settled.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();