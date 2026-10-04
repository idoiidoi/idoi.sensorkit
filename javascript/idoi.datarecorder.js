// idoi.datarecorder.js -- record incoming lists to timestamped CSV files (v8ui, Max 9+)
//
// Usage: [v8ui @filename idoi.datarecorder.js]
// Click (or send `record 1` / `record 0`) to start and stop. Every list,
// number or message that arrives while recording becomes one CSV row.
// See help/idoi.datarecorder.maxhelp and README.md.

"use strict";

const core = require("idoi.datarecorder.core.js");
const csv = require("idoi.csv.js");

// `this` is undefined inside strict-mode functions, so keep the jsthis object.
const self = this;

inlets = 1;
outlets = 1;

setinletassist(0, "list / number / message: one CSV row; record 0/1, start, stop");
setoutletassist(0, "recording <0/1>, file <path>, rows <n>, done <path>, error <text>");

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

// ---------------------------------------------------------------------------
// Attributes (saved with the patcher)

var folder = "";      // empty: the patcher's folder, or ~/Documents if unsaved
var prefix = "";
var columns = [];
var header = 1;
var elapsed = 1;

declareattribute("folder", { setter: "setFolder", embed: 1,
	label: "Folder (empty = next to the patcher)" });
declareattribute("prefix", { setter: "setPrefix", embed: 1, label: "File Name Prefix" });
declareattribute("columns", { setter: "setColumns", embed: 1, label: "Column Names" });
declareattribute("header", { setter: "setHeader", style: "onoff", default: 1, embed: 1,
	label: "Write Header Row" });
declareattribute("elapsed", { setter: "setElapsed", style: "onoff", default: 1, embed: 1,
	label: "Write elapsed_ms Column" });

// ---------------------------------------------------------------------------
// State

let file = null;
let filePath = "";
let startTime = 0;
let rows = 0;
let headerWritten = false;
let lastError = "";
const pending = new core.WriteBuffer();

const FLUSH_MS = 250;
const ticker = new Task(onTick, this);
ticker.interval = FLUSH_MS;

function onTick() {
	flush();
	mgraphics.redraw(); // elapsed time display
}
onTick.local = 1;

// ---------------------------------------------------------------------------
// Attribute setters

function setFolder(...args) {
	folder = args.join(" ");
	lastError = "";
	mgraphics.redraw();
}

function setPrefix(...args) {
	prefix = args.join(" ");
}

function setColumns(...args) {
	columns = args.map(String);
}

function setHeader(v) {
	header = Number(v) ? 1 : 0;
}

