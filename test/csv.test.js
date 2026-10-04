// Run with: node --test test/*.test.js
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const csv = require("../javascript/idoi.csv.js");

test("field quotes only when needed", () => {
	assert.equal(csv.field(1.5), "1.5");
	assert.equal(csv.field(NaN), "");
	assert.equal(csv.field("plain"), "plain");
	assert.equal(csv.field("a,b"), '"a,b"');
	assert.equal(csv.field('say "hi"'), '"say ""hi"""');
});

test("row joins fields and ends with a newline", () => {
	assert.equal(csv.row([1, "x,y", 2]), '1,"x,y",2\n');
});

test("parseLine is the inverse of row", () => {
	const values = ["1", "x,y", 'say "hi"', "", "end"];
	assert.deepEqual(csv.parseLine(csv.row(values)), values);
});

test("parseLine handles CRLF and empty fields", () => {
	assert.deepEqual(csv.parseLine("a,,b\r\n"), ["a", "", "b"]);
});

test("toNumber", () => {
	assert.equal(csv.toNumber("1.5"), 1.5);
	assert.equal(csv.toNumber("-2e3"), -2000);
	assert.equal(csv.toNumber(""), null);
	assert.equal(csv.toNumber("marker"), null);
});
