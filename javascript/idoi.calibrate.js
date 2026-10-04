// idoi.calibrate.js -- learn sensor ranges and normalize, smooth, deadband (v8, Max 9+)
//
// Usage: [v8 idoi.calibrate.js]
// Send `learn 1`, move the sensors through their full range, send `learn 0`.
// From then on every list is mapped to 0..1 (or @outrange) per channel.
// The learned ranges are saved with the patcher.
// See help/idoi.calibrate.maxhelp and README.md.

"use strict";

const core = require("idoi.calibrate.core.js");

inlets = 1;
outlets = 2;

setinletassist(0, "list / number: raw values; learn 0/1, range, reset; other messages pass through");
setoutletassist(0, "calibrated values");
setoutletassist(1, "learn <0/1>, ranges <min max ...>");

const calib = new core.Calibrator();

// ---------------------------------------------------------------------------
// Attributes (saved with the patcher)

var ranges = [];
var outrange = [0, 1];
var clip = 1;
var invert = [];
var smooth = 0;
var deadband = 0;

declareattribute("ranges", { setter: "setRanges", embed: 1, label: "Ranges (min max per channel)" });
declareattribute("outrange", { setter: "setOutrange", embed: 1, default: [0, 1], label: "Output Range" });
declareattribute("clip", { setter: "setClip", style: "onoff", default: 1, embed: 1, label: "Clip to Output Range" });
declareattribute("invert", { setter: "setInvert", embed: 1, label: "Invert (0/1 per channel)" });
declareattribute("smooth", { setter: "setSmooth", type: "float", min: 0, max: 0.999, default: 0, embed: 1,
	label: "Smoothing (0 = off, 0.9 = heavy)" });
declareattribute("deadband", { setter: "setDeadband", type: "float", min: 0, default: 0, embed: 1,
	label: "Deadband (output units)" });

function nums(args) {
	return args.map((v) => Number(v)).filter((v) => Number.isFinite(v));
}
nums.local = 1;

function setRanges(...args) {
	calib.setFlatRanges(nums(args));
	ranges = calib.flatRanges();
}

function setOutrange(...args) {
	const v = nums(args);
	if (v.length < 2) return;
	outrange = [v[0], v[1]];
	calib.outMin = v[0];
	calib.outMax = v[1];
}

function setClip(v) {
	clip = Number(v) ? 1 : 0;
	calib.clip = !!clip;
}

function setInvert(...args) {
	invert = nums(args).map((v) => (v ? 1 : 0));
	calib.invert = invert.slice();
}

function setSmooth(v) {
	smooth = Math.min(0.999, Math.max(0, Number(v) || 0));
	calib.smooth = smooth;
}

function setDeadband(v) {
	deadband = Math.max(0, Number(v) || 0);
	calib.deadband = deadband;
}

// ---------------------------------------------------------------------------
// Input

function list(...values) {
	outlet(0, calib.process(values));
}

function msg_float(v) {
	outlet(0, calib.process([v])[0]);
}

function msg_int(v) {
	outlet(0, calib.process([v])[0]);
}

// ---------------------------------------------------------------------------
// Messages

function reportRanges() {
	ranges = calib.flatRanges();
	outlet(1, "ranges", ...ranges);
}
reportRanges.local = 1;

// learn 1: forget the ranges and track min/max; learn 0: keep what was seen
function learn(v) {
	const on = v === undefined ? !calib.learning : !!Number(v);
	if (on) calib.startLearning();
	else calib.stopLearning();
	outlet(1, "learn", on ? 1 : 0);
	if (!on) reportRanges();
}

// range <channel> <min> <max>
function range(channel, min, max) {
	const [c, lo, hi] = nums([channel, min, max]);
	if (hi === undefined || c < 0) {
		post("idoi.calibrate: range needs <channel> <min> <max>\n");
		return;
	}
	calib.setRange(Math.floor(c), lo, hi);
	reportRanges();
}

// reset: forget the ranges and the smoothing state
function reset() {
	calib.stopLearning();
	calib.ranges = [];
	calib.resetState();
	reportRanges();
}

// dump: output the current ranges
function dump() {
	reportRanges();
}

// Other messages (e.g. `marker take1`) pass through untouched, so markers can
// flow on to idoi.datarecorder.
function anything(...args) {
	outlet(0, [messagename].concat(args));
}
