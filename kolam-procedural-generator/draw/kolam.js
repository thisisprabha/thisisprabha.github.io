/* kolam.js — sikku (kambi) kolam engine, JavaScript port of src/engine.py v0.5.
 *
 * Model: mirror curves on the diagonal lattice. For an R x C box of pulli,
 * work on integer points (x, y), 0 <= x <= 2C, 0 <= y <= 2R.
 *   - dots at (odd, odd); a mask picks which exist (any 4-connected shape)
 *   - the strand walks unit diagonal steps over points with odd x+y
 *   - a point touching two dot cells is an interior slot (mirror or crossing);
 *     touching one cell it is a border and always reflects
 *   - reflector rule: (even, odd) flips dx, (odd, even) flips dy
 * Tracing every edge once gives a family of closed loops enclosing every dot.
 * Mirror placement is the only freedom; the search looks for exactly
 * `strands` interlocked loops (1 = one-stroke sikku).
 *
 * Square lattice only (the staggered/idukku export rotation is not ported:
 * drawn shapes live on the square lattice). Seeds are NOT byte-compatible
 * with the Python engine — the PRNG differs — but the model and invariants
 * are the same.
 *
 * Works in the browser (window.Kolam) and in Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Kolam = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ENGINE_VERSION = "0.5.0-js";
  const SYMMETRIES = ["none", "d1", "d2", "c4", "d4"];
  const HALF_TURN = ["d2", "c4", "d4"];
  const STRAND_COLOURS = ["#1f2933", "#8b2f3a", "#1f5f4a", "#8a5a12", "#3b3f8c", "#6b2d6e"];

  // ---- point keys: (x, y) -> integer, ordered like Python tuples (x, then y)
  const K = (x, y) => x * 256 + y;
  const KX = (k) => k >> 8;
  const KY = (k) => k & 255;
  const EK = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a); // edge key

  // ---- seeded PRNG (mulberry32) with Python-like helpers
  function makeRng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    const rng = {
      random() {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      choice(arr) { return arr[Math.floor(rng.random() * arr.length)]; },
    };
    return rng;
  }

  // ------------------------------------------------------------ shapes

  /** Text stencil ('o' = dot, anything else empty) -> array of [row, col]. */
  function stencilToMask(text) {
    const DOT = /[o.*x#O]/;
    const lines = text.split(/\r?\n/).filter((ln) => ln.trim());
    const cells = [];
    lines.forEach((ln, r) => {
      for (let c = 0; c < ln.length; c++) if (DOT.test(ln[c])) cells.push([r, c]);
    });
    if (!cells.length) throw new Error("stencil contains no dots");
    return normalizeMask(cells);
  }

  /** Centered row spec (1-3-5-3-1) -> cells. All counts must share parity. */
  function rowsToMask(counts) {
    const par = new Set(counts.map((c) => c % 2));
    if (par.size !== 1) throw new Error("row counts must all be odd or all even");
    const width = Math.max(...counts);
    const cells = [];
    counts.forEach((c, r) => {
      const start = (width - c) / 2;
      for (let k = 0; k < c; k++) cells.push([r, start + k]);
    });
    return cells;
  }

  /** Shift cells so the bounding box starts at (0, 0); dedupe. */
  function normalizeMask(cells) {
    const r0 = Math.min(...cells.map((p) => p[0]));
    const c0 = Math.min(...cells.map((p) => p[1]));
    const seen = new Set();
    const out = [];
    for (const [r, c] of cells) {
      const k = (r - r0) * 1000 + (c - c0);
      if (!seen.has(k)) { seen.add(k); out.push([r - r0, c - c0]); }
    }
    return out;
  }

  /** 4-connected components of a cell set, largest first. */
  function components(cells) {
    const set = new Set(cells.map(([r, c]) => r * 1000 + c));
    const seen = new Set();
    const out = [];
    for (const start of set) {
      if (seen.has(start)) continue;
      const comp = [];
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const k = stack.pop();
        comp.push([Math.floor(k / 1000), k % 1000]);
        for (const d of [1000, -1000, 1, -1]) {
          const q = k + d;
          if (set.has(q) && !seen.has(q)) { seen.add(q); stack.push(q); }
        }
      }
      out.push(comp);
    }
    return out.sort((a, b) => b.length - a.length);
  }
  /** Largest 4-connected component of a cell set (for drawn shapes). */
  function largestComponent(cells) {
    return cells.length ? components(cells)[0] : [];
  }

  // -------------------------------------------------------------- grid

  class Grid {
    /** rows x cols box; mask = array of [row, col] dots (omit for full box). */
    constructor(rows, cols, mask) {
      if (rows < 1 || cols < 1) throw new Error("grid needs at least one row and column");
      this.rows = rows;
      this.cols = cols;
      let cells;
      if (mask) {
        cells = normalizeMask(mask);
        for (const [r, c] of cells)
          if (r < 0 || r >= rows || c < 0 || c >= cols) throw new Error("mask dot outside the box");
      } else {
        cells = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c]);
      }
      this.cells = cells;
      this._dots = new Set(cells.map(([r, c]) => K(2 * c + 1, 2 * r + 1)));
      this._adj = new Map();
      for (const k of this._dots) {
        const x = KX(k), y = KY(k);
        for (const p of [K(x - 1, y), K(x + 1, y), K(x, y - 1), K(x, y + 1)])
          this._adj.set(p, (this._adj.get(p) || 0) + 1);
      }
      if (!this._connected())
        throw new Error("dots must form one 4-connected shape");
    }

    static fromMask(mask) {
      const cells = normalizeMask(mask);
      const rows = Math.max(...cells.map((p) => p[0])) + 1;
      const cols = Math.max(...cells.map((p) => p[1])) + 1;
      return new Grid(rows, cols, cells);
    }
    static fromStencil(text) { return Grid.fromMask(stencilToMask(text)); }
    static fromRows(counts) { return Grid.fromMask(rowsToMask(counts)); }

    get width() { return 2 * this.cols; }
    get height() { return 2 * this.rows; }

    _connected() {
      const dots = this._dots;
      const start = dots.values().next().value;
      const seen = new Set([start]);
      const stack = [start];
      while (stack.length) {
        const k = stack.pop();
        const x = KX(k), y = KY(k);
        for (const q of [K(x - 2, y), K(x + 2, y), K(x, y - 2), K(x, y + 2)])
          if (dots.has(q) && !seen.has(q)) { seen.add(q); stack.push(q); }
      }
      return seen.size === dots.size;
    }

    /** Dots as [x, y] lattice points, sorted by (y, x). */
    dots() {
      return [...this._dots].map((k) => [KX(k), KY(k)]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    }
    dotCount() { return this._dots.size; }
    rowCounts() {
      const counts = new Array(this.rows).fill(0);
      for (const k of this._dots) counts[(KY(k) - 1) / 2]++;
      return counts;
    }
    shapeLabel() { return this.rowCounts().join("-"); }

    interiorSlots() {
      const out = [];
      for (const [p, n] of this._adj) if (n === 2) out.push(p);
      return out.sort((a, b) => a - b);
    }
    isBorder(k) { return this._adj.get(k) === 1; }
    inside(k) { return this._adj.has(k); }

    isSymmetricShape(symmetry) {
      if (symmetry === "none") return true;
      try {
        for (const d of this._dots)
          for (const q of symmetryOrbit(d, this, symmetry)) if (!this._dots.has(q)) return false;
        return true;
      } catch (e) { return false; }
    }
    bestSymmetry(requested) {
      const order = {
        d4: ["d4", "c4", "d2", "d1", "none"], c4: ["c4", "d2", "d1", "none"],
        d2: ["d2", "d1", "none"], d1: ["d1", "none"], none: ["none"],
      }[requested];
      for (const s of order) if (this.isSymmetricShape(s)) return s;
      return "none";
    }
  }

  /** Reflector rule by parity of the point: returns new [dx, dy]. */
  function reflect(k, dx, dy) {
    return KX(k) % 2 === 0 ? [-dx, dy] : [dx, -dy];
  }

  /** Orbit (array of keys) of a lattice point about the box centre. */
  function symmetryOrbit(k, grid, symmetry) {
    const w = grid.width, h = grid.height;
    const x = KX(k), y = KY(k);
    const pts = new Set([K(x, y)]);
    if (symmetry === "d1") pts.add(K(w - x, y));
    if (symmetry === "d2" || symmetry === "d4") {
      pts.add(K(w - x, y)); pts.add(K(x, h - y)); pts.add(K(w - x, h - y));
    }
    if (symmetry === "c4" || symmetry === "d4") {
      if (w !== h) throw new Error("4-fold symmetry requires a square box");
      const rot = [...pts].map((p) => K(h - KY(p), KX(p)));
      rot.forEach((p) => pts.add(p));
      rot.map((p) => K(h - KY(p), KX(p))).forEach((p) => pts.add(p));
      [...pts].map((p) => K(w - KX(p), h - KY(p))).forEach((p) => pts.add(p));
    }
    return [...pts];
  }

  function isSymmetric(mirrors, grid, symmetry) {
    if (symmetry === "none") return true;
    try {
      for (const m of mirrors)
        for (const q of symmetryOrbit(m, grid, symmetry)) if (!mirrors.has(q)) return false;
      return true;
    } catch (e) { return false; }
  }

  function forcedStrandParity(grid, symmetry) {
    const eff = grid.bestSymmetry(symmetry);
    if (!HALF_TURN.includes(eff)) return null;
    const centre = K(grid.cols, grid.rows);
    if (grid.interiorSlots().includes(centre)) return null;
    return grid.dotCount() % 2;
  }

  // ------------------------------------------------------------- trace

  function allEdges(grid) {
    const edges = new Set();
    for (const [x, y] of grid.dots()) {
      const a = K(x - 1, y), b = K(x, y - 1), c = K(x + 1, y), d = K(x, y + 1);
      edges.add(EK(a, b)); edges.add(EK(b, c)); edges.add(EK(c, d)); edges.add(EK(d, a));
    }
    return edges;
  }

  /** Trace the whole curve family. Returns array of loops (arrays of keys,
   *  closed: last === first). Deterministic start from the smallest edge. */
  function trace(grid, mirrors) {
    const remaining = allEdges(grid);
    const loops = [];
    while (remaining.size) {
      let minE = Infinity;
      for (const e of remaining) if (e < minE) minE = e;
      const a = Math.floor(minE / 65536), b = minE % 65536;
      let dx = KX(b) - KX(a), dy = KY(b) - KY(a);
      const start = a, sdx = dx, sdy = dy;
      let p = a;
      const loop = [p];
      for (;;) {
        const q = K(KX(p) + dx, KY(p) + dy);
        remaining.delete(EK(p, q));
        loop.push(q);
        if (grid.isBorder(q) || mirrors.has(q)) [dx, dy] = reflect(q, dx, dy);
        p = q;
        if (p === start && dx === sdx && dy === sdy) break;
      }
      loops.push(loop);
    }
    return loops;
  }

  /** Interior slot -> Set of loop indices passing through it. */
  function slotOwners(grid, loops) {
    const owners = new Map();
    loops.forEach((loop, li) => {
      for (let i = 0; i < loop.length - 1; i++) {
        const p = loop[i];
        if (!grid.isBorder(p)) {
          if (!owners.has(p)) owners.set(p, new Set());
          owners.get(p).add(li);
        }
      }
    });
    return owners;
  }

  function interlockComponents(grid, mirrors, loops) {
    const n = loops.length;
    const adj = Array.from({ length: n }, () => new Set());
    for (const [slot, o] of slotOwners(grid, loops)) {
      if (o.size > 1 && !mirrors.has(slot)) {
        const [a, b] = [...o];
        adj[a].add(b); adj[b].add(a);
      }
    }
    const seen = new Set();
    const comps = [];
    for (let r = 0; r < n; r++) {
      if (seen.has(r)) continue;
      const comp = new Set([r]);
      const stack = [r];
      while (stack.length) for (const nb of adj[stack.pop()]) if (!comp.has(nb)) { comp.add(nb); stack.push(nb); }
      comp.forEach((c) => seen.add(c));
      comps.push(comp);
    }
    return comps;
  }

  function interlocked(grid, mirrors, loops) {
    return interlockComponents(grid, mirrors, loops).length <= 1;
  }

  /** Lower is better; [0, 0] is a solution. */
  function score(grid, mirrors, target, loops) {
    loops = loops || trace(grid, mirrors);
    const distance = Math.abs(loops.length - target);
    if (distance) return [distance, 0];
    return [0, interlocked(grid, mirrors, loops) ? 0 : 1];
  }
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];

  /** Single-slot toggles toward `target` interlocked strands. */
  function adjustLoops(grid, mirrors, rng, target, maxToggles) {
    target = target || 1; maxToggles = maxToggles || 400;
    let best = mirrors, bestScore = score(grid, mirrors, target);
    for (let i = 0; i < maxToggles; i++) {
      const loops = trace(grid, mirrors);
      const s = score(grid, mirrors, target, loops);
      if (cmp(s, bestScore) < 0) { best = mirrors; bestScore = s; }
      if (s[0] === 0 && s[1] === 0) return mirrors;
      const owners = slotOwners(grid, loops);
      const count = loops.length;
      let candidates = [];
      if (count > target) {
        for (const [p, o] of owners) if (o.size > 1) candidates.push(p);
      } else if (count < target) {
        for (const [p, o] of owners) if (o.size === 1) candidates.push(p);
      } else {
        const group = new Map();
        interlockComponents(grid, mirrors, loops).forEach((comp, gi) => comp.forEach((li) => group.set(li, gi)));
        for (const [p, o] of owners)
          if (o.size > 1 && mirrors.has(p) && new Set([...o].map((li) => group.get(li))).size > 1) candidates.push(p);
      }
      if (!candidates.length) return best;
      candidates.sort((a, b) => a - b);
      const pick = rng.choice(candidates);
      const next = new Set(mirrors);
      if (next.has(pick)) next.delete(pick); else next.add(pick);
      mirrors = next;
    }
    return best;
  }

  /**
   * Search for a mirror configuration with exactly `strands` interlocked loops.
   * opts: { grid, symmetry="c4", density=0.3, seed, maxRestarts=20, maxSteps=300, strands=1 }
   * Returns { grid, mirrors:Set, loops, symmetry, symmetryEffective, symmetryExact, loopCount, oneStroke, interlocked, seed }.
   */
  function generate(opts) {
    const grid = opts.grid || new Grid(opts.rows, opts.cols);
    const requested = opts.symmetry || "c4";
    if (!SYMMETRIES.includes(requested)) throw new Error("bad symmetry " + requested);
    const strands = opts.strands || 1;
    const density = opts.density == null ? 0.3 : opts.density;
    const seed = opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed;
    // Search budget. Small shapes get the Python defaults (20 restarts x 300
    // orbit steps, 400 repair toggles). Large free shapes have hundreds of
    // single-slot orbits, where the orbit climb barely moves and the repair
    // phase does the work, so they get fewer restarts and more toggles.
    const big = grid.dotCount() > 100;
    const maxRestarts = opts.maxRestarts || (big ? 4 : 20);
    const maxSteps = opts.maxSteps || (big ? 80 : 300);
    const maxToggles = opts.maxToggles || Math.max(400, 4 * grid.dotCount());
    const symmetry = grid.bestSymmetry(requested);
    const rng = makeRng(seed);

    const slots = grid.interiorSlots();
    const slotSet = new Set(slots);
    const orbitMap = new Map();
    for (const s of slots) {
      const orb = symmetryOrbit(s, grid, symmetry).filter((p) => slotSet.has(p)).sort((a, b) => a - b);
      orbitMap.set(orb.join(","), orb);
    }
    const orbits = [...orbitMap.values()].sort((a, b) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
      return a.length - b.length;
    });

    const finish = (mirrors) => {
      const loops = trace(grid, mirrors);
      return {
        engineVersion: ENGINE_VERSION, grid, mirrors, loops, seed, strands,
        symmetry: requested, symmetryEffective: symmetry,
        symmetryExact: isSymmetric(mirrors, grid, symmetry),
        loopCount: loops.length, oneStroke: loops.length === 1,
        interlocked: interlocked(grid, mirrors, loops),
      };
    };

    if (!orbits.length) return finish(new Set());

    const finals = [];
    for (let restart = 0; restart < maxRestarts; restart++) {
      let mirrors = new Set();
      for (const orbit of orbits) if (rng.random() < density) orbit.forEach((p) => mirrors.add(p));
      let s = score(grid, mirrors, strands);
      for (let step = 0; step < maxSteps; step++) {
        if (s[0] === 0 && s[1] === 0) return finish(mirrors);
        const orbit = rng.choice(orbits);
        const trial = new Set(mirrors);
        if (orbit.every((p) => trial.has(p))) orbit.forEach((p) => trial.delete(p));
        else orbit.forEach((p) => trial.add(p));
        const ts = score(grid, trial, strands);
        if (cmp(ts, s) <= 0) { mirrors = trial; s = ts; }
      }
      finals.push([s, restart, mirrors]);
    }
    finals.sort((a, b) => cmp(a[0], b[0]) || a[1] - b[1]);
    let best = new Set(), bestScore = [Infinity, Infinity];
    for (const [, , start] of finals) {
      const mirrors = adjustLoops(grid, new Set(start), rng, strands, maxToggles);
      const s = score(grid, mirrors, strands);
      if (s[0] === 0 && s[1] === 0) return finish(mirrors);
      if (cmp(s, bestScore) < 0) { best = mirrors; bestScore = s; }
    }
    return finish(best);
  }

  // ------------------------------------------------------------ output

  /** Per vertex: {t:'L', p} for a crossing or {t:'Q', a, q, b} for a rounded reflection. */
  function smoothPoints(loop, grid, mirrors, corner) {
    corner = corner == null ? 0.55 : corner;
    const pts = loop.slice(0, -1).map((k) => [KX(k), KY(k)]);
    const n = pts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n], q = pts[i], nxt = pts[(i + 1) % n];
      const k = K(q[0], q[1]);
      if (!(grid.isBorder(k) || mirrors.has(k))) { out.push({ t: "L", p: q }); continue; }
      const a = [q[0] + (prev[0] - q[0]) * corner, q[1] + (prev[1] - q[1]) * corner];
      const b = [q[0] + (nxt[0] - q[0]) * corner, q[1] + (nxt[1] - q[1]) * corner];
      out.push({ t: "Q", a, q, b });
    }
    return out;
  }

  function viewBounds(grid) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k of grid._adj.keys()) {
      const x = KX(k), y = KY(k);
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
    return [x0, y0, x1, y1];
  }

  function smoothPath(loop, grid, mirrors, scale, margin, x0, y0, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    const px = (p) => [margin + (p[0] + ox - x0) * scale, margin + (p[1] + oy - y0) * scale];
    const f = (v) => v.toFixed(2);
    const cmds = [];
    for (const seg of smoothPoints(loop, grid, mirrors)) {
      if (seg.t === "L") { const [x, y] = px(seg.p); cmds.push(`L ${f(x)} ${f(y)}`); }
      else {
        const [ax, ay] = px(seg.a), [qx, qy] = px(seg.q), [bx, by] = px(seg.b);
        cmds.push(`L ${f(ax)} ${f(ay)} Q ${f(qx)} ${f(qy)} ${f(bx)} ${f(by)}`);
      }
    }
    const first = cmds[0].split(" ");
    return `M ${first[1]} ${first[2]} ` + cmds.join(" ") + " Z";
  }

  /**
   * SVG string for a result. opts: { scale=48, margin=48, stroke, dotFill, background, strokeWidth }
   * Line weight defaults to 0.19 of the dot pitch (the Python renderer uses 0.14).
   * `background: null` omits the background rect (transparent).
   */
  function toSVG(result, opts) {
    opts = opts || {};
    const { grid, mirrors, loops } = result;
    const scale = opts.scale || 48, margin = opts.margin == null ? 48 : opts.margin;
    const stroke = opts.stroke || "#1f2933", dotFill = opts.dotFill || "#b8622f";
    const background = opts.background === undefined ? "#faf6ee" : opts.background;
    const [x0, y0, x1, y1] = viewBounds(grid);
    const w = (x1 - x0) * scale + 2 * margin, h = (y1 - y0) * scale + 2 * margin;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(0)}" height="${h.toFixed(0)}" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}">`,
    ];
    if (background) parts.push(`<rect width="100%" height="100%" fill="${background}"/>`);
    loops.forEach((loop, i) => {
      const d = smoothPath(loop, grid, mirrors, scale, margin, x0, y0);
      const colour = loops.length === 1 ? stroke : STRAND_COLOURS[i % STRAND_COLOURS.length];
      parts.push(`<path class="strand" d="${d}" fill="none" stroke="${colour}" stroke-width="${(opts.strokeWidth || scale * 0.19).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    });
    const r = scale * 0.11;
    for (const [x, y] of grid.dots())
      parts.push(`<circle cx="${(margin + (x - x0) * scale).toFixed(2)}" cy="${(margin + (y - y0) * scale).toFixed(2)}" r="${r.toFixed(2)}" fill="${dotFill}"/>`);
    parts.push("</svg>");
    return parts.join("\n");
  }

  /**
   * Any cell set, possibly in several pieces: each 4-connected component is
   * generated on its own grid. Returns { parts: [{ result, dr, dc }], loopCount,
   * oneStrokeEach, dotCount, seed } where (dr, dc) is the part's offset in the
   * original cell frame. Pieces smaller than `minDots` (default 1) are skipped.
   */
  function generateParts(cells, opts) {
    opts = opts || {};
    const seed = opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed;
    const parts = [];
    components(cells).forEach((comp, i) => {
      if (comp.length < (opts.minDots || 1)) return;
      const dr = Math.min(...comp.map((p) => p[0])), dc = Math.min(...comp.map((p) => p[1]));
      const grid = Grid.fromMask(comp);
      const result = generate(Object.assign({}, opts, { grid, seed: seed + i * 7919 }));
      parts.push({ result, dr, dc });
    });
    const loopCount = parts.reduce((n, p) => n + p.result.loopCount, 0);
    return {
      parts, seed, loopCount,
      dotCount: parts.reduce((n, p) => n + p.result.grid.dotCount(), 0),
      oneStrokeEach: parts.every((p) => p.result.oneStroke),
      symmetryEffective: parts.length === 1 ? parts[0].result.symmetryEffective : "none",
      symmetryExact: parts.length === 1 ? parts[0].result.symmetryExact : false,
    };
  }

  /** SVG for a generateParts() result, all pieces in one frame. Same opts as toSVG. */
  function partsToSVG(multi, opts) {
    opts = opts || {};
    const scale = opts.scale || 48, margin = opts.margin == null ? 48 : opts.margin;
    const stroke = opts.stroke || "#1f2933", dotFill = opts.dotFill || "#b8622f";
    const background = opts.background === undefined ? "#faf6ee" : opts.background;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const { result, dr, dc } of multi.parts) {
      const [a, b, c, d] = viewBounds(result.grid);
      x0 = Math.min(x0, a + 2 * dc); y0 = Math.min(y0, b + 2 * dr);
      x1 = Math.max(x1, c + 2 * dc); y1 = Math.max(y1, d + 2 * dr);
    }
    const w = (x1 - x0) * scale + 2 * margin, h = (y1 - y0) * scale + 2 * margin;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(0)}" height="${h.toFixed(0)}" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}">`,
    ];
    if (background) parts.push(`<rect width="100%" height="100%" fill="${background}"/>`);
    const sw = (opts.strokeWidth || scale * 0.19).toFixed(2);
    for (const { result, dr, dc } of multi.parts) {
      result.loops.forEach((loop, i) => {
        const d = smoothPath(loop, result.grid, result.mirrors, scale, margin, x0, y0, 2 * dc, 2 * dr);
        const colour = result.loops.length === 1 ? stroke : STRAND_COLOURS[i % STRAND_COLOURS.length];
        parts.push(`<path class="strand" d="${d}" fill="none" stroke="${colour}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`);
      });
    }
    const r = scale * 0.11;
    for (const { result, dr, dc } of multi.parts)
      for (const [x, y] of result.grid.dots())
        parts.push(`<circle cx="${(margin + (x + 2 * dc - x0) * scale).toFixed(2)}" cy="${(margin + (y + 2 * dr - y0) * scale).toFixed(2)}" r="${r.toFixed(2)}" fill="${dotFill}"/>`);
    parts.push("</svg>");
    return parts.join("\n");
  }

  /** Plain-data export, same shape as the Python to_json. */
  function toJSON(result) {
    const { grid, mirrors, loops } = result;
    const pt = (k) => [KX(k), KY(k)];
    return {
      engine_version: ENGINE_VERSION, lattice: "square",
      grid: { rows: grid.rows, cols: grid.cols, shape: grid.shapeLabel(), dot_count: grid.dotCount() },
      dots: grid.dots(), symmetry: result.symmetry, symmetry_effective: result.symmetryEffective,
      seed: result.seed, mirrors: [...mirrors].sort((a, b) => a - b).map(pt),
      symmetry_exact: result.symmetryExact, strands: result.strands,
      loop_count: result.loopCount, one_stroke: result.oneStroke, interlocked: result.interlocked,
      loops: loops.map((l) => l.map(pt)),
    };
  }

  return {
    ENGINE_VERSION, SYMMETRIES, STRAND_COLOURS,
    Grid, generate, generateParts, trace, toSVG, partsToSVG, toJSON, allEdges, interlocked, isSymmetric,
    symmetryOrbit, forcedStrandParity, stencilToMask, rowsToMask, normalizeMask,
    components, largestComponent, makeRng, K, KX, KY,
  };
});
