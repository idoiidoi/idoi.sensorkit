// idoi.plotter.js -- real-time multi-channel time series plotter for v8ui (Max 9+)
//
// Usage: [v8ui @filename idoi.plotter.js]
// Send lists (one value per channel) or single numbers into the inlet.
// @mode xy draws channel pairs (0,1), (2,3), ... as x/y trails instead.
// See help/idoi.plotter.maxhelp and README.md for all messages and attributes.

"use strict";

const core = require("idoi.plotter.core.js");

inlets = 1;
outlets = 1;

setinletassist(0, "list / float: one value per channel, messages");
setoutletassist(0, "autoscale <0/1>, ybounds <min> <max> when the view is changed by mouse");

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

// ---------------------------------------------------------------------------
// Attributes (saved with the patcher)
// Backing variables use `var` as required by v8's declareattribute.

var samples = 300;
var autoscale = 1;
var ymin = 0;
var ymax = 1;
var smooth = 1;
var linewidth = 1.5;
var gridx = 100;
var gridy = 1;
var legend = 1;
var fps = 30;
var names = [];
var colors = [];
var bgcolor = [1, 1, 1, 1];
var mode = "time";
var xmin = 0;
var xmax = 1;

declareattribute("samples", { setter: "setSamples", type: "long", min: 2, default: 300, embed: 1,
	label: "Buffer Length (samples)" });
declareattribute("autoscale", { setter: "setAutoscale", style: "onoff", default: 1, embed: 1,
	label: "Auto Scale Y" });
declareattribute("ymin", { setter: "setYmin", type: "float", default: 0, embed: 1, label: "Y Minimum" });
declareattribute("ymax", { setter: "setYmax", type: "float", default: 1, embed: 1, label: "Y Maximum" });
declareattribute("smooth", { setter: "setSmooth", type: "long", min: 1, default: 1, embed: 1,
	label: "Moving Average Window (1 = off)" });
declareattribute("linewidth", { setter: "setLinewidth", type: "float", min: 0.1, default: 1.5, embed: 1,
	label: "Line Width" });
declareattribute("gridx", { setter: "setGridx", type: "long", min: 0, default: 100, embed: 1,
	label: "Vertical Grid Every N Samples (0 = off)" });
declareattribute("gridy", { setter: "setGridy", style: "onoff", default: 1, embed: 1, label: "Horizontal Grid" });
declareattribute("legend", { setter: "setLegend", style: "onoff", default: 1, embed: 1,
	label: "Legend / Latest Values" });
declareattribute("fps", { setter: "setFps", type: "long", min: 1, max: 120, default: 30, embed: 1,
	label: "Redraw Rate (fps)" });
declareattribute("names", { setter: "setNames", embed: 1, label: "Channel Names" });
declareattribute("colors", { setter: "setColors", embed: 1, label: "Channel Colors (r g b ...)" });
declareattribute("bgcolor", { setter: "setBgcolor", style: "rgba", default: [1, 1, 1, 1], embed: 1,
	label: "Background Color" });
declareattribute("mode", { setter: "setMode", style: "enum", enumvals: ["time", "xy"], default: "time", embed: 1,
	label: "Mode (time: one line per channel, xy: channel pairs as x/y)" });
declareattribute("xmin", { setter: "setXmin", type: "float", default: 0, embed: 1, label: "X Minimum (xy mode)" });
declareattribute("xmax", { setter: "setXmax", type: "float", default: 1, embed: 1, label: "X Maximum (xy mode)" });

// ---------------------------------------------------------------------------
// State

const buffer = new core.SeriesBuffer(samples);
let paused = false;
let dirty = true;
let compatWindow = 3; // remembered by `windowsize` for the legacy `interpolation` message

const mouse = { startX: 0, startY: 0, x: 0, y: 0, value: 0, xValue: 0, dragging: false, ignore: false };

// Layout of the last paint, used for mouse -> value conversion.
const plot = { x: 0, y: 0, w: 1, h: 1 };

const redrawTask = new Task(onTick, this);
redrawTask.interval = 1000 / fps;
redrawTask.repeat();

function onTick() {
	if (!dirty) return;
	dirty = false;
	mgraphics.redraw();
}
onTick.local = 1;

function invalidate() {
	dirty = true;
}
invalidate.local = 1;

function notifydeleted() {
	redrawTask.cancel();
}

// ---------------------------------------------------------------------------
// Attribute setters

