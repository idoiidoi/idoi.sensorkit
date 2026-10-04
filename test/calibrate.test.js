// Run with: node --test test/*.test.js
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Calibrator } = require("../javascript/idoi.calibrate.core.js");

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("passes values through until a range is known", () => {
	const c = new Calibrator();
	assert.deepEqual(c.process([5, -3]), [5, -3]);
});

test("learns min/max per channel and normalizes", () => {
	const c = new Calibrator();
	c.startLearning();
	c.process([100, 0]);
	c.process([300, 10]);
	c.stopLearning();
	assert.deepEqual(c.flatRanges(), [100, 300, 0, 10]);
	assert.deepEqual(c.process([200, 10]), [0.5, 1]);
});

test("clip, invert and out range", () => {
	const c = new Calibrator();
	c.setRange(0, 0, 10);
	c.setRange(1, 0, 10);
	c.invert = [0, 1];
	c.outMin = -1;
	c.outMax = 1;
	assert.deepEqual(c.process([20, 2.5]), [1, 0.5]);
	c.clip = false;
	c.resetState();
	assert.deepEqual(c.process([20, 2.5]), [3, 0.5]);
});

test("smooth is a one-pole lowpass starting at the first value", () => {
	const c = new Calibrator();
	c.smooth = 0.5;
	assert.deepEqual(c.process([0]), [0]);
	assert.deepEqual(c.process([1]), [0.5]);
	assert.deepEqual(c.process([1]), [0.75]);
});

test("deadband holds the output until it moves far enough", () => {
	const c = new Calibrator();
	c.deadband = 0.1;
	assert.deepEqual(c.process([0]), [0]);
	assert.deepEqual(c.process([0.05]), [0]);
	close(c.process([0.15])[0], 0.15);
});

test("symbols pass through untouched", () => {
	const c = new Calibrator();
	c.setRange(1, 0, 10);
	assert.deepEqual(c.process(["marker", 5]), ["marker", 0.5]);
});

test("setFlatRanges ignores empty ranges", () => {
	const c = new Calibrator();
	c.setFlatRanges([0, 10, 0, 0, 2, 4]);
	assert.deepEqual(c.process([5, 7, 3]), [0.5, 7, 0.5]);
});
