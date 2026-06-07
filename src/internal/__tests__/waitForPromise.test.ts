import { expect, test } from "bun:test";
import { waitForPromise } from "../waitForPromise";

test("returns resolved values", () => {
	const res = waitForPromise(Promise.resolve(5));
	expect(res).toEqual(5);
});

test("throws on rejected values", () => {
	expect(() => {
		waitForPromise(Promise.reject(5));
	}).toThrow();
});

test("returns undefined for Promise<void>", () => {
	const res = waitForPromise(Promise.resolve());
	expect(res).toBeUndefined();
});

test("handles string values", () => {
	const res = waitForPromise(Promise.resolve("hello"));
	expect(res).toEqual("hello");
});

test("handles object values", () => {
	const obj = { a: 1 };
	const res = waitForPromise(Promise.resolve(obj));
	expect(res).toEqual(obj);
});

test("throws an Error instance when promise rejects with one", () => {
	const e = new Error("boom");
	expect(() => waitForPromise(Promise.reject(e))).toThrow("boom");
});

test("handles boolean true values", () => {
	expect(waitForPromise(Promise.resolve(true))).toBe(true);
});

test("handles boolean false values", () => {
	expect(waitForPromise(Promise.resolve(false))).toBe(false);
});

test("handles numeric zero values", () => {
	expect(waitForPromise(Promise.resolve(0))).toBe(0);
});

test("propagates non-Error rejections", () => {
	expect(() => waitForPromise(Promise.reject("reason"))).toThrow();
});
