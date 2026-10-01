#!/usr/bin/env python3
"""Collision + console checker for the orbital demos.

Each demo claims, in its own comments, that no two marks can ever land on top
of each other. This proves it rather than trusting it: load a demo, sample
every mark's on-screen box many times across a window of seconds, and report

  * the largest bounding-box overlap ever seen between any two marks,
  * the closest two marks ever come, centre to centre,
  * the widest and tallest a mark ever draws,

along with any console errors or broken images. Overlap is measured on
bounding boxes, which for a mark under perspective is a few pixels larger than
the mark really is, so a pass here is a pass with margin to spare.

Usage: python3 check_collisions.py <demo-file.html> [seconds] [samples]
"""
import math
import sys
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
SEL = '.mark, .star, .node'

JS_SAMPLE = """
() => {
  const out = [];
  for (const m of document.querySelectorAll('%s')) {
    const r = m.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const tag = m.querySelector('.tag');
    out.push([
      m.dataset.name || (tag ? tag.textContent : ''),
      r.left + r.width / 2, r.top + r.height / 2,   // centre
      r.width, r.height                              // footprint
    ]);
  }
  return out;
}
""" % SEL

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
        ctx = browser.new_context(viewport={"width": 1440, "height": 1100})
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

        worst_area, worst_overlap = 0.0, None
        closest, closest_pair = math.inf, None
        widest = tallest = 0.0

        for i in range(samples):
            boxes = page.evaluate(JS_SAMPLE)
            for b in boxes:
                widest = max(widest, b[3])
                tallest = max(tallest, b[4])
            for x in range(len(boxes)):
                for y in range(x + 1, len(boxes)):
                    a, b = boxes[x], boxes[y]
                    ow = min(a[1] + a[3] / 2, b[1] + b[3] / 2) - max(a[1] - a[3] / 2, b[1] - b[3] / 2)
                    oh = min(a[2] + a[4] / 2, b[2] + b[4] / 2) - max(a[2] - a[4] / 2, b[2] - b[4] / 2)
                    if ow > 0 and oh > 0 and ow * oh > worst_area:
                        worst_area, worst_overlap = ow * oh, (a[0], b[0])
                    gap = math.hypot(a[1] - b[1], a[2] - b[2])
                    if gap < closest:
                        closest, closest_pair = gap, (a[0], b[0])
            if i < samples - 1:
                page.wait_for_timeout((seconds * 1000) / samples)

        page.screenshot(path="/tmp/shot-" + demo.stem + ".png", full_page=True)

        ok = (worst_area == 0 and not errors
              and info["marks"] == 24 and info["badImgs"] == 0)
        print("== " + demo.name)
        print("   marks placed : %d" % info["marks"])
        print("   images       : %d total, %d broken" % (info["imgs"], info["badImgs"]))
        print("   page size    : %s" % info["doc"])
        print("   footprint    : %.1f x %.1f px at its widest" % (widest, tallest))
        print("   closest pair : %.1f px %s" % (closest, closest_pair or ""))
        print("   worst overlap: %.1f px2 %s" % (worst_area, worst_overlap or ""))
        print("   console err  : %d %s" % (len(errors), errors[:4]))
        print("   console warn : %d %s" % (len(warnings), warnings[:4]))
        print("   " + ("PASS" if ok else "FAIL"))
        browser.close()
        sys.exit(0 if ok else 1)


main()