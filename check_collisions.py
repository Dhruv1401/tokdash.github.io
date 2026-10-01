#!/usr/bin/env python3
"""Collision + console checker for the orbital demos.

Each demo claims, in its own comments, that no two marks can ever land on top
of each other. This proves it rather than trusting it.

For every mark it rebuilds the mark's four corners by composing the CSS
transforms of the mark and each of its ancestors -- including any `perspective`
-- and projects them to screen coordinates. That gives the mark's real
quadrilateral, not an axis-aligned box around it, and lets the overlap between
two marks be measured as an area. A run reports

  * the largest overlap area ever seen between any two marks (must be 0),
  * the closest two marks ever come, centre to centre,
  * the widest a mark ever draws,

plus any console errors or broken images.

Bounding boxes would have been the obvious thing to measure and they are not
good enough: a mark inside a `preserve-3d` subtree reports a box whose centre
drifts by up to 16px as its depth animation runs, so a box can report an
overlap that is not on screen and a separation that is too large.

Usage: python3 check_collisions.py <demo-file.html> [seconds] [samples] [WxH]
"""
import sys
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
SEL = '.mark, .star, .node'

JS = r"""
(sel) => {
  // One style read per element per sample, memoised. Reading a mark's
  // ancestors once per mark would hand some marks one animation frame and
  // others the next, which makes a rigid rotation look like it is stretching.
  // Two maps keyed by element: a single map would collide, because string keys
  // built from an element are all "[object HTMLAnchorElement]".
  const styleCache = new Map();
  const matCache = new Map();
  const style = (el) => {
    let s = styleCache.get(el);
    if (!s) { s = getComputedStyle(el); styleCache.set(el, s); }
    return s;
  };

  // ---- Compose one element's own transform about its transform-origin ----
  const own = (el) => {
    let m = matCache.get(el);
    if (m) return m;
    const cs = style(el);
    const t = cs.transform === 'none' || cs.transform === ''
      ? new DOMMatrix()
      : new DOMMatrix(cs.transform);
    const o = cs.transformOrigin.trim().split(/\s+/).map(parseFloat);
    const ox = o[0] || 0, oy = o[1] || 0;
    m = new DOMMatrix()
      .translate(ox, oy).multiply(t).translate(-ox, -oy);
    matCache.set(el, m);
    return m;
  };

  // ---- Accumulated matrix for an element, from the root down ----
  // The chain follows offsetParent, not parentElement, because what a child's
  // transform is composed onto is its LAYOUT position in the offset parent:
  // a mark pulled half its own width back with a negative margin sits at
  // (-13, -13) in its slot, and a transform composed without that would
  // pivot the mark's depth animation on the slot's origin instead of on the
  // mark, throwing the marks tens of pixels apart as they swell.
  const chainCache = new Map();
  const chainUp = (el) => {
    if (chainCache.has(el)) return chainCache.get(el);
    const list = [];
    for (let e = el; e; e = e.offsetParent) {
      const p = style(e).perspective;
      list.push({
        el: e,
        perspective: (p && p !== 'none') ? parseFloat(p) : 0,
        x: e.offsetLeft || 0,
        y: e.offsetTop || 0
      });
      // Stop at the nearest ancestor that establishes a perspective: the
      // projection belongs there, applied to that element's whole subtree.
      if (list[list.length - 1].perspective) break;
    }
    const chain = list.reverse();
    chainCache.set(el, chain);
    return chain;
  };

  const project = (chain, x, y) => {
    // world(E) = world(offsetParent(E)) * T(E's layout offset) * own(E), so
    // walking from the root down means multiplying on the right: the parent's
    // transform is already on the left and this element is composed onto it.
    let m = new DOMMatrix();
    for (const link of chain) {
      if (link.x || link.y) m = m.multiply(new DOMMatrix().translate(link.x, link.y));
      m = m.multiply(own(link.el));
      if (link.perspective) {
        const cs = style(link.el);
        const o = cs.perspectiveOrigin.trim().split(/\s+/).map(parseFloat);
        const ox = o[0] || 0, oy = o[1] || 0;
        // m43 is the perspective term: DOMMatrix names its elements by
        // column then row, so the -1/d that belongs at row 3, column 4 of
        // the matrix is m43. m34 is a different cell here, and setting it
        // quietly produced a projection that was wrong by tens of pixels.
        const p = new DOMMatrix();
        p.m43 = -1 / link.perspective;
        m = m.multiply(
          new DOMMatrix().translate(ox, oy).multiply(p).translate(-ox, -oy));
      }
    }
    const q = m.transformPoint(new DOMPoint(x, y, 0));
    return [q.x, q.y];
  };

  // ---- Sutherland-Hodgman: clip `subject` to convex `clip` ----
  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const area = (poly) => {
    let a = 0;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a) / 2;
  };

  // ---- Convex hull (Andrew monotone chain) ----
  const hull = (pts) => {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const lower = [];
    for (const q of p) {
      while (lower.length >= 2 &&
             cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
      lower.push(q);
    }
    const upper = [];
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (upper.length >= 2 &&
             cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
      upper.push(q);
    }
    lower.pop(); upper.pop();
    const h = lower.concat(upper);
    // Counter-clockwise, so the clipping test below is the inside.
    let a = 0;
    for (let i = 0; i < h.length; i++) {
      const q = h[i], r = h[(i + 1) % h.length];
      a += q[0] * r[1] - r[0] * q[1];
    }
    return a < 0 ? h.reverse() : h;
  };

  const clipTo = (subject, clip) => {
    let out = subject;
    for (let i = 0; i < clip.length && out.length; i++) {
      const a = clip[i], b = clip[(i + 1) % clip.length];
      const input = out;
      out = [];
      for (let j = 0; j < input.length; j++) {
        const c = input[j], d = input[(j + 1) % input.length];
        const ci = cross(a, b, c), di = cross(a, b, d);
        if (ci >= 0) out.push(c);
        if ((ci > 0 && di < 0) || (ci < 0 && di > 0)) {
          const t = ci / (ci - di);
          out.push([c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t]);
        }
      }
    }
    return out;
  };

  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) continue;
    const chain = chainUp(el);
    // The mark's own box, with no padding: a mark's glow is soft light, and
    // two glows running together is the look, not a collision. What has to
    // stay apart is the logo itself.
    const corners = [
      [0, 0], [w, 0], [w, h], [0, h]
    ].map(([x, y]) => project(chain, x, y));
    const quad = hull(corners);
    const cx = quad.reduce((a, p) => a + p[0], 0) / quad.length;
    const cy = quad.reduce((a, p) => a + p[1], 0) / quad.length;
    let widest = 0;
    for (let i = 0; i < quad.length; i++) {
      const a = quad[i], b = quad[(i + 1) % quad.length];
      widest = Math.max(widest, Math.hypot(a[0] - b[0], a[1] - b[1]));
    }
    const tag = el.querySelector('.tag');
    out.push({
      name: el.dataset.name || (tag ? tag.textContent : ''),
      quad: quad,
      cx: cx, cy: cy, w: widest
    });
  }
  return out;
}
"""

