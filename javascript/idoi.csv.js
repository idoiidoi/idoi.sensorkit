// idoi.csv.js
// CSV writing and reading shared by idoi.datarecorder and idoi.dataplayer.
// No Max globals are used here, so this file can be unit-tested with node.

"use strict";

// One CSV field (RFC 4180). Non-finite numbers become empty fields.
function field(v) {
	if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
	const s = String(v);
	return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function row(values) {
	return values.map(field).join(",") + "\n";
}

// Split one CSV line into string fields. Handles quoted fields with commas
// and doubled quotes. Line breaks inside quotes are not supported (the
// recorder never writes them because Max messages cannot contain them).
function parseLine(line) {
	const out = [];
	let cur = "";
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quoted) {
			if (ch === '"') {
				if (line[i + 1] === '"') { cur += '"'; i++; }
				else quoted = false;
			} else {
				cur += ch;
			}
		} else if (ch === '"') {
			quoted = true;
		} else if (ch === ",") {
			out.push(cur);
			cur = "";
		} else if (ch !== "\r" && ch !== "\n") {
			cur += ch;
		}
	}
	out.push(cur);
	return out;
}

// "1.5" -> 1.5, "abc" / "" -> null
function toNumber(s) {
	if (typeof s !== "string" || s.trim() === "") return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

const csv = { field, row, parseLine, toNumber };

if (typeof module !== "undefined" && module.exports) {
	module.exports = csv;
}