function setElapsed(v) {
	elapsed = Number(v) ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Paths

// Folder of the top-level saved patcher, or "" when unsaved.
function patcherFolder() {
	let p = self.patcher;
	while (p && !p.filepath && p.parentpatcher) p = p.parentpatcher;
	return p && p.filepath ? core.dirname(p.filepath) : "";
}
patcherFolder.local = 1;

function targetFolder() {
	return folder || patcherFolder() || "~/Documents";
}
targetFolder.local = 1;

// Max's Folder reports end=1, count=0 for a folder that does not exist.
function folderExists(path) {
	const f = new Folder(path);
	const ok = !f.end || f.count > 0;
	f.close();
	return ok;
}
folderExists.local = 1;

function fileExists(path) {
	const f = new File(path, "read");
	const ok = f.isopen;
	f.close();
	return ok;
}
fileExists.local = 1;

// ---------------------------------------------------------------------------
// Recording

function fail(message) {
	lastError = message;
	post("idoi.datarecorder: " + message + "\n");
	outlet(0, "error", message);
	mgraphics.redraw();
}
fail.local = 1;

function startRecording() {
	if (file) return;
	const dir = targetFolder();
	// File() silently writes somewhere on the search path when the folder
	// is missing, so it has to be checked before opening.
	if (!folderExists(dir)) {
		fail("folder not found: " + dir);
		return;
	}
	const name = core.uniqueFileName(new Date(), prefix, (n) => fileExists(dir + "/" + n));
	const path = dir + "/" + name;
	const f = new File(path, "write", "TEXT");
	if (!f.isopen) {
		f.close();
		fail("cannot write " + path);
		return;
	}
	file = f;
	filePath = path;
	startTime = Date.now();
	rows = 0;
	headerWritten = !header;
	lastError = "";
	ticker.repeat();
	post("idoi.datarecorder: recording to " + path + "\n");
	outlet(0, "file", path);
	outlet(0, "recording", 1);
	mgraphics.redraw();
}
startRecording.local = 1;

function stopRecording() {
	if (!file) return;
	ticker.cancel();
	flush();
	file.close();
	file = null;
	post("idoi.datarecorder: stopped, " + rows + " rows in " + filePath + "\n");
	outlet(0, "rows", rows);
	outlet(0, "done", filePath); // the finished file, e.g. for idoi.dataplayer's read
	outlet(0, "recording", 0);
	mgraphics.redraw();
}
stopRecording.local = 1;

function flush() {
	if (!file || pending.length === 0) return;
	for (const chunk of pending.drain()) file.writestring(chunk);
}
flush.local = 1;

function addRow(values) {
	if (!file) return;
	const now = Date.now();
	if (!headerWritten) {
		const time = elapsed ? ["unix_ms", "elapsed_ms"] : ["unix_ms"];
		pending.push(csv.row(core.headerNames(time, columns, values.length)));
		headerWritten = true;
	}
	const row = elapsed ? [now, now - startTime] : [now];
	pending.push(csv.row(row.concat(values)));
	rows++;
	if (pending.length >= core.MAX_WRITE) flush();
}
addRow.local = 1;

// ---------------------------------------------------------------------------
// Input

function list(...values) {
	addRow(values);
}

function msg_float(v) {
	addRow([v]);
}

function msg_int(v) {
	addRow([v]);
}

// Any other message is recorded with its name as the first value,
// e.g. `marker start` -> ...,marker,start
function anything(...args) {
	addRow([messagename].concat(args));
}

// record 1 / record 0 (no argument toggles)
function record(v) {
	const on = v === undefined ? !file : !!Number(v);
	if (on) startRecording();
	else stopRecording();
}

function start() {
	startRecording();
}

function stop() {
	stopRecording();
}

// Back to the default folder (next to the patcher). Stops a running recording.
function clear() {
	stopRecording();
	setFolder();
}

// Compatibility with the jsui version.
function setFolderPath(...args) {
	setFolder(...args);
}

function notifydeleted() {
	stopRecording();
}

// ---------------------------------------------------------------------------
// Drawing

const FONT = "Arial";
const RED = [0.9, 0.12, 0.08, 1];
const GREEN = [0, 0.75, 0.4, 1];
const TEXT = [0.2, 0.2, 0.2, 1];
const MUTED = [0.5, 0.5, 0.5, 1];

function paint() {
	const [w, h] = mgraphics.size;
	const recording = !!file;

	mgraphics.set_source_rgba(1, 1, 1, 1);
	mgraphics.rectangle(0, 0, w, h);
	mgraphics.fill();

	// icon: the button you will press (circle = record, square = stop)
	const s = Math.min(w, h) * 0.6;
	const cx = Math.min(w, h) / 2;
	const cy = h / 2;
	if (recording) {
		mgraphics.set_source_rgba(GREEN);
		mgraphics.rectangle(cx - s / 2, cy - s / 2, s, s);
	} else {
		mgraphics.set_source_rgba(lastError ? MUTED : RED);
		mgraphics.ellipse(cx - s / 2, cy - s / 2, s, s);
	}
	mgraphics.fill();

	// text, only when there is room next to the icon
	const tx = Math.min(w, h);
	if (w - tx < 40) return;
	const size = Math.max(9, Math.min(14, h * 0.3));
	mgraphics.select_font_face(FONT);
	mgraphics.set_font_size(size);

	let line1, line2;
	if (recording) {
		line1 = core.formatDuration(Date.now() - startTime) + "  " + rows + " rows";
		line2 = filePath.slice(filePath.lastIndexOf("/") + 1);
	} else if (lastError) {
		line1 = "error";
		line2 = lastError;
	} else {
		line1 = "click to record";
		line2 = targetFolder();
	}
	const two = h >= size * 2.6;
	mgraphics.set_source_rgba(lastError && !recording ? RED : TEXT);
	mgraphics.move_to(tx, two ? cy - 2 : cy + size / 3);
	mgraphics.show_text(fit(line1, w - tx - 4));
	if (two) {
		mgraphics.set_font_size(size * 0.8);
		mgraphics.set_source_rgba(MUTED);
		mgraphics.move_to(tx, cy + size * 0.9);
		mgraphics.show_text(fit(line2, w - tx - 4));
	}
}

// Shorten from the left ("...end of/long/path") to fit in `width` pixels.
function fit(text, width) {
	if (mgraphics.text_measure(text)[0] <= width) return text;
	let t = text;
	while (t.length > 1 && mgraphics.text_measure("..." + t)[0] > width) t = t.slice(1);
	return "..." + t;
}
fit.local = 1;

function onclick() {
	record();
}
onclick.local = 1;

function onresize() {
	mgraphics.redraw();
}
onresize.local = 1;
