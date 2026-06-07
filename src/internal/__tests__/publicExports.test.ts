import { expect, test } from "bun:test";
import * as publicModule from "../../index";

test("exports test, xtest, it, xit", () => {
	expect(publicModule.test).toBeDefined();
	expect(typeof publicModule.test).toBe("function");
	expect(publicModule.xtest).toBeDefined();
	expect(typeof publicModule.xtest).toBe("function");
	expect(publicModule.it).toBeDefined();
	expect(typeof publicModule.it).toBe("function");
	expect(publicModule.xit).toBeDefined();
	expect(typeof publicModule.xit).toBe("function");
});

test("exports describe", () => {
	expect(publicModule.describe).toBeDefined();
	expect(typeof publicModule.describe).toBe("function");
});

test("test has extend, scoped, use, skip, only, todo methods", () => {
	const t = publicModule.test;
	expect(typeof t.extend).toBe("function");
	expect(typeof t.scoped).toBe("function");
	expect(typeof t.use).toBe("function");
	expect(typeof t.skip).toBe("function");
	expect(typeof t.skipIf).toBe("function");
	expect(typeof t.only).toBe("function");
	expect(typeof t.todo).toBe("function");
	expect(typeof t.failing).toBe("function");
	expect(typeof t.concurrent).toBe("function");
	expect(typeof t.serial).toBe("function");
});

test("xtest is same as test.skip", () => {
	expect(publicModule.xtest).toBe(publicModule.test.skip);
});

test("xit is same as xtest", () => {
	expect(publicModule.xit).toBe(publicModule.xtest);
});

test("it is same as test", () => {
	expect(publicModule.it).toBe(publicModule.test);
});

test("describe has only, skip, todo, concurrent, serial", () => {
	const d = publicModule.describe;
	expect(typeof d.only).toBe("function");
	expect(typeof d.skip).toBe("function");
	expect(typeof d.todo).toBe("function");
	expect(typeof d.concurrent).toBe("function");
	expect(typeof d.serial).toBe("function");
});
