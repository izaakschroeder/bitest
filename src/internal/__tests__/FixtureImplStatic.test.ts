import { expect, test } from "bun:test";
import { FixtureImplStatic } from "../FixtureImplStatic";

test("returns the static value", () => {
	const fixture = new FixtureImplStatic("test", 42, "test", false);
	expect(fixture.execute()).toBe(42);
});

test("clones object values via structuredClone", () => {
	const obj = { a: 1, nested: { b: 2 } };
	const fixture = new FixtureImplStatic("test", obj, "test", false);
	const result = fixture.execute() as typeof obj;
	expect(result).toEqual(obj);
	expect(result).not.toBe(obj);
	expect(result.nested).not.toBe(obj.nested);
});

test("does not clone primitive values", () => {
	const fixture = new FixtureImplStatic("test", "hello", "test", false);
	expect(fixture.execute()).toBe("hello");
});

test("does not clone null", () => {
	const fixture = new FixtureImplStatic("test", null, "test", false);
	expect(fixture.execute()).toBeNull();
});

test("does not clone undefined", () => {
	const fixture = new FixtureImplStatic("test", undefined, "test", false);
	expect(fixture.execute()).toBeUndefined();
});

test("scope and auto properties are accessible", () => {
	const fixture = new FixtureImplStatic("test", 42, "worker", true);
	expect(fixture.scope).toBe("worker");
	expect(fixture.auto).toBe(true);
});
