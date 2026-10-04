// idoi.calibrate.core.js
// Per-channel sensor calibration for idoi.calibrate. No Max globals are used
// here, so this file can be unit-tested with plain node.
//
// For each channel:  raw -> learn min/max -> normalize -> clip -> invert
//                        -> scale to out range -> smooth -> deadband -> out

"use strict";

class Calibrator {
	constructor() {
		this.ranges = [];     // [min, max] per channel, or undefined (pass through)
		this.learning = false;
		this.outMin = 0;
		this.outMax = 1;
		this.clip = true;
		this.invert = [];     // truthy per channel
		this.smooth = 0;      // one-pole coefficient, 0 = off, 0.99 = heavy
		this.deadband = 0;    // ignore output changes smaller than this
		this.smoothed = [];
		this.last = [];
	}

	// Start learning: forget the ranges and track min/max of what arrives.
	startLearning() {
		this.ranges = [];
		this.learning = true;
	}

	stopLearning() {
		this.learning = false;
	}

	setRange(channel, min, max) {
		this.ranges[channel] = [Math.min(min, max), Math.max(min, max)];
	}

	// Flat list "min0 max0 min1 max1 ..." for saving / display.
	flatRanges() {
		const out = [];
		for (let c = 0; c < this.ranges.length; c++) {
			const r = this.ranges[c];
			out.push(r ? r[0] : 0, r ? r[1] : 0);
		}
		return out;
	}

	setFlatRanges(flat) {
		this.ranges = [];
		for (let i = 0; i + 1 < flat.length; i += 2) {
			if (flat[i] !== flat[i + 1]) this.setRange(i / 2, flat[i], flat[i + 1]);
		}
	}

	// Forget smoothing / deadband history (ranges are kept).
	resetState() {
		this.smoothed = [];
		this.last = [];
	}

	process(values) {
		const out = new Array(values.length);
		for (let c = 0; c < values.length; c++) {
			const x = values[c];
			if (typeof x !== "number" || !Number.isFinite(x)) {
				out[c] = x; // symbols pass through untouched
				continue;
			}
			if (this.learning) {
				const r = this.ranges[c];
				this.ranges[c] = r ? [Math.min(r[0], x), Math.max(r[1], x)] : [x, x];
			}
			out[c] = this.postProcess(c, this.normalize(c, x));
		}
		return out;
	}

	normalize(c, x) {
		const r = this.ranges[c];
		if (!r || r[1] - r[0] <= 1e-12) return x; // no usable range yet: pass through
		let n = (x - r[0]) / (r[1] - r[0]);
		if (this.clip) n = Math.min(1, Math.max(0, n));
		if (this.invert[c]) n = 1 - n;
		return this.outMin + n * (this.outMax - this.outMin);
	}

	postProcess(c, v) {
		const s = Math.min(0.999, Math.max(0, this.smooth));
		const prev = this.smoothed[c];
		const y = prev === undefined || s === 0 ? v : s * prev + (1 - s) * v;
		this.smoothed[c] = y;

		const last = this.last[c];
		if (last !== undefined && Math.abs(y - last) < this.deadband) return last;
		this.last[c] = y;
		return y;
	}
}

const core = { Calibrator };

if (typeof module !== "undefined" && module.exports) {
	module.exports = core;
}