function num(v, fallback) {
	v = Number(v);
	return Number.isFinite(v) ? v : fallback;
}
num.local = 1;

function setSamples(v) {
	samples = Math.max(2, Math.floor(num(v, 300)));
	buffer.resize(samples);
	invalidate();
}

function setAutoscale(v) {
	autoscale = num(v, 0) ? 1 : 0;
	invalidate();
}

function setYmin(v) {
	ymin = num(v, ymin);
	invalidate();
}

function setYmax(v) {
	ymax = num(v, ymax);
	invalidate();
}

function setSmooth(v) {
	smooth = Math.max(1, Math.floor(num(v, 1)));
	invalidate();
}

function setLinewidth(v) {
	linewidth = Math.max(0.1, num(v, 1.5));
	invalidate();
}

function setGridx(v) {
	gridx = Math.max(0, Math.floor(num(v, 0)));
	invalidate();
}

function setGridy(v) {
	gridy = num(v, 0) ? 1 : 0;
	invalidate();
}

function setLegend(v) {
	legend = num(v, 0) ? 1 : 0;
	invalidate();
}

function setFps(v) {
	fps = Math.min(120, Math.max(1, Math.floor(num(v, 30))));
	redrawTask.interval = 1000 / fps;
}

function setNames(...args) {
	names = args.map(String);
	invalidate();
}

function setColors(...args) {
	colors = args.map((v) => num(v, 0));
	invalidate();
}

function setBgcolor(...args) {
	if (args.length >= 3) {
		bgcolor = [num(args[0], 1), num(args[1], 1), num(args[2], 1), num(args[3], 1)];
		invalidate();
	}
}

// mode time / mode xy (the enum index 0 / 1 is accepted too)
function setMode(v) {
	mode = v === "xy" || Number(v) === 1 ? "xy" : "time";
	invalidate();
}

function setXmin(v) {
	xmin = num(v, xmin);
	invalidate();
}

function setXmax(v) {
	xmax = num(v, xmax);
	invalidate();
}

// ---------------------------------------------------------------------------
// Data input

function list(...values) {
	if (paused) return;
	buffer.push(values);
	invalidate();
}

function msg_float(v) {
	list(v);
}

function msg_int(v) {
	list(v);
}

// ---------------------------------------------------------------------------
// Messages

// pause 1 / pause 0: freeze the display, incoming data is dropped.
function pause(v) {
	paused = v === undefined ? !paused : !!v;
	invalidate();
}

// Clear the data only. The view settings are kept.
function clear() {
	buffer.clear();
	invalidate();
}

// Clear the data and return to auto scaling.
function reset() {
	buffer.clear();
	setAutoscale(1);
}

// ybounds <min> <max>: set the Y range and turn auto scaling off.
function ybounds(min, max) {
	min = num(min, ymin);
	max = num(max, ymax);
	if (min > max) [min, max] = [max, min];
	ymin = min;
	ymax = max;
	autoscale = 0;
	invalidate();
}

// xbounds <min> <max>: set the X range (xy mode) and turn auto scaling off.
function xbounds(min, max) {
	min = num(min, xmin);
	max = num(max, xmax);
	if (min > max) [min, max] = [max, min];
	xmin = min;
	xmax = max;
	autoscale = 0;
	invalidate();
}

// setcolor <channel> <r> <g> <b>: channel numbers start at 0.
function setcolor(idx, r, g, b) {
	idx = Math.floor(num(idx, -1));
	if (idx < 0) {
		post("idoi.plotter: setcolor needs a channel index >= 0\n");
		return;
	}
	const next = colors.slice();
	while (next.length < idx * 3 + 3) {
		const c = core.defaultColor(next.length / 3);
		next.push(c[0], c[1], c[2]);
	}
	next[idx * 3] = num(r, 0);
	next[idx * 3 + 1] = num(g, 0);
	next[idx * 3 + 2] = num(b, 0);
	setColors(...next);
}

// channelname <channel> <text>: set one channel name for the legend.
// (Not called `label` or `name`: v8ui boxes take `label` themselves.)
function channelname(idx, ...text) {
	idx = Math.floor(num(idx, -1));
	if (idx < 0) return;
	const next = names.slice();
	while (next.length <= idx) next.push(String(next.length));
	next[idx] = text.join(" ");
	setNames(...next);
}

// --- Messages kept for compatibility with the jsui version ---

function setColor(idx, r, g, b) {
	setcolor(idx, r, g, b);
}

