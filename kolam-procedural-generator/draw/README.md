# Web: draw a shape, get a kolam

A static page that turns a sketched shape into a one-stroke sikku kolam.
No build step, no dependencies: open `index.html` or serve the folder
(GitHub Pages works as-is).

## Files

- `kolam.js` — JavaScript port of `src/engine.py` v0.5: `Grid` (mask
  layouts), symmetry orbits, strand tracing, the orbit hill-climb and the
  single-slot repair, `generate()`, `toSVG()`, `toJSON()`. Same model and
  the same invariants as the Python engine (every edge traced once, closed
  loops, exact symmetry where the parity law allows it). Square lattice
  only; the staggered/idukku export rotation is not ported. Seeds are not
  byte-compatible with Python because the PRNG differs (mulberry32).
  Works in the browser (`window.Kolam`) and in Node (`require`).
- `index.html` — the page. Drawing pad → dot mask → engine → inline SVG.

## How the page works

1. The pad is a small square canvas with faint guide lines at the dot
   pitch and a faint mark at every pulli position, so people draw at the
   grid's scale. One dial: 5 / 7 / 9 (default 7) for kolams people will
   copy by hand, and a **Complex** dropdown with 20 / 30 / 40 for uploaded
   SVGs, where the point is to let the machine draw. Above 9 the pad shows
   marks only, no hairlines. A "How to" key opens a five-step coach that
   lights up the control each step talks about; it opens by itself on a
   viewer's first visit (remembered in `localStorage`).
2. Drawing is multi-stroke: lift and keep going. A stroke that ends within
   about a cell of where it began is *closed*: a cell becomes a dot when
   at least 5 of its 3×3 sub-samples fall inside the polygon. Any other
   stroke is *open*: the cells under the line become dots (sampled every
   2 px and bridged so diagonal steps stay 4-connected). So a heart drawn
   in one go fills, and an "A" drawn as Λ plus a bar gets dots along the
   letter. Strokes union together; "Undo stroke" removes the last one.
3. `Kolam.generateParts` splits the dots into 4-connected pieces and
   runs the engine on each, so a logo with separate letters or a ring
   around a mark gets one stroke per piece; `partsToSVG` draws them in one
   frame. On logo grids, lone single dots are dropped as noise (drawn
   faded). A tap toggles a single dot; taps are kept as overrides on top
   of whatever the strokes produce. A first stroke replaces a stencil but
   adds to an uploaded SVG.
4. `Kolam.generate({grid, symmetry: "c4", seed})` runs immediately; the
   symmetry downgrades to what the shape supports (a heart → d1). The
   result is rendered as inline SVG with a draw-order animation along the
   stroke (skipped under `prefers-reduced-motion`). "Another one" reseeds.
5. "SVG" rasterises the file onto an offscreen canvas at 12×12
   sub-samples per cell and keeps cells whose coverage is at least 45 % of
   the densest cell (clamped to 6–40 %), so a thin glyph like a letter and
   a solid blob both come through. Uploading jumps the grid to 30 unless a
   logo grid is already selected; changing the grid size re-rasterises the
   same SVG. The longer side of the SVG gets N dots, so a wide logo has
   fewer rows than columns. Search budget scales with dot count
   (`generate()` picks fewer restarts and more repair toggles above 100
   dots); a full 40×40 takes under half a second.
6. Download / Copy export the SVG in the product palette (line #702307,
   dots #b5603a on #faf3ee) with a line 0.19 of the dot pitch; the Python
   renderer's palette and 0.14 line are still the `toSVG` defaults in
   `kolam.js`.

## Motion and sound

Every animation is a response to an action; nothing moves on its own, and
`prefers-reduced-motion` turns all of it off.

- Keys press in 70 ms and spring back in 340 ms with a hair of overshoot.
  "Another one" turns its icon once.
- Dots land in pen order, 220 ms each, about 12 ms apart and never more than
  400 ms in all. An uploaded SVG lands top to bottom (its rasterise order).
- The line draws itself in stroke order (0.5 s + 60 ms per dot, capped at
  3.2 s). The readout LED comes on and the line breathes once (stroke width
  ×1.3 for 320 ms) at the moment the last stroke closes.
- "Another one" un-draws the old line backwards (500 ms) while the new one
  starts 300 ms in; the dots never move.
- Copy / Download morph the key into a square with a check, label blurred
  out, then spring back after 1.2 s. One element throughout.
- Changing the dial on a stencil slides every dot from its old cell to its
  new one (380 ms, small overshoot); on strokes or an SVG the old pad fades
  out under the re-snapped dots (260 ms).
- Sound is synthesised with WebAudio (no files) and off by default; the
  speaker key remembers the choice in `localStorage`. Three cues: a dry tick
  on any key, a soft tap per landing dot with pitch rising over the set (at
  most 24), and two marimba notes when a line closes, three when every piece
  is one stroke, matching the celebration tiers in `docs/IOS_FREE_DRAW.md`.

## Testing the port

```bash
node web/test.js
```

`test.js` checks the engine invariants on rectangles, the 1-3-5-3-1
diamond, the `shapes/` stencils, a single dot, a 1×3 line, three
interlocked strands on 5×5, and seed determinism.
