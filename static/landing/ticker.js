// ---- Tools tickers: slow down under the pointer instead of stopping ----
// There are two rows, drifting against each other, and both behave the
// same way under the pointer.
//
// The drift itself is a plain CSS animation, because that is what keeps
// the loop seamless and costs nothing while it runs. What CSS cannot do
// is change the rate of that animation part way through without starting
// it over, and starting it over drops the row sideways mid sweep.
//
// So the rate is retimed through the Web Animations API instead. It has
// a playbackRate that can be changed on a running animation, and changing
// it leaves the animation exactly where it was: the row stays where it
// has drifted to and simply starts taking longer to get from there to
// the next place.
//
// The change is eased rather than applied in one step, so the row settles
// into the slower pace instead of dropping into it. Only the frames of
// that settle are requested, and the loop stops as soon as the rate has
// arrived, so a row that is left alone costs nothing.
(function () {
  // A fifth of the drift speed. Enough to hold a name still enough to aim
  // at it, still moving enough that the row does not look seized.
  var SLOW = 0.2;
  // Roughly the length of one of the page's own transitions, so the row
  // settles at the same pace the rest of the site changes state.
  var SETTLE_MS = 320;

  // The two rows drift opposite ways, so they are two animations and not
  // one: the upper row runs tick-drift, the lower runs tick-drift-back.
  // Either counts as the row's drift.
  var DRIFT_NAMES = { 'tick-drift': 1, 'tick-drift-back': 1 };

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function drive(row, track) {
    var anims = track.getAnimations ? track.getAnimations() : [];
    var drift = null;
    for (var i = 0; i < anims.length; i++) {
      if (DRIFT_NAMES[anims[i].animationName]) { drift = anims[i]; break; }
    }
    // Nothing to retime means one of the fallbacks already decided this
    // row should stand still: reduced motion, no script, or a device the
    // capability gate turned down. Leave those alone.
    if (!drift) return;

    var from = 1, to = 1, frame = 0, started = 0;

    function settle(target) {
      if (target === to && !frame) return;
      from = drift.playbackRate;
      to = target;
      if (frame) cancelAnimationFrame(frame);
      started = 0;
      frame = requestAnimationFrame(function tick(now) {
        if (!started) started = now;
        var t = (now - started) / SETTLE_MS;
        if (t >= 1) {
          drift.playbackRate = to;
          frame = 0;
          return;
        }
        drift.playbackRate = from + (to - from) * easeOut(t);
        frame = requestAnimationFrame(tick);
      });
    }

    row.addEventListener('pointerenter', function () { settle(SLOW); });
    row.addEventListener('pointerleave', function () { settle(1); });
    // A row reached by keyboard gets the same treatment, so the two ways
    // of arriving at a name do not behave differently.
    row.addEventListener('focusin', function () { settle(SLOW); });
    row.addEventListener('focusout', function () { settle(1); });
  }

  function init() {
    if (!canAnimate) return;
    var rows = document.querySelectorAll('.tick-row');
    for (var i = 0; i < rows.length; i++) {
      var track = rows[i].querySelector('.tick-track');
      if (track) drive(rows[i], track);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();