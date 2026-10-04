// idoi.dataplayer.js -- play back CSV files written by idoi.datarecorder (v8ui, Max 9+)
//
// Usage: [v8ui @filename idoi.dataplayer.js]
// `read <path>` loads a file, then click or send 1 / 0 to play / pause.
// Rows come out of the left outlet with their original timing.
// See help/idoi.dataplayer.maxhelp and README.md.

"use strict";

const csv = require("idoi.csv.js");
const core = require("idoi.dataplayer.core.js");

inlets = 1;
outlets = 3;

setinletassist(0, "read <path>, 1/0 play/pause, seek <ms>, locate <0-1>, loop, speed");
setoutletassist(0, "data rows as lists");
setoutletassist(1, "marker rows as messages");
setoutletassist(2, "file, duration, columns, playing, time, end, loop, error");

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

// ---------------------------------------------------------------------------
// Attributes (saved with the patcher)

var file = "";   // loaded on patcher load when set
var loop = 0;
var speed = 1;

declareattribute("file", { setter: "setFile", embed: 1, label: "CSV File" });
declareattribute("loop", { setter: "setLoop", style: "onoff", default: 0, embed: 1, label: "Loop" });
declareattribute("speed", { setter: "setSpeed", type: "float", min: 0.01, default: 1, embed: 1,
	label: "Playback Speed" });

// ---------------------------------------------------------------------------
// State

let cursor = null;
let names = [];
let playing = false;
let wallStart = 0; // Date.now() when playback (re)started
let posStart = 0;  // recording position at that moment
let lastTimeOut = 0;
let lastError = "";
let dragging = false;

const TICK_MS = 5;
const TIME_OUT_MS = 100;
const ticker = new Task(onTick, this);
ticker.interval = TICK_MS;

// ---------------------------------------------------------------------------
// Attribute setters / loading

function setFile(...args) {
	const path = args.join(" ");
	file = path;
	if (path) load(path);
}

function setLoop(v) {
	loop = Number(v) ? 1 : 0;
}

function setSpeed(v) {
	const now = currentPosition();
	speed = Math.max(0.01, Number(v) || 1);
	restartClock(now);
}

function load(path) {
	pause();
	const f = new File(path, "read");
	if (!f.isopen) {
		fail("cannot open " + path);
		return;
	}
	const lines = [];
	while (f.position < f.eof) {
		const line = f.readline(32767);
		if (line === null || line === undefined) break;
		lines.push(csv.parseLine(line));
	}
	f.close();

	const rec = core.parseRecording(lines, csv.toNumber);
	if (rec.rows.length === 0 && rec.markers.length === 0) {
		fail("no data in " + path);
		return;
	}
	cursor = new core.Cursor(rec);
	names = rec.names;
	lastError = "";
	outlet(2, "file", path);
	outlet(2, "duration", rec.duration);
	if (names.length) outlet(2, "columns", ...names);
	outlet(2, "time", 0);
	mgraphics.redraw();
}
load.local = 1;

function fail(message) {
	lastError = message;
	cursor = null;
	post("idoi.dataplayer: " + message + "\n");
	outlet(2, "error", message);
	mgraphics.redraw();
}
fail.local = 1;

// ---------------------------------------------------------------------------
// Transport

function currentPosition() {
	if (!cursor) return 0;
	if (!playing) return cursor.position;
	return posStart + (Date.now() - wallStart) * speed;
}
currentPosition.local = 1;

function restartClock(position) {
	posStart = position;
	wallStart = Date.now();
}
restartClock.local = 1;

function onTick() {
	if (!cursor || !playing) return;
	let pos = currentPosition();
	emit(cursor.advance(pos));

	if (pos >= cursor.duration && cursor.atEnd) {
		if (loop && cursor.duration > 0) {
			cursor.seek(0);
			restartClock(0);
			outlet(2, "loop");
		} else {
			setPlaying(false);
			outlet(2, "end");
		}
	}
	const now = Date.now();
	if (now - lastTimeOut >= TIME_OUT_MS) {
		lastTimeOut = now;
		outlet(2, "time", Math.round(cursor.position));
		mgraphics.redraw();
	}
}
onTick.local = 1;

function emit(events) {
	for (const e of events) {
		if (e.marker) outlet(1, e.values);
		else outlet(0, e.values);
	}
}
emit.local = 1;

function setPlaying(on) {
	if (!cursor) return;
	if (on && cursor.atEnd) cursor.seek(0); // play at the end starts over
	if (on === playing) return;
	if (on) {
		restartClock(cursor.position);
		ticker.repeat();
	} else {
		emit(cursor.advance(currentPosition())); // flush up to where we stopped
		ticker.cancel();
	}
	playing = on;
	outlet(2, "playing", on ? 1 : 0);
	mgraphics.redraw();
}
setPlaying.local = 1;

// ---------------------------------------------------------------------------
// Messages

// read <path>: load a CSV (same as setting @file)
function read(...args) {
	setFile(...args);
}

function msg_int(v) {
	setPlaying(!!v);
}

function msg_float(v) {
	setPlaying(!!v);
}