function lineinterval(step) {
	setGridx(step);
}

function windowsize(n) {
	compatWindow = Math.max(1, Math.floor(num(n, 3)));
	if (smooth > 1) setSmooth(compatWindow);
}

function interpolation(mode) {
	setSmooth(num(mode, 0) ? compatWindow : 1);
}

function anything() {
	post("idoi.plotter: unknown message \"" + messagename + "\"\n");
}

// ---------------------------------------------------------------------------
// Drawing

const FONT = "Arial";
const FONT_SIZE = 10;
const TEXT_COLOR = [0.25, 0.25, 0.25, 1];
const GRID_COLOR = [0.85, 0.85, 0.85, 1];
const ZERO_COLOR = [0.65, 0.65, 0.65, 1];

function channelColor(c) {
	if (colors.length >= c * 3 + 3) return [colors[c * 3], colors[c * 3 + 1], colors[c * 3 + 2], 1];
	const d = core.defaultColor(c);
	return [d[0], d[1], d[2], 1];
}
channelColor.local = 1;

function channelName(c) {
	return names[c] !== undefined && names[c] !== "" ? names[c] : String(c);
}
channelName.local = 1;

// Series as drawn (raw or smoothed), one array per channel.
function displaySeries() {
	const out = [];
	for (let c = 0; c < buffer.numChannels; c++) {
		out.push(core.movingAverage(buffer.toArray(c), smooth));
	}
	return out;
}
displaySeries.local = 1;

function paint() {
	const series = displaySeries();
	if (mode === "xy") paintXY(series);
	else paintTime(series);
}

// A non-degenerate range to draw with.
function viewRange(min, max) {
	return max - min > 1e-12 ? { min, max } : core.padRange(min, max, 0);
}
viewRange.local = 1;

function axisTicks(view, pixels, spacing) {
	const ticks = core.niceTicks(view.min, view.max, Math.max(2, Math.floor(pixels / spacing)));
	const step = ticks.length > 1 ? ticks[1] - ticks[0] : (view.max - view.min) / 4;
	return { ticks, labels: ticks.map((t) => core.formatValue(t, step)) };
}
axisTicks.local = 1;

// Start a frame: font, background, and the plot rectangle left of the Y labels.
function beginFrame(yLabels, bottomMargin) {
	const [width, height] = mgraphics.size;
	mgraphics.select_font_face(FONT);
	mgraphics.set_font_size(FONT_SIZE);
	let gutter = 0;
	for (const s of yLabels) gutter = Math.max(gutter, mgraphics.text_measure(s)[0]);
	gutter = gutter > 0 ? gutter + 8 : 0;

	plot.x = gutter;
	plot.y = 4;
	plot.w = Math.max(1, width - gutter - 4);
	plot.h = Math.max(1, height - 8 - bottomMargin);

	mgraphics.set_source_rgba(bgcolor);
	mgraphics.rectangle(0, 0, width, height);
	mgraphics.fill();
	return { width, height, gutter };
}
beginFrame.local = 1;

function drawHGrid(ticks, yOf) {
	mgraphics.set_line_width(1);
	for (const t of ticks) {
		const y = Math.round(yOf(t)) + 0.5;
		mgraphics.set_source_rgba(t === 0 ? ZERO_COLOR : GRID_COLOR);
		mgraphics.move_to(plot.x, y);
		mgraphics.line_to(plot.x + plot.w, y);
		mgraphics.stroke();
	}
}
drawHGrid.local = 1;

// mgraphics has no clip(), so cover everything outside the plot area.
function maskOutside(width, height) {
	mgraphics.set_source_rgba(bgcolor);
	mgraphics.rectangle(0, 0, width, plot.y);
	mgraphics.rectangle(0, plot.y + plot.h, width, height - plot.y - plot.h);
	mgraphics.rectangle(0, 0, plot.x, height);
	mgraphics.rectangle(plot.x + plot.w, 0, width - plot.x - plot.w, height);
	mgraphics.fill();
}
maskOutside.local = 1;

function drawYLabels(ticks, labels, yOf, gutter, height) {
	mgraphics.set_source_rgba(TEXT_COLOR);
	for (let i = 0; i < ticks.length; i++) {
		const y = yOf(ticks[i]);
		const tw = mgraphics.text_measure(labels[i])[0];
		mgraphics.move_to(gutter - 4 - tw, Math.min(height - 2, Math.max(FONT_SIZE, y + FONT_SIZE / 2 - 1)));
		mgraphics.show_text(labels[i]);
	}
}
drawYLabels.local = 1;

