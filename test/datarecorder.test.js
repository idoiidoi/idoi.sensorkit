// Run with: node --test test/*.test.js
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../javascript/idoi.datarecorder.core.js");

const DATE = new Date(2026, 9, 4, 9, 5, 7); // local time

test("dateStamp pads every field", () => {
	assert.equal(core.dateStamp(DATE), "20261004_090507");
});

test("uniqueFileName avoids collisions in the same second", () => {
	const taken = new Set(["take_20261004_090507.csv", "take_20261004_090507_2.csv"]);
	assert.equal(core.uniqueFileName(DATE, "take_", (n) => taken.has(n)), "take_20261004_090507_3.csv");
	assert.equal(core.uniqueFileName(DATE, "", () => false), "20261004_090507.csv");
});

test("headerNames fills missing names with ch<N>", () => {
	assert.deepEqual(core.headerNames(["unix_ms"], ["ax", ""], 3), ["unix_ms", "ax", "ch1", "ch2"]);
});

test("WriteBuffer chunks stay under the writestring limit", () => {
	const b = new core.WriteBuffer(10);
	b.push("aaaa\n");
	b.push("bbbb\n");
	b.push("cccc\n");
	assert.deepEqual(b.drain(), ["aaaa\nbbbb\n", "cccc\n"]);
	assert.equal(b.length, 0);
	assert.deepEqual(b.drain(), []);
});

test("WriteBuffer splits a single oversized row", () => {
	const b = new core.WriteBuffer(4);
	b.push("123456789\n");
	const chunks = b.drain();
	assert.ok(chunks.every((c) => c.length <= 4));
	assert.equal(chunks.join(""), "123456789\n");
});

test("dirname strips the file name", () => {
	assert.equal(core.dirname("Macintosh HD:/a/b/c.maxpat"), "Macintosh HD:/a/b");
	assert.equal(core.dirname(""), "");
});

test("formatDuration", () => {
	assert.equal(core.formatDuration(0), "00:00");
	assert.equal(core.formatDuration(65_500), "01:05");
	assert.equal(core.formatDuration(3_723_000), "1:02:03");
});
