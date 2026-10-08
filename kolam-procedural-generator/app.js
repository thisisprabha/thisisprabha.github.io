(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#kolamCanvas");
  const ctx = canvas.getContext("2d");
  const card = $(".canvas-card");
  const loadingState = $("#loadingState");
  const gameMessage = $("#gameMessage");
  const dotCount = $("#dotCount");
  const dailyLabel = $("#dailyLabel");
  const hintNote = $("#hintNote");
  const undoButton = $("#undoButton");
  const clearButton = $("#clearButton");
  const hintButton = $("#hintButton");
  const infoDialog = $("#infoDialog");
  const statsDialog = $("#statsDialog");
  const completeDialog = $("#completeDialog");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const palette = {
    flour: "#fff7e8",
    flourSoft: "rgba(255,247,232,.18)",
    flourFaint: "rgba(255,247,232,.1)",
    terracotta: "#f1954d",
    shadow: "rgba(31,7,7,.42)"
  };

  const state = {
    levels: [],
    level: null,
    levelIndex: 0,
    mode: "daily",
    strokes: [],
    current: [],
    enclosed: new Set(),
    solved: false,
    started: false,
    hints: 0,
    hintVisible: false,
    hintStartedAt: 0,
    activePointer: null,
    width: 0,
    height: 0,
    layout: null,
    dateKey: utcDateKey(new Date())
  };

  init();

  async function init() {
    wireInterface();
    try {
      const response = await fetch("./data/journey-levels.json");
      if (!response.ok) throw new Error(`Level catalog returned ${response.status}`);
      const catalog = await response.json();
      state.levels = catalog.levels;
      selectDailyLevel();
      restoreDailyState();
      resizeCanvas();
      loadingState.hidden = true;
      canvas.hidden = false;
      hintButton.disabled = state.solved;
      syncInterface();
      render();
    } catch (error) {
      loadingState.textContent = "Today’s kolam could not be prepared. Please refresh and try again.";
      console.error(error);
    }
  }

  function wireInterface() {
    canvas.hidden = true;
    canvas.addEventListener("pointerdown", beginStroke);
    canvas.addEventListener("pointermove", moveStroke);
    canvas.addEventListener("pointerup", finishStroke);
    canvas.addEventListener("pointercancel", finishStroke);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    new ResizeObserver(resizeCanvas).observe(card);
    undoButton.addEventListener("click", undo);
    clearButton.addEventListener("click", clearDrawing);
    hintButton.addEventListener("click", toggleHint);
    $("#infoButton").addEventListener("click", () => infoDialog.showModal());
    $("#statsButton").addEventListener("click", showStats);
    $("#shareButton").addEventListener("click", shareResult);
    $("#practiceButton").addEventListener("click", startBiggerKolam);

    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => button.closest("dialog").close());
    });
    document.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  function selectDailyLevel() {
    const dayNumber = Math.floor(
      (Date.parse(`${state.dateKey}T00:00:00Z`) - Date.UTC(2026, 0, 1)) / 86400000
    );
    const bands = [[4, 6], [7, 9], [10, 12], [13, 16], [17, 25]];
    const band = bands[positiveModulo(dayNumber, bands.length)];
    const candidates = state.levels.filter((level) => {
      return level.grid.dot_count >= band[0] && level.grid.dot_count <= band[1];
    });
    const pool = candidates.length ? candidates : state.levels;
    const chosen = pool[hashString(state.dateKey) % pool.length];
    state.level = chosen;
    state.levelIndex = state.levels.indexOf(chosen);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !state.level) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    state.width = rect.width;
    state.height = rect.height;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.layout = createLayout(state.level, rect.width, rect.height);
    render();
  }

  function createLayout(level, width, height) {
    const latticeWidth = level.grid.cols * 2;
    const latticeHeight = level.grid.rows * 2;
    const inset = Math.min(width, height) * 0.11;
    const scale = Math.min(
      (width - inset * 2) / latticeWidth,
      (height - inset * 2) / latticeHeight
    );
    const drawnWidth = latticeWidth * scale;
    const drawnHeight = latticeHeight * scale;
    return {
      scale,
      originX: width / 2 - drawnWidth / 2,
      originY: height / 2 - drawnHeight / 2,
      lineWidth: Math.max(6, Math.min(11, Math.min(width, height) / 58)),
      dotRadius: Math.max(4.5, Math.min(7, scale * 0.12))
    };
  }

  function latticePoint(pair) {
    return {
      x: state.layout.originX + pair[0] * state.layout.scale,
      y: state.layout.originY + pair[1] * state.layout.scale
    };
  }

  function canvasPoint(normalized) {
    return { x: normalized.x * state.width, y: normalized.y * state.height };
  }

  function normalizedPoint(point) {
    return { x: point.x / state.width, y: point.y / state.height };
  }

  function eventPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function beginStroke(event) {
    if (!state.level || state.solved || state.activePointer !== null) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    state.activePointer = event.pointerId;
    stopHint();
    markStarted();

    const point = eventPoint(event);
    state.current = takeContinuableStroke(point) || [];
    appendPoint(point);
    gameMessage.textContent = state.current.length > 1 ? "The line remembers where you stopped." : "Let the line flow.";
    vibrate(8);
    syncInterface();
    render();
  }

  function moveStroke(event) {
    if (event.pointerId !== state.activePointer) return;
    event.preventDefault();
    if (appendPoint(eventPoint(event))) render();
  }

  function finishStroke(event) {
    if (event.pointerId !== state.activePointer) return;
    event.preventDefault();
    appendPoint(eventPoint(event));
    state.activePointer = null;

    if (state.current.length < 2) {
      state.current = [];
      syncInterface();
      render();
      return;
    }

    let points = state.current.map(canvasPoint);
    const closeDistance = Math.max(30, state.layout.lineWidth * 4.5);
    const isClosed = points.length > 8
      && pathLength(points) > 80
      && distance(points[0], points[points.length - 1]) <= closeDistance;

    if (isClosed) points.push(points[0]);
    const enclosed = isClosed ? enclosedDots(points) : [];
    const smoothPoints = smooth(points, isClosed, Math.max(3, state.layout.lineWidth * 0.45));
    state.strokes.push({
      points: smoothPoints.map(normalizedPoint),
      closed: isClosed,
      enclosed
    });
    state.current = [];
    recalculateEnclosed();

    if (state.enclosed.size === state.level.grid.dot_count) {
      completeKolam();
    } else if (isClosed) {
      gameMessage.textContent = enclosed.length
        ? `${state.enclosed.size} dots held. Keep going.`
        : "That loop missed the dots. Try another path.";
      vibrate([12, 30, 12]);
    } else {
      gameMessage.textContent = "Lifted? Begin again near either loose end.";
      vibrate(10);
    }

    saveState();
    syncInterface();
    render();
  }

  function appendPoint(point) {
    const normalized = normalizedPoint(point);
    const last = state.current[state.current.length - 1];
    if (last && distance(canvasPoint(last), point) < 1.5) return false;
    state.current.push(normalized);
    return true;
  }

  function takeContinuableStroke(point) {
    const snapDistance = Math.max(34, state.layout.lineWidth * 4.8);
    let best = null;

    state.strokes.forEach((stroke, index) => {
      if (stroke.closed || !stroke.points.length) return;
      const firstDistance = distance(canvasPoint(stroke.points[0]), point);
      const lastDistance = distance(canvasPoint(stroke.points[stroke.points.length - 1]), point);
      [[true, firstDistance], [false, lastDistance]].forEach(([reverse, gap]) => {
        if (gap <= snapDistance && (!best || gap < best.gap)) best = { index, reverse, gap };
      });
    });

    if (!best) return null;
    const [stroke] = state.strokes.splice(best.index, 1);
    if (best.reverse) stroke.points.reverse();
    recalculateEnclosed();
    return stroke.points;
  }

  function enclosedDots(polygon) {
    const result = [];
    state.level.dots.forEach((dot, index) => {
      if (contains(latticePoint(dot), polygon)) result.push(index);
    });
    return result;
  }

  function recalculateEnclosed() {
    state.enclosed = new Set();
    state.strokes.forEach((stroke) => {
      if (stroke.closed) stroke.enclosed.forEach((index) => state.enclosed.add(index));
    });
  }

  function completeKolam() {
    state.solved = true;
    state.hintVisible = false;
    hintNote.hidden = true;
    gameMessage.textContent = "You found the line.";
    updateStatsForCompletion();
    saveState();
    vibrate([22, 45, 22]);
    window.setTimeout(() => {
      updateCompleteDialog();
      if (!completeDialog.open) completeDialog.showModal();
    }, reduceMotion ? 100 : 520);
  }

  function undo() {
    if (!state.strokes.length || state.solved) return;
    state.strokes.pop();
    recalculateEnclosed();
    gameMessage.textContent = state.strokes.length ? "Last stroke lifted." : "Draw around every dot.";
    saveState();
    syncInterface();
    render();
  }

  function clearDrawing() {
    if (state.solved || (!state.strokes.length && !state.current.length)) return;
    state.strokes = [];
    state.current = [];
    state.enclosed.clear();
    gameMessage.textContent = "A fresh start. Draw around every dot.";
    saveState();
    syncInterface();
    render();
    vibrate(12);
  }

  function toggleHint() {
    if (state.solved) return;
    if (state.hintVisible) {
      stopHint();
      render();
      return;
    }
    state.hintVisible = true;
    state.hintStartedAt = performance.now();
    state.hints += 1;
    hintNote.hidden = false;
    hintButton.querySelector("span").textContent = "Hide tip";
    gameMessage.textContent = "Watch where the glowing line travels.";
    saveState();
    animateHint();
  }

  function stopHint() {
    state.hintVisible = false;
    hintNote.hidden = true;
    hintButton.querySelector("span").textContent = "Show me";
  }

  function animateHint() {
    if (!state.hintVisible) return;
    render();
    requestAnimationFrame(animateHint);
  }

  function startBiggerKolam() {
    completeDialog.close();
    const currentDots = state.level.grid.dot_count;
    let nextIndex = state.levels.findIndex((level, index) => {
      return index > state.levelIndex && level.grid.dot_count > currentDots;
    });
    if (nextIndex < 0) nextIndex = Math.min(state.levelIndex + 1, state.levels.length - 1);
    state.levelIndex = nextIndex;
    state.level = state.levels[nextIndex];
    state.mode = "practice";
    state.strokes = [];
    state.current = [];
    state.enclosed = new Set();
    state.solved = false;
    state.started = false;
    state.hints = 0;
    stopHint();
    dailyLabel.textContent = "PRACTICE KOLAM · A LITTLE BIGGER";
    gameMessage.textContent = "More dots. The same calm line.";
    state.layout = createLayout(state.level, state.width, state.height);
    syncInterface();
    render();
  }

  function render() {
    if (!state.level || !state.layout || !state.width || !state.height) return;
    ctx.clearRect(0, 0, state.width, state.height);

    const dots = state.level.dots.map(latticePoint);
    dots.forEach((point, index) => drawDot(point, state.enclosed.has(index) || state.solved));

    if (state.solved) {
      drawFlourStroke(state.level.loops[0].map(latticePoint), true, 1);
    } else {
      state.strokes.forEach((stroke) => {
        drawFlourStroke(stroke.points.map(canvasPoint), stroke.closed, 1);
      });
      if (state.current.length) drawFlourStroke(state.current.map(canvasPoint), false, 1);
    }

    if (state.hintVisible && !state.solved) drawHint();
  }

  function drawDot(point, enclosed) {
    const radius = state.layout.dotRadius;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = enclosed ? palette.flour : palette.terracotta;
    ctx.fill();
    if (enclosed) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 1.7, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(241,149,77,.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawFlourStroke(points, closed, opacity) {
    if (points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    makeOrganicPath(points, closed);
    ctx.strokeStyle = palette.shadow;
    ctx.lineWidth = state.layout.lineWidth + 4;
    ctx.translate(0, 2);
    ctx.stroke();
    ctx.translate(0, -2);

    makeOrganicPath(points, closed);
    ctx.strokeStyle = palette.flourSoft;
    ctx.lineWidth = state.layout.lineWidth + 2;
    ctx.stroke();

    makeOrganicPath(points, closed);
    ctx.strokeStyle = palette.flour;
    ctx.lineWidth = state.layout.lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  function makeOrganicPath(points, closed) {
    ctx.beginPath();
    if (closed) {
      const loop = points.slice();
      if (loop.length > 2 && distance(loop[0], loop[loop.length - 1]) < 0.5) loop.pop();
      if (loop.length < 3) return;
      ctx.moveTo(...xy(midpoint(loop[loop.length - 1], loop[0])));
      loop.forEach((control, index) => {
        const next = loop[(index + 1) % loop.length];
        ctx.quadraticCurveTo(control.x, control.y, ...xy(midpoint(control, next)));
      });
      ctx.closePath();
      return;
    }

    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
      return;
    }
    for (let index = 1; index < points.length - 1; index += 1) {
      const control = points[index];
      const next = points[index + 1];
      ctx.quadraticCurveTo(control.x, control.y, ...xy(midpoint(control, next)));
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  function drawHint() {
    const perfect = state.level.loops[0].map(latticePoint);
    const elapsed = reduceMotion ? 5200 : performance.now() - state.hintStartedAt;
    const progress = reduceMotion ? 1 : (elapsed % 5200) / 5200;
    const partial = partialPath(perfect, progress);
    if (partial.length < 2) return;

    ctx.save();
    ctx.setLineDash([7, 9]);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = palette.terracotta;
    ctx.lineWidth = Math.max(3, state.layout.lineWidth * 0.58);
    ctx.shadowColor = palette.terracotta;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(partial[0].x, partial[0].y);
    partial.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
    ctx.setLineDash([]);

    const tip = partial[partial.length - 1];
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, state.layout.lineWidth * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = palette.terracotta;
    ctx.fill();
    ctx.restore();
  }

  function smooth(points, closed, minimumSpacing) {
    if (points.length < 3) return points;
    const source = points.slice();
    if (closed && distance(source[0], source[source.length - 1]) <= minimumSpacing) source.pop();
    let sampled = [];
    source.forEach((point) => {
      if (!sampled.length || distance(sampled[sampled.length - 1], point) >= minimumSpacing) sampled.push(point);
    });
    if (!closed && distance(sampled[sampled.length - 1], source[source.length - 1]) > 0.1) {
      sampled.push(source[source.length - 1]);
    }
    if (sampled.length <= (closed ? 2 : 1)) return points;
    sampled = chaikin(sampled, closed);
    sampled = chaikin(sampled, closed);
    if (closed) sampled.push(sampled[0]);
    return sampled;
  }

  function chaikin(points, closed) {
    const result = [];
    if (!closed) result.push(points[0]);
    const pairs = closed ? points.length : points.length - 1;
    for (let index = 0; index < pairs; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      result.push(weightedPoint(a, b, 0.75), weightedPoint(a, b, 0.25));
    }
    if (!closed) result.push(points[points.length - 1]);
    return result;
  }

  function partialPath(points, progress) {
    const lengths = [];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      const segment = distance(points[index - 1], points[index]);
      lengths.push(segment);
      total += segment;
    }
    const target = total * Math.max(0.002, Math.min(1, progress));
    const result = [points[0]];
    let traveled = 0;
    for (let index = 1; index < points.length; index += 1) {
      const segment = lengths[index - 1];
      if (traveled + segment <= target) {
        result.push(points[index]);
        traveled += segment;
        continue;
      }
      const amount = (target - traveled) / segment;
      result.push({
        x: points[index - 1].x + (points[index].x - points[index - 1].x) * amount,
        y: points[index - 1].y + (points[index].y - points[index - 1].y) * amount
      });
      break;
    }
    return result;
  }

  function contains(point, polygon) {
    let inside = false;
    let previous = polygon.length - 1;
    for (let current = 0; current < polygon.length; current += 1) {
      const a = polygon[current];
      const b = polygon[previous];
      const crosses = (a.y > point.y) !== (b.y > point.y);
      if (crosses) {
        const divisor = b.y - a.y || 0.0001;
        const xAtY = ((b.x - a.x) * (point.y - a.y)) / divisor + a.x;
        if (point.x < xAtY) inside = !inside;
      }
      previous = current;
    }
    return inside;
  }

  function syncInterface() {
    if (!state.level) return;
    dotCount.textContent = `${state.enclosed.size}/${state.level.grid.dot_count}`;
    const hasDrawing = state.strokes.length > 0 || state.current.length > 0;
    undoButton.disabled = !state.strokes.length || state.solved;
    clearButton.disabled = !hasDrawing || state.solved;
    hintButton.disabled = state.solved;
    canvas.style.cursor = state.solved ? "default" : "crosshair";
  }

  function markStarted() {
    if (state.started || state.mode !== "daily") return;
    state.started = true;
    const stats = readStats();
    stats.played += 1;
    writeStats(stats);
    saveState();
  }

  function updateStatsForCompletion() {
    if (state.mode !== "daily") return;
    const stats = readStats();
    if (stats.lastWin === state.dateKey) return;
    const yesterday = new Date(`${state.dateKey}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    stats.streak = stats.lastWin === utcDateKey(yesterday) ? stats.streak + 1 : 1;
    stats.best = Math.max(stats.best, stats.streak);
    stats.lastWin = state.dateKey;
    writeStats(stats);
  }

  function showStats() {
    const stats = readStats();
    $("#playedStat").textContent = stats.played;
    $("#streakStat").textContent = stats.streak;
    $("#bestStat").textContent = stats.best;
    statsDialog.showModal();
  }

  function updateCompleteDialog() {
    const stats = readStats();
    $("#completeStreak").textContent = state.mode === "daily" ? stats.streak : "✓";
    $("#hintStat").textContent = state.hints;
  }

  async function shareResult() {
    const shape = state.level.grid.shape.split("-").map((count) => "●".repeat(Math.min(Number(count), 5))).join("\n");
    const text = `Kolam · ${state.dateKey}\n${shape}\nOne line · ${state.level.grid.dot_count} dots · ${state.hints} hint${state.hints === 1 ? "" : "s"}\n${location.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Today’s Kolam", text });
      } else {
        await navigator.clipboard.writeText(text);
        showToast("Result copied");
      }
    } catch (error) {
      if (error.name !== "AbortError") showToast("Sharing is not available here");
    }
  }

  function restoreDailyState() {
    const saved = readJSON(dailyStorageKey(), null);
    if (!saved || saved.levelId !== levelId(state.level)) return;
    state.strokes = Array.isArray(saved.strokes) ? saved.strokes : [];
    state.enclosed = new Set(Array.isArray(saved.enclosed) ? saved.enclosed : []);
    state.solved = Boolean(saved.solved);
    state.started = Boolean(saved.started);
    state.hints = Number(saved.hints) || 0;
    if (state.solved) gameMessage.textContent = "Today’s line is complete.";
  }

  function saveState() {
    if (state.mode !== "daily" || !state.level) return;
    localStorage.setItem(dailyStorageKey(), JSON.stringify({
      levelId: levelId(state.level),
      strokes: state.strokes,
      enclosed: [...state.enclosed],
      solved: state.solved,
      started: state.started,
      hints: state.hints
    }));
  }

  function dailyStorageKey() { return `kolam:daily:v1:${state.dateKey}`; }
  function levelId(level) { return `${level.grid.shape}-${level.seed}`; }

  function readStats() {
    return readJSON("kolam:stats:v1", { played: 0, streak: 0, best: 0, lastWin: null });
  }

  function writeStats(stats) {
    localStorage.setItem("kolam:stats:v1", JSON.stringify(stats));
  }

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("visible"), 1700);
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function pathLength(points) {
    let total = 0;
    for (let index = 1; index < points.length; index += 1) total += distance(points[index - 1], points[index]);
    return total;
  }

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function xy(point) { return [point.x, point.y]; }
  function weightedPoint(a, b, aWeight) {
    return { x: a.x * aWeight + b.x * (1 - aWeight), y: a.y * aWeight + b.y * (1 - aWeight) };
  }
  function positiveModulo(value, divisor) { return ((value % divisor) + divisor) % divisor; }
  function utcDateKey(date) { return date.toISOString().slice(0, 10); }
  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
})();
