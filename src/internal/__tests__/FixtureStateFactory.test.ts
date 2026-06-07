import { expect, test } from "bun:test";
import { FixtureImplStatic } from "../FixtureImplStatic";
import { FixtureMap } from "../FixtureMap";
import { FixtureStateFactory } from "../FixtureStateFactory";

test("withFixtures provides fixture values to the wrapped function", () => {
	const factory = new FixtureStateFactory([new FixtureImplStatic("x", 42)]);
	const scoped = new FixtureMap();
	const wrapped = factory.withFixtures(
		(fixtures: Record<string, unknown>) =>
			(fixtures as Record<string, unknown>).x,
		scoped,
	);
	const result = wrapped();
	expect(result).toBe(42);
});

test("getFixtures returns the fixture list", () => {
	const fixtures = [new FixtureImplStatic("a", 1)];
	const factory = new FixtureStateFactory(fixtures);
	expect(factory.getFixtures()).toBe(fixtures);
});

test("withFixtures returns a function that can be invoked multiple times", () => {
	const factory = new FixtureStateFactory([new FixtureImplStatic("x", 42)]);
	const scoped = new FixtureMap();
	const wrapped = factory.withFixtures(
		(fixtures: Record<string, unknown>) =>
			(fixtures as Record<string, unknown>).x,
		scoped,
	);
	expect(wrapped()).toBe(42);
	expect(wrapped()).toBe(42);
});

test("withFixtures propagates fixture access errors", () => {
	const factory = new FixtureStateFactory([]);
	const scoped = new FixtureMap();
	const wrapped = factory.withFixtures(
		(fixtures: Record<string, unknown>) => fixtures.missing,
		scoped,
	);
	expect(() => wrapped()).toThrow();
});

test("withFixtures awaits async test function and propagates rejection", async () => {
	const factory = new FixtureStateFactory([]);
	const scoped = new FixtureMap();
	const wrapped = factory.withFixtures(async () => {
		throw new Error("async failure");
	}, scoped);
	await expect(wrapped()).rejects.toThrow("async failure");
});

test("withFixtures awaits async test function and returns resolved value", async () => {
	const factory = new FixtureStateFactory([new FixtureImplStatic("x", 7)]);
	const scoped = new FixtureMap();
	const wrapped = factory.withFixtures(
		async (fixtures: Record<string, unknown>) =>
			(fixtures as Record<string, unknown>).x,
		scoped,
	);
	await expect(wrapped()).resolves.toBe(7);
});

test("each FixtureStateFactory gets a unique id", () => {
	const a = new FixtureStateFactory([]);
	const b = new FixtureStateFactory([]);
	expect(a.id).not.toBe(b.id);
});
