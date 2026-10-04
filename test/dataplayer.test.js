// Run with: node --test test/*.test.js
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const csv = require("../javascript/idoi.csv.js");
const core = require("../javascript/idoi.dataplayer.core.js");

const parse = (text) => core.parseRecording(text.trim().split("\n").map(csv.parseLine), csv.toNumber);

test("parses the datarecorder 2.x format", () => {
	const rec = parse(`
unix_ms,elapsed_ms,ax,ay
1000,0,0.1,0.2
1050,50,0.3,0.4
1100,100,marker,take1
1150,150,0.5,0.6`);
	assert.deepEqual(rec.names, ["ax", "ay"]);
	assert.deepEqual(rec.rows.map((r) => r.t), [0, 50, 150]);
	assert.deepEqual(rec.rows[1].values, [0.3, 0.4]);
	assert.deepEqual(rec.markers, [{ t: 100, values: ["marker", "take1"] }]);
	assert.equal(rec.duration, 150);
});

test("parses unix_ms only and makes time relative", () => {
	const rec = parse(`
unix_ms,ch0
5000,1
5020,2`);
	assert.deepEqual(rec.rows.map((r) => r.t), [0, 20]);
	assert.deepEqual(rec.names, ["ch0"]);
});

test("parses the headerless jsui 1.x format", () => {
	const rec = parse(`
1700000000000,1,2,3
1700000000100,4,5,6`);
	assert.deepEqual(rec.names, []);
	assert.deepEqual(rec.rows[1], { t: 100, values: [4, 5, 6] });
});

test("empty data fields become 0, blank lines are skipped", () => {
	const rec = parse(`
unix_ms,elapsed_ms,a,b
1,0,,2

2,10,3,`);
	assert.deepEqual(rec.rows.map((r) => r.values), [[0, 2], [3, 0]]);
});

test("Cursor.advance emits rows and markers in time order", () => {
	const rec = parse(`
unix_ms,elapsed_ms,a
0,0,1
0,10,marker,x
0,10,2
0,20,3`);
	const c = new core.Cursor(rec);
	assert.deepEqual(c.advance(10).map((e) => [e.t, e.marker]), [[0, false], [10, true], [10, false]]);
	assert.equal(c.atEnd, false);
	assert.deepEqual(c.advance(100).map((e) => e.values), [[3]]);
	assert.equal(c.atEnd, true);
	assert.equal(c.position, 20);
});

test("Cursor.seek lands on the first event at or after the time", () => {
	const rec = parse(`
unix_ms,elapsed_ms,a
0,0,1
0,10,2
0,20,3`);
	const c = new core.Cursor(rec);
	c.seek(10);
	assert.deepEqual(c.advance(10).map((e) => e.values), [[2]]);
	c.seek(-5);
	assert.equal(c.position, 0);
	c.seek(999);
	assert.equal(c.position, 20);
	assert.deepEqual(c.advance(999), []);
});

test("lowerBound", () => {
	const ev = [{ t: 0 }, { t: 10 }, { t: 10 }, { t: 30 }];
	assert.equal(core.lowerBound(ev, 10), 1);
	assert.equal(core.lowerBound(ev, 11), 3);
	assert.equal(core.lowerBound(ev, 99), 4);
});

test("formatTime", () => {
	assert.equal(core.formatTime(0), "00:00.0");
	assert.equal(core.formatTime(62_340), "01:02.3");
});
