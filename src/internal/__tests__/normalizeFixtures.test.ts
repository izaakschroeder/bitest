import { expect, test } from "bun:test";
import { FixtureImplFnSimple } from "../FixtureImplFnSimple";
import { FixtureImplFnUse } from "../FixtureImplFnUse";
import { FixtureImplStatic } from "../FixtureImplStatic";
import { normalizeFixtures } from "../normalizeFixtures";

test("normalizes object-style args with function values", () => {
	const fn = (_: unknown, use: (v: number) => Promise<void>) => use(5);
	const result = normalizeFixtures([{ myFixture: fn }]);
	expect(result).toHaveLength(1);
	expect(result[0]).toBeInstanceOf(FixtureImplFnUse);
	expect(result[0]?.name).toBe("myFixture");
});

test("normalizes object-style args with static values", () => {
	const result = normalizeFixtures([{ myFixture: 42 }]);
	expect(result).toHaveLength(1);
	expect(result[0]).toBeInstanceOf(FixtureImplStatic);
	expect(result[0]?.name).toBe("myFixture");
});

test("normalizes object-style args with tuple function + config", () => {
	const fn = (_: unknown, use: (v: number) => Promise<void>) => use(5);
	const result = normalizeFixtures([
		{ myFixture: [fn, { scope: "file", auto: true }] as const },
	]);
	expect(result).toHaveLength(1);
	expect(result[0]).toBeInstanceOf(FixtureImplFnUse);
	expect(result[0]?.name).toBe("myFixture");
	expect(result[0]?.scope).toBe("file");
	expect(result[0]?.auto).toBe(true);
});

test("normalizes object-style args with static tuple + option config", () => {
	const result = normalizeFixtures([
		{ myFixture: [42, { scope: "worker" }] as const },
	]);
	expect(result).toHaveLength(1);
	expect(result[0]).toBeInstanceOf(FixtureImplStatic);
	expect(result[0]?.scope).toBe("worker");
});

test("normalizes 2-arg simple fixture style (name, simpleFn)", () => {
	const fn = () => 42;
	const result = normalizeFixtures(["myFixture", fn]);
	expect(result).toHaveLength(1);
	expect(result[0]).toBeInstanceOf(FixtureImplFnSimple);
	expect(result[0]?.name).toBe("myFixture");
});

test("normalizes 2-arg static value (name, value)", () => {
	const result = normalizeFixtures(["myFixture", 42]);
	expect(result).toHaveLength(1);
	expect(result[0]).toBeInstanceOf(FixtureImplStatic);
});

test("normalizes 3-arg style (name, config, simpleFn)", () => {
	const fn = () => 42;
	const result = normalizeFixtures([
		"myFixture",
		{ scope: "file", auto: true },
		fn,
	]);
	expect(result).toHaveLength(1);
	expect(result[0]).toBeInstanceOf(FixtureImplFnSimple);
	expect(result[0]?.scope).toBe("file");
	expect(result[0]?.auto).toBe(true);
});

test("normalizes 3-arg style with static value (name, config, value)", () => {
	const result = normalizeFixtures(["myFixture", { scope: "worker" }, 42]);
	expect(result).toHaveLength(1);
	expect(result[0]).toBeInstanceOf(FixtureImplStatic);
	expect(result[0]?.scope).toBe("worker");
});

test("throws on invalid args", () => {
	expect(() =>
		normalizeFixtures([] as unknown as [{ [x: string]: unknown }]),
	).toThrow(TypeError);
});

test("normalizes object-style args with multiple fixtures", () => {
	const result = normalizeFixtures([
		{
			a: 1,
			b: 2,
			c: 3,
		},
	]);
	expect(result).toHaveLength(3);
	expect(result.map((f) => f.name)).toEqual(["a", "b", "c"]);
});

test("object-style tuple with only function defaults scope and auto", () => {
	const fn = (_: unknown, use: (v: number) => Promise<void>) => use(5);
	const result = normalizeFixtures([{ x: [fn] as const }]);
	expect(result).toHaveLength(1);
	expect(result[0]?.scope).toBe("test");
	expect(result[0]?.auto).toBe(false);
});

test("3-arg style defaults missing config values", () => {
	const result = normalizeFixtures(["x", {}, 42]);
	expect(result[0]?.scope).toBe("test");
	expect(result[0]?.auto).toBe(false);
});