JS_INFO = """
() => {
  const imgs = [...document.querySelectorAll('img')];
  return {
    marks: document.querySelectorAll('%s').length,
    imgs: imgs.length,
    badImgs: imgs.filter(i => !i.complete || i.naturalWidth === 0).length,
    doc: document.documentElement.scrollWidth + 'x' + document.documentElement.scrollHeight
  };
}
""" % SEL


def clip(subject, hull):
    """Sutherland-Hodgman, in Python, so the area is computed here."""
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    out = [tuple(p) for p in subject]
    for i in range(len(hull)):
        if not out:
            return []
        a = hull[i]
        b = hull[(i + 1) % len(hull)]
        src, out = out, []
        for j in range(len(src)):
            c = src[j]
            d = src[(j + 1) % len(src)]
            ci, di = cross(a, b, c), cross(a, b, d)
            if ci >= 0:
                out.append(c)
            if (ci > 0 > di) or (ci < 0 < di):
                t = ci / (ci - di)
                out.append((c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t))
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)

    demo = (ROOT / "demos" / sys.argv[1]).resolve()
    seconds = float(sys.argv[2]) if len(sys.argv) > 2 else 20.0
    samples = int(sys.argv[3]) if len(sys.argv) > 3 else 200

    with sync_playwright() as p:
        browser = p.chromium.launch(
            args=["--no-sandbox", "--force-device-scale-factor=1"])
        vw, vh = (int(x) for x in sys.argv[4].split("x")) if len(sys.argv) > 4 else (1440, 1100)
        ctx = browser.new_context(viewport={"width": vw, "height": vh})
        # A container reports one core and no memory, which changes nothing
        # here but would make any capability check inside the page odd.
        ctx.add_init_script(
            "Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});")
        ctx.add_init_script(
            "Object.defineProperty(navigator,'deviceMemory',{get:()=>8});")
        page = ctx.new_page()

        errors, warnings = [], []
        page.on("console", lambda m: (
            errors.append(m.text) if m.type == "error"
            else warnings.append(m.text) if m.type == "warning" else None))
        page.on("pageerror", lambda e: errors.append("PAGEERROR " + str(e)))
        page.on("requestfailed", lambda r: errors.append("REQFAIL " + r.url))

        page.goto("file://" + str(demo))
        page.wait_for_timeout(700)
        info = page.evaluate(JS_INFO)

        worst_area, worst_pair = 0.0, None
        closest, closest_pair = float("inf"), None
        widest = 0.0

        for i in range(samples):
            boxes = page.evaluate(JS, SEL)
            for b in boxes:
                widest = max(widest, b["w"])
            for x in range(len(boxes)):
                for y in range(x + 1, len(boxes)):
                    a, c = boxes[x], boxes[y]
                    poly = clip(a["quad"], c["quad"])
                    if len(poly) >= 3:
                        area = 0.0
                        for k in range(len(poly)):
                            u, v = poly[k], poly[(k + 1) % len(poly)]
                            area += u[0] * v[1] - v[0] * u[1]
                        area = abs(area) / 2
                        if area > worst_area:
                            worst_area, worst_pair = area, (a["name"], c["name"])
                    gap = ((a["cx"] - c["cx"]) ** 2 + (a["cy"] - c["cy"]) ** 2) ** 0.5
                    if gap < closest:
                        closest, closest_pair = gap, (a["name"], c["name"])
            if i < samples - 1:
                page.wait_for_timeout((seconds * 1000) / samples)

        page.screenshot(path="/tmp/shot-" + demo.stem + ".png", full_page=True)

        ok = (worst_area == 0 and not errors
              and info["marks"] == 24 and info["badImgs"] == 0)
        print("== " + demo.name)
        print("   marks placed : %d" % info["marks"])
        print("   images       : %d total, %d broken" % (info["imgs"], info["badImgs"]))
        print("   page size    : %s" % info["doc"])
        print("   mark at widest: %.1f px across" % widest)
        print("   closest pair : %.1f px %s" % (closest, closest_pair or ""))
        print("   worst overlap: %.1f px2 %s" % (worst_area, worst_pair or ""))
        print("   console err  : %d %s" % (len(errors), errors[:4]))
        print("   console warn : %d %s" % (len(warnings), warnings[:4]))
        print("   " + ("PASS" if ok else "FAIL"))
        browser.close()
        sys.exit(0 if ok else 1)


main()