// idoi.dataplayer.core.js
// Parsing and transport logic for idoi.dataplayer. No Max globals are used
// here, so this file can be unit-tested with plain node.

"use strict";

const TIME_COLUMNS = ["unix_ms", "elapsed_ms"];

// Turn CSV lines (already split into string fields) into a recording.
//
// Accepted layouts:
//   unix_ms,elapsed_ms,a,b   (idoi.datarecorder 2.x, header on)
//   unix_ms,a,b              (elapsed off)
//   1791123637298,0.5,0.2    (no header, or the jsui 1.x recorder: first column unix ms)
//
// Rows whose first data value is not a number are markers
// (e.g. `marker,take1`) and are kept apart from the data rows.
function parseRecording(rowsOfFields, csvToNumber) {
	const toNumber = csvToNumber;
	let start = 0;
	let names = [];
	let timeIndex = 0;
	let timeIsElapsed = false;
	let skip = 1; // number of leading time columns

	const first = rowsOfFields.find((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
	if (first && toNumber(first[0]) === null) {
		// header row
		start = rowsOfFields.indexOf(first) + 1;
		const lower = first.map((s) => s.trim().toLowerCase());
		const elapsedAt = lower.indexOf("elapsed_ms");
		const unixAt = lower.indexOf("unix_ms");
		if (elapsedAt >= 0) { timeIndex = elapsedAt; timeIsElapsed = true; }
		else if (unixAt >= 0) timeIndex = unixAt;
		skip = 0;
		while (skip < lower.length && TIME_COLUMNS.includes(lower[skip])) skip++;
		if (skip === 0) skip = 1; // unknown header: first column is time
		names = first.slice(skip);
	}

	const rows = [];    // { t, values }
	const markers = []; // { t, values }
	let t0 = null;
	for (let i = start; i < rowsOfFields.length; i++) {
		const f = rowsOfFields[i];
		if (f.length < 2 && (f.length === 0 || f[0] === "")) continue;
		const rawT = toNumber(f[timeIndex]);
		if (rawT === null) continue;
		if (t0 === null) t0 = timeIsElapsed ? 0 : rawT;
		const t = rawT - t0;
		const data = f.slice(skip);
		const isMarker = data.length > 0 && toNumber(data[0]) === null && data[0] !== "";
		const values = data.map((s) => {
			const n = toNumber(s);
			return n === null ? (isMarker ? s : 0) : n;
		});
		(isMarker ? markers : rows).push({ t, values });
	}
	// recordings are written in time order, but be safe
	rows.sort((a, b) => a.t - b.t);
	markers.sort((a, b) => a.t - b.t);

	const last = Math.max(
		rows.length ? rows[rows.length - 1].t : 0,
		markers.length ? markers[markers.length - 1].t : 0);
	return { names, rows, markers, duration: last };
}

// First index in `events` (sorted by t) whose t >= time.
function lowerBound(events, time) {
	let lo = 0;
	let hi = events.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (events[mid].t < time) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

// Playback cursor over a recording. Time is in recording milliseconds;
// the caller decides how wall-clock time maps onto it (speed, pause).
class Cursor {
	constructor(recording) {
		this.rec = recording;
		this.position = 0;
		this.rowIndex = 0;
		this.markerIndex = 0;
	}

	get duration() {
		return this.rec.duration;
	}

	// Jump without emitting. Events at exactly `time` will be emitted next.
	seek(time) {
		if (time > this.duration) {
			// past the end: nothing left to play
			this.position = this.duration;
			this.rowIndex = this.rec.rows.length;
			this.markerIndex = this.rec.markers.length;
			return;
		}
		this.position = Math.max(0, time);
		this.rowIndex = lowerBound(this.rec.rows, this.position);
		this.markerIndex = lowerBound(this.rec.markers, this.position);
	}

	// Move forward to `time` and return the events passed on the way,
	// in time order: [{ t, values, marker: bool }].
	advance(time) {
		const out = [];
		const rows = this.rec.rows;
		const markers = this.rec.markers;
		while (true) {
			const r = this.rowIndex < rows.length && rows[this.rowIndex].t <= time ? rows[this.rowIndex] : null;
			const m = this.markerIndex < markers.length && markers[this.markerIndex].t <= time ? markers[this.markerIndex] : null;
			if (!r && !m) break;
			if (m && (!r || m.t <= r.t)) {
				out.push({ t: m.t, values: m.values, marker: true });
				this.markerIndex++;
			} else {
				out.push({ t: r.t, values: r.values, marker: false });
				this.rowIndex++;
			}
		}
		this.position = Math.min(time, this.duration);
		return out;
	}

	get atEnd() {
		return this.rowIndex >= this.rec.rows.length && this.markerIndex >= this.rec.markers.length;
	}
}

// "01:02.3"
function formatTime(ms) {
	const t = Math.max(0, ms) / 1000;
	const m = Math.floor(t / 60);
	const s = t - m * 60;
	return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s.toFixed(1);
}

const core = { parseRecording, lowerBound, Cursor, formatTime };

if (typeof module !== "undefined" && module.exports) {
	module.exports = core;
}