function bang() {
	setPlaying(!playing);
}

function play() {
	setPlaying(true);
}

function pause() {
	setPlaying(false);
}

// stop: pause and go back to the start
function stop() {
	setPlaying(false);
	seek(0);
}

// seek <ms>: jump in recording time without emitting the skipped rows
function seek(ms) {
	if (!cursor) return;
	cursor.seek(Number(ms) || 0);
	restartClock(cursor.position);
	outlet(2, "time", Math.round(cursor.position));
	mgraphics.redraw();
}

// locate <0-1>: jump to a fraction of the duration.
// (Not called `position`: v8ui boxes take that message themselves and move.)
function locate(f) {
	if (!cursor) return;
	seek(Math.min(1, Math.max(0, Number(f) || 0)) * cursor.duration);
}

function notifydeleted() {
	ticker.cancel();
}

// ---------------------------------------------------------------------------
// Drawing

const FONT = "Arial";
const ACCENT = [0, 0.55, 0.85, 1];
const TEXT = [0.2, 0.2, 0.2, 1];
const MUTED = [0.55, 0.55, 0.55, 1];
const TRACK = [0.88, 0.88, 0.88, 1];
const MARKER = [0.9, 0.45, 0, 1];

// layout of the last paint, for mouse hit testing
const bar = { x: 0, y: 0, w: 1, h: 1 };
let iconSize = 0;

function paint() {
	const [w, h] = mgraphics.size;

	mgraphics.set_source_rgba(1, 1, 1, 1);
	mgraphics.rectangle(0, 0, w, h);
	mgraphics.fill();

	// play / pause icon
	iconSize = Math.min(h, 48);
	const s = iconSize * 0.5;
	const cx = iconSize / 2;
	const cy = h / 2;
	mgraphics.set_source_rgba(cursor ? ACCENT : MUTED);
	if (playing) {
		mgraphics.rectangle(cx - s / 2, cy - s / 2, s * 0.35, s);
		mgraphics.rectangle(cx + s * 0.15, cy - s / 2, s * 0.35, s);
	} else {
		mgraphics.move_to(cx - s * 0.4, cy - s / 2);
		mgraphics.line_to(cx + s * 0.5, cy);
		mgraphics.line_to(cx - s * 0.4, cy + s / 2);
		mgraphics.close_path();
	}
	mgraphics.fill();

	const x0 = iconSize + 4;
	const avail = w - x0 - 6;
	if (avail < 20) return;

	const size = Math.max(9, Math.min(12, h * 0.25));
	mgraphics.select_font_face(FONT);
	mgraphics.set_font_size(size);

	// text line
	let label;
	if (lastError) label = lastError;
	else if (!cursor) label = "read <file> to load a recording";
	else {
		const name = file.slice(file.lastIndexOf("/") + 1);
		label = core.formatTime(currentPosition()) + " / " + core.formatTime(cursor.duration) + "   " + name;
	}
	mgraphics.set_source_rgba(lastError ? MARKER : TEXT);
	mgraphics.move_to(x0, cy - 4);
	mgraphics.show_text(fit(label, avail));

	// progress bar with marker ticks
	bar.x = x0;
	bar.y = cy + 3;
	bar.w = avail;
	bar.h = Math.max(4, Math.min(8, h * 0.15));
	mgraphics.set_source_rgba(TRACK);
	mgraphics.rectangle(bar.x, bar.y, bar.w, bar.h);
	mgraphics.fill();
	if (!cursor || cursor.duration <= 0) return;

	const frac = Math.min(1, currentPosition() / cursor.duration);
	mgraphics.set_source_rgba(ACCENT);
	mgraphics.rectangle(bar.x, bar.y, bar.w * frac, bar.h);
	mgraphics.fill();

	mgraphics.set_source_rgba(MARKER);
	for (const m of cursor.rec.markers) {
		const x = bar.x + bar.w * (m.t / cursor.duration);
		mgraphics.rectangle(Math.round(x) - 1, bar.y - 3, 2, bar.h + 6);
	}
	mgraphics.fill();
}

// Shorten from the right to fit in `width` pixels.
function fit(text, width) {
	if (mgraphics.text_measure(text)[0] <= width) return text;
	let t = text;
	while (t.length > 1 && mgraphics.text_measure(t + "...")[0] > width) t = t.slice(0, -1);
	return t + "...";
}
fit.local = 1;

// ---------------------------------------------------------------------------
// Mouse: click the icon to play / pause, click or drag the bar area to seek

function seekToX(x) {
	if (!cursor) return;
	seek(Math.min(1, Math.max(0, (x - bar.x) / bar.w)) * cursor.duration);
}
seekToX.local = 1;

function onclick(x, y) {
	if (x < iconSize) {
		bang();
		dragging = false;
	} else {
		dragging = true;
		seekToX(x);
	}
}
onclick.local = 1;

function ondrag(x, y, but) {
	if (!dragging) return;
	seekToX(x);
	if (!but) dragging = false;
}
ondrag.local = 1;

function onresize() {
	mgraphics.redraw();
}
onresize.local = 1;
