const Kolam = require("./kolam.js");
const assert = require("assert");

const HEART = `  oo   oo  \n ooooooooo \n ooooooooo \n  ooooooo  \n   ooooo   \n    ooo    \n     o     `;
const LAMP = `   o   \n  ooo  \n ooooo \n   o   \n   o   \n ooooo \nooooooo`;
const BUTTERFLY = `ooo   ooo\nooo   ooo\nooooooooo\n   ooo   \nooooooooo\nooo   ooo\nooo   ooo`;
const SMALL_HEART = ` oo oo \nooooooo\n ooooo \n  ooo  \n   o   `;

function checkInvariants(res) {
  const { grid, loops } = res;
  const edges = Kolam.allEdges(grid);
  const seen = new Map();
  for (const loop of loops) {
    assert.strictEqual(loop[0], loop[loop.length - 1], "loop closed");
    for (let i = 0; i < loop.length - 1; i++) {
      const e = loop[i] < loop[i + 1] ? loop[i] * 65536 + loop[i + 1] : loop[i + 1] * 65536 + loop[i];
      assert.ok(edges.has(e), "edge belongs to lattice");
      seen.set(e, (seen.get(e) || 0) + 1);
    }
  }
  assert.strictEqual(seen.size, edges.size, "every edge traced");
  for (const n of seen.values()) assert.strictEqual(n, 1, "no edge retraced");
}

const cases = [
  ["5x5 c4", () => new Kolam.Grid(5, 5), "c4", "c4", true],
  ["3x3 c4", () => new Kolam.Grid(3, 3), "c4", "c4", true],
  ["7x7 c4", () => new Kolam.Grid(7, 7), "c4", "c4", true],
  ["4x4 c4 (not exact)", () => new Kolam.Grid(4, 4), "c4", "c4", false],
  ["3x4 c4->d2", () => new Kolam.Grid(3, 4), "c4", "d2", true],
  ["diamond 1-3-5-3-1", () => Kolam.Grid.fromRows([1, 3, 5, 3, 1]), "c4", "c4", true],
  ["heart stencil -> d1", () => Kolam.Grid.fromStencil(HEART), "c4", "d1", null],
  ["small heart", () => Kolam.Grid.fromStencil(SMALL_HEART), "c4", "d1", null],
  ["lamp", () => Kolam.Grid.fromStencil(LAMP), "c4", "d1", null],
  ["butterfly", () => Kolam.Grid.fromStencil(BUTTERFLY), "c4", "d2", null],
  ["single dot", () => new Kolam.Grid(1, 1), "c4", "c4", true],
  ["1x3 line", () => new Kolam.Grid(1, 3), "c4", "d2", null],
];

let fails = 0;
for (const [name, mk, sym, expectSym, expectExact] of cases) {
  const grid = mk();
  for (const seed of [1, 2, 3, 42]) {
    const t0 = Date.now();
    const res = Kolam.generate({ grid, symmetry: sym, seed });
    const ms = Date.now() - t0;
    try {
      checkInvariants(res);
      assert.strictEqual(res.symmetryEffective, expectSym, "effective symmetry");
      assert.strictEqual(res.loopCount, 1, "one stroke");
      if (expectExact !== null) assert.strictEqual(res.symmetryExact, expectExact, "symmetry exact");
      const svg = Kolam.toSVG(res);
      assert.ok(svg.includes("<path"), "svg has path");
      console.log(`ok   ${name.padEnd(22)} seed=${String(seed).padEnd(3)} dots=${String(grid.dotCount()).padEnd(3)} sym=${res.symmetryEffective} exact=${res.symmetryExact} mirrors=${res.mirrors.size} ${ms}ms`);
    } catch (e) {
      fails++;
      console.log(`FAIL ${name} seed=${seed}: ${e.message} (loops=${res.loopCount})`);
    }
  }
}

// determinism
{
  const g = Kolam.Grid.fromStencil(HEART);
  const a = Kolam.toJSON(Kolam.generate({ grid: g, seed: 7 }));
  const b = Kolam.toJSON(Kolam.generate({ grid: g, seed: 7 }));
  assert.deepStrictEqual(a, b, "same seed reproduces");
  console.log("ok   determinism");
}
// 3 interlocked strands on 5x5 (parity law: odd box -> odd counts exact)
{
  const res = Kolam.generate({ grid: new Kolam.Grid(5, 5), seed: 2, strands: 3 });
  checkInvariants(res);
  assert.strictEqual(res.loopCount, 3); assert.ok(res.interlocked);
  console.log(`ok   5x5 strands=3 exact=${res.symmetryExact}`);
}
// largest component + rejection of disconnected
{
  const cells = [[0, 0], [0, 1], [1, 1], [5, 5], [5, 6]];
  assert.strictEqual(Kolam.largestComponent(cells).length, 3);
  assert.throws(() => Kolam.Grid.fromMask(cells));
  console.log("ok   largestComponent / disconnected rejected");
}
// multi-part generation: three separate pieces, one stroke each, all drawn
{
  const cells = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 5], [1, 5], [2, 5], [6, 6], [6, 7]];
  const m = Kolam.generateParts(cells, { seed: 3 });
  assert.strictEqual(m.parts.length, 3); assert.ok(m.oneStrokeEach); assert.strictEqual(m.dotCount, 9);
  m.parts.forEach((p) => checkInvariants(p.result));
  const svg = Kolam.partsToSVG(m);
  assert.strictEqual(svg.split("<path").length - 1, 3); assert.strictEqual(svg.split("<circle").length - 1, 9);
  assert.strictEqual(Kolam.generateParts(cells, { seed: 3, minDots: 3 }).parts.length, 2);
  console.log("ok   generateParts / partsToSVG");
}
// large free shape stays fast and reaches one stroke
{
  const cells = [];
  for (let r = 0; r < 30; r++) for (let c = 0; c < 30; c++) { const d = Math.hypot(r - 14.5, c - 14.5); if (d < 14 && d > 7) cells.push([r, c]); }
  const t0 = Date.now();
  const res = Kolam.generate({ grid: Kolam.Grid.fromMask(cells), seed: 1 });
  const ms = Date.now() - t0;
  checkInvariants(res);
  assert.strictEqual(res.loopCount, 1); assert.ok(ms < 3000, "fast enough");
  console.log(`ok   30x30 ring dots=${res.grid.dotCount()} ${ms}ms`);
}
console.log(fails ? `\n${fails} FAILURES` : "\nall passed");
process.exit(fails ? 1 : 0);