function drawPaused() {
	if (!paused) return;
	mgraphics.set_source_rgba(TEXT_COLOR);
	const tw = mgraphics.text_measure("paused")[0];
	mgraphics.move_to(plot.x + plot.w - tw - 4, plot.y + plot.h - 4);
	mgraphics.show_text("paused");
}
drawPaused.local = 1;

function paintTime(series) {
	if (autoscale) {
		const e = core.extent(series);
		if (e) {
			const r = core.padRange(e.min, e.max, 0.05);
			ymin = r.min;
			ymax = r.max;
		}
	}
	const view = viewRange(ymin, ymax);
	const height0 = mgraphics.size[1];
	const yt = gridy ? axisTicks(view, height0, 40) : { ticks: [], labels: [] };
	const { width, height, gutter } = beginFrame(yt.labels, 0);
	const yOf = (v) => core.mapRange(v, view.min, view.max, plot.y + plot.h, plot.y);

	// x: the whole buffer spans the plot width, newest sample at the right edge
	const dx = plot.w / (buffer.capacity - 1);
	const right = plot.x + plot.w;
	const count = buffer.count;
	const xOf = (i) => right - (count - 1 - i) * dx;

	// vertical grid, aligned to the absolute sample index so it scrolls with the data
	if (gridx > 0 && count > 0) {
		const firstAbs = buffer.total - count;
		mgraphics.set_line_width(1);
		mgraphics.set_source_rgba(GRID_COLOR);
		for (let k = Math.ceil(firstAbs / gridx); k * gridx <= buffer.total - 1; k++) {
			const x = Math.round(xOf(k * gridx - firstAbs)) + 0.5;
			mgraphics.move_to(x, plot.y);
			mgraphics.line_to(x, plot.y + plot.h);
		}
		mgraphics.stroke();
	}
	drawHGrid(yt.ticks, yOf);

	mgraphics.set_line_width(linewidth);
	mgraphics.set_line_join("round");
	mgraphics.set_line_cap("round");
	for (let c = 0; c < series.length; c++) {
		drawSeries(series[c], xOf, yOf, dx);
		mgraphics.set_source_rgba(channelColor(c));
		mgraphics.stroke();
	}

	maskOutside(width, height);
	drawYLabels(yt.ticks, yt.labels, yOf, gutter, height);
	if (legend && series.length > 0) {
		drawLegend(series.map((s, c) => ({
			color: channelColor(c),
			label: channelName(c) + " " + core.formatValue(s.length ? s[s.length - 1] : NaN, 0.001),
		})));
	}
	drawPaused();
}

const TRAIL_BANDS = 16;

// XY mode: channels (0,1), (2,3), ... are drawn as x/y trails.
function paintXY(series) {
	const pairs = Math.floor(series.length / 2);
	if (autoscale) {
		const ex = core.extent(series.filter((_, c) => c % 2 === 0 && c + 1 < series.length));
		const ey = core.extent(series.filter((_, c) => c % 2 === 1));
		if (ex) { const r = core.padRange(ex.min, ex.max, 0.05); xmin = r.min; xmax = r.max; }
		if (ey) { const r = core.padRange(ey.min, ey.max, 0.05); ymin = r.min; ymax = r.max; }
	}
	const vx = viewRange(xmin, xmax);
	const vy = viewRange(ymin, ymax);
	const [w0, h0] = mgraphics.size;
	const yt = gridy ? axisTicks(vy, h0, 40) : { ticks: [], labels: [] };
	const bottom = gridy ? FONT_SIZE + 6 : 0;
	const { width, height, gutter } = beginFrame(yt.labels, bottom);
	const xt = gridy ? axisTicks(vx, plot.w, 70) : { ticks: [], labels: [] };
	const xOf = (v) => core.mapRange(v, vx.min, vx.max, plot.x, plot.x + plot.w);
	const yOf = (v) => core.mapRange(v, vy.min, vy.max, plot.y + plot.h, plot.y);

	// vertical grid at the X ticks
	mgraphics.set_line_width(1);
	for (const t of xt.ticks) {
		const x = Math.round(xOf(t)) + 0.5;
		mgraphics.set_source_rgba(t === 0 ? ZERO_COLOR : GRID_COLOR);
		mgraphics.move_to(x, plot.y);
		mgraphics.line_to(x, plot.y + plot.h);
		mgraphics.stroke();
	}
	drawHGrid(yt.ticks, yOf);

	mgraphics.set_line_width(linewidth);
	mgraphics.set_line_join("round");
	mgraphics.set_line_cap("round");
	const items = [];
	for (let p = 0; p < pairs; p++) {
		const xs = series[2 * p];
		const ys = series[2 * p + 1];
		const color = channelColor(2 * p);
		drawTrail(xs, ys, xOf, yOf, color);
		const n = xs.length;
		items.push({
			color,
			label: channelName(2 * p) + "/" + channelName(2 * p + 1) + " " +
				core.formatValue(n ? xs[n - 1] : NaN, 0.001) + ", " + core.formatValue(n ? ys[n - 1] : NaN, 0.001),
		});
	}

	maskOutside(width, height);
	drawYLabels(yt.ticks, yt.labels, yOf, gutter, height);
	mgraphics.set_source_rgba(TEXT_COLOR);
	for (let i = 0; i < xt.ticks.length; i++) {
		const tw = mgraphics.text_measure(xt.labels[i])[0];
		const x = Math.min(width - tw - 2, Math.max(plot.x, xOf(xt.ticks[i]) - tw / 2));
		mgraphics.move_to(x, plot.y + plot.h + FONT_SIZE + 3);
		mgraphics.show_text(xt.labels[i]);
	}
	if (legend && items.length > 0) drawLegend(items);
	drawPaused();
}

