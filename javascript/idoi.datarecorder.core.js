// idoi.datarecorder.core.js
// Drawing- and file-independent logic for idoi.datarecorder. No Max globals
// are used here, so this file can be unit-tested with plain node.

"use strict";

// Max's File.writestring() silently truncates strings longer than 32767
// characters, so writes are split into chunks below that.
const MAX_WRITE = 32000;

function pad2(n) {
	return n < 10 ? "0" + n : String(n);
}

// "20261004_231500" in local time.
function dateStamp(date) {
	return date.getFullYear() + pad2(date.getMonth() + 1) + pad2(date.getDate()) + "_" +
		pad2(date.getHours()) + pad2(date.getMinutes()) + pad2(date.getSeconds());
}

// File name for a new recording. `exists(name)` is asked for collisions so
// two recordings started in the same second never overwrite each other.
function uniqueFileName(date, prefix, exists) {
	const base = (prefix || "") + dateStamp(date);
	let name = base + ".csv";
	for (let n = 2; exists && exists(name); n++) name = base + "_" + n + ".csv";
	return name;
}

// Header names: time columns, then user column names, then ch<N> for the rest.
function headerNames(timeColumns, columns, count) {
	const out = timeColumns.slice();
	for (let i = 0; i < count; i++) {
		out.push(columns[i] !== undefined && columns[i] !== "" ? String(columns[i]) : "ch" + i);
	}
	return out;
}

// Accumulates text and hands it out in chunks that are safe for writestring().
class WriteBuffer {
	constructor(limit) {
		this.limit = limit || MAX_WRITE;
		this.parts = [];
		this.length = 0;
	}

	push(text) {
		this.parts.push(text);
		this.length += text.length;
	}

	// Returns an array of strings, each at most `limit` characters, and empties the buffer.
	drain() {
		const chunks = [];
		let current = "";
		for (const part of this.parts) {
			if (current.length + part.length > this.limit && current.length > 0) {
				chunks.push(current);
				current = "";
			}
			// a single oversized part (very long list) is split as plain text
			let p = part;
			while (p.length > this.limit) {
				chunks.push(p.slice(0, this.limit));
				p = p.slice(this.limit);
			}
			current += p;
		}
		if (current.length > 0) chunks.push(current);
		this.parts = [];
		this.length = 0;
		return chunks;
	}
}

function dirname(path) {
	const p = String(path || "");
	const i = p.lastIndexOf("/");
	return i > 0 ? p.slice(0, i) : "";
}

// "1:02:03" / "02:03"
function formatDuration(ms) {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	return (h > 0 ? h + ":" + pad2(m) : pad2(m)) + ":" + pad2(s);
}

const core = {
	MAX_WRITE,
	dateStamp,
	uniqueFileName,
	headerNames,
	WriteBuffer,
	dirname,
	formatDuration,
};

if (typeof module !== "undefined" && module.exports) {
	module.exports = core;
}