// One x/y trail, oldest segments faint. Segments are grouped into a few
// opacity bands so the number of strokes stays small. NaN breaks the line.
function drawTrail(xs, ys, xOf, yOf, color) {
	const n = Math.min(xs.length, ys.length);
	for (let band = 0; band < TRAIL_BANDS; band++) {
		let penDown = false;
		let any = false;
		for (let i = 1; i < n; i++) {
			if (core.bandOf(i, n, TRAIL_BANDS) !== band) { penDown = false; continue; }
			const x0 = xs[i - 1], y0 = ys[i - 1], x1 = xs[i], y1 = ys[i];
			if (Number.isNaN(x0) || Number.isNaN(y0) || Number.isNaN(x1) || Number.isNaN(y1)) {
				penDown = false;
				continue;
			}
			if (!penDown) { mgraphics.move_to(xOf(x0), yOf(y0)); penDown = true; }
			mgraphics.line_to(xOf(x1), yOf(y1));
			any = true;
		}
		if (any) {
			mgraphics.set_source_rgba(color[0], color[1], color[2], core.bandAlpha(band, TRAIL_BANDS));
			mgraphics.stroke();
		}
	}
	// head
	const hx = xs[n - 1], hy = ys[n - 1];
	if (n > 0 && !Number.isNaN(hx) && !Number.isNaN(hy)) {
		const r = linewidth + 2;
		mgraphics.set_source_rgba(color);
		mgraphics.ellipse(xOf(hx) - r, yOf(hy) - r, 2 * r, 2 * r);
		mgraphics.fill();
	}
}
drawTrail.local = 1;

// Build the path for one series. NaN breaks the line. When there are more
// samples than pixels, each pixel column is reduced to its min and max so
// spikes stay visible and the cost is bounded by the plot width.
function drawSeries(values, xOf, yOf, dx) {
	const perPixel = 1 / dx;
	let penDown = false;

	if (perPixel <= 2) {
		for (let i = 0; i < values.length; i++) {
			const v = values[i];
			if (Number.isNaN(v)) { penDown = false; continue; }
			const x = xOf(i);
			const y = yOf(v);
			if (penDown) mgraphics.line_to(x, y);
			else { mgraphics.move_to(x, y); penDown = true; }
		}
		return;
	}

	let col = null;
	let lo = 0, hi = 0, loI = 0, hiI = 0;
	const flush = () => {
		const a = loI <= hiI ? lo : hi;
		const b = loI <= hiI ? hi : lo;
		const x = col + 0.5;
		if (penDown) mgraphics.line_to(x, yOf(a));
		else { mgraphics.move_to(x, yOf(a)); penDown = true; }
		if (a !== b) mgraphics.line_to(x, yOf(b));
	};
	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		if (Number.isNaN(v)) {
			if (col !== null) flush();
			col = null;
			penDown = false;
			continue;
		}
		const px = Math.floor(xOf(i));
		if (px !== col) {
			if (col !== null) flush();
			col = px; lo = hi = v; loI = hiI = i;
		} else {
			if (v < lo) { lo = v; loI = i; }
			if (v > hi) { hi = v; hiI = i; }
		}
	}
	if (col !== null) flush();
}
drawSeries.local = 1;

function drawLegend(items) {
	const sw = 8;
	const pad = 4;
	let x = plot.x + pad;
	let y = plot.y + pad;
	for (const item of items) {
		const tw = mgraphics.text_measure(item.label)[0];
		const itemW = sw + 4 + tw + 10;
		if (x + itemW > plot.x + plot.w && x > plot.x + pad) {
			x = plot.x + pad;
			y += FONT_SIZE + 4;
		}
		mgraphics.set_source_rgba(bgcolor[0], bgcolor[1], bgcolor[2], 0.75);
		mgraphics.rectangle(x - 2, y - 1, itemW - 6, FONT_SIZE + 3);
		mgraphics.fill();
		mgraphics.set_source_rgba(item.color);
		mgraphics.rectangle(x, y + 1, sw, sw);
		mgraphics.fill();
		mgraphics.set_source_rgba(TEXT_COLOR);
		mgraphics.move_to(x + sw + 4, y + FONT_SIZE - 1);
		mgraphics.show_text(item.label);
		x += itemW;
	}
}
drawLegend.local = 1;

// ---------------------------------------------------------------------------
// Mouse
//   drag             zoom around the clicked value (Y; both axes in xy mode; shift: fine)
//   cmd/ctrl + drag  move the range (Y; both axes in xy mode)
//   double click     toggle auto scaling

function valueAt(y) {
	return core.mapRange(y, plot.y + plot.h, plot.y, ymin, ymax);
}
valueAt.local = 1;

function xValueAt(x) {
	return core.mapRange(x, plot.x, plot.x + plot.w, xmin, xmax);
}
xValueAt.local = 1;

// Mouse changes to the view (and the initial state on load) are reported
// so other UI can follow.
function reportView() {
	outlet(0, "autoscale", autoscale);
	outlet(0, "ybounds", ymin, ymax);
	if (mode === "xy") outlet(0, "xbounds", xmin, xmax);
}
reportView.local = 1;

function loadbang() {
	reportView();
}

const DRAG_THRESHOLD = 3; // pixels before a click turns into a drag

function onclick(x, y) {
	mouse.startX = x;
	mouse.startY = y;
	mouse.x = x;
	mouse.y = y;
	mouse.value = valueAt(y);
	mouse.xValue = xValueAt(x);
	mouse.dragging = false;
	mouse.ignore = false;
}
onclick.local = 1;

function ondrag(x, y, but, cmd, shift, capslock, option, ctrl) {
	if (!but) {
		if (mouse.dragging) reportView();
		mouse.dragging = false;
		mouse.ignore = false;
		return;
	}
	if (mouse.ignore) return;
	if (!mouse.dragging) {
		if (Math.abs(y - mouse.startY) < DRAG_THRESHOLD && Math.abs(x - mouse.startX) < DRAG_THRESHOLD) return;
		mouse.dragging = true;
	}
	const dx = x - mouse.x;
	const dy = y - mouse.y;
	mouse.x = x;
	mouse.y = y;
	if (dx === 0 && dy === 0) return;
	autoscale = 0;
	const xy = mode === "xy";

	if (cmd || ctrl) {
		const shiftY = dy * (ymax - ymin) / plot.h;
		ymin += shiftY;
		ymax += shiftY;
		if (xy) {
			const shiftX = -dx * (xmax - xmin) / plot.w;
			xmin += shiftX;
			xmax += shiftX;
		}
	} else {
		const factor = Math.exp(dy * (shift ? 0.002 : 0.01));
		ymin = mouse.value + (ymin - mouse.value) * factor;
		ymax = mouse.value + (ymax - mouse.value) * factor;
		if (xy) {
			xmin = mouse.xValue + (xmin - mouse.xValue) * factor;
			xmax = mouse.xValue + (xmax - mouse.xValue) * factor;
		}
	}
	invalidate();
}
ondrag.local = 1;

function ondblclick() {
	// Max may deliver this before or after the second mouse up;
	// either way no drag may follow until the next click.
	mouse.ignore = true;
	setAutoscale(autoscale ? 0 : 1);
	reportView();
}
ondblclick.local = 1;

function onresize() {
	invalidate();
}
onresize.local = 1;
