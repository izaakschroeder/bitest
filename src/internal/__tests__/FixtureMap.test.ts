import { expect, test } from "bun:test";
import { FixtureImplStatic } from "../FixtureImplStatic";
import { FixtureMap } from "../FixtureMap";

function makeFixture(
	name: string,
	scope: "test" | "file" | "worker" = "test",
	auto = false,
) {
	return new FixtureImplStatic(name, name, scope, auto);
}

test("empty map reports empty", () => {
	const map = new FixtureMap();
	expect(map.empty()).toBe(true);
});

test("map with fixtures reports not empty", () => {
	const map = new FixtureMap([makeFixture("a")]);
	expect(map.empty()).toBe(false);
});

test("get returns fixture by name", () => {
	const a = makeFixture("a");
	const map = new FixtureMap([a]);
	expect(map.get("a")).toBe(a);
});

test("get returns undefined for missing name", () => {
	const map = new FixtureMap();
	expect(map.get("missing")).toBeUndefined();
});

test("has returns true for existing fixture", () => {
	const map = new FixtureMap([makeFixture("a")]);
	expect(map.has("a")).toBe(true);
});

test("has returns false for missing fixture", () => {
	const map = new FixtureMap();
	expect(map.has("missing")).toBe(false);
});

test("keys returns fixture names", () => {
	const map = new FixtureMap([makeFixture("a"), makeFixture("b")]);
	expect(map.keys()).toEqual(["a", "b"]);
});

test("auto returns auto fixtures for given scope", () => {
	const map = new FixtureMap([
		makeFixture("a", "test", true),
		makeFixture("b", "file", true),
		makeFixture("c", "test", false),
	]);
	expect(map.auto("test")).toEqual(["a"]);
	expect(map.auto("file")).toEqual(["b"]);
});

test("falls back to parent map", () => {
	const parent = new FixtureMap([makeFixture("a")]);
	const child = new FixtureMap([makeFixture("b")], parent);
	expect(child.get("a")).toBeDefined();
	expect(child.get("b")).toBeDefined();
	expect(child.has("a")).toBe(true);
});

test("child overrides parent fixture", () => {
	const a = makeFixture("a");
	const aOverride = makeFixture("a");
	const parent = new FixtureMap([a]);
	const child = new FixtureMap([aOverride], parent);
	expect(child.get("a")).toBe(aOverride);
});

test("child auto fixtures are returned", () => {
	const parent = new FixtureMap([makeFixture("a", "test", true)]);
	const child = new FixtureMap([makeFixture("b", "test", true)], parent);
	const auto = child.auto("test");
	expect(auto).toContain("b");
});

test("toString includes own keys and parent keys", () => {
	const parent = new FixtureMap([makeFixture("a")]);
	const child = new FixtureMap([makeFixture("b")], parent);
	expect(child.toString()).toContain("a");
	expect(child.toString()).toContain("b");
	expect(child.toString()).toContain("|");
});

test("toString without parent", () => {
	const map = new FixtureMap([makeFixture("a"), makeFixture("b")]);
	expect(map.toString()).toContain("a");
	expect(map.toString()).toContain("b");
});

test("empty with parent considers parent emptiness", () => {
	const emptyParent = new FixtureMap();
	const emptyChild = new FixtureMap([], emptyParent);
	expect(emptyChild.empty()).toBe(true);
});

test("has returns true for parent fixture", () => {
	const parent = new FixtureMap([makeFixture("x")]);
	const child = new FixtureMap([], parent);
	expect(child.has("x")).toBe(true);
	expect(child.has("y")).toBe(false);
});

test("keys returns parent keys when child has no own keys", () => {
	const parent = new FixtureMap([makeFixture("x"), makeFixture("y")]);
	const child = new FixtureMap([], parent);
	const keys = child.keys();
	expect(keys).toContain("x");
	expect(keys).toContain("y");
});

test("auto returns empty array when no auto fixtures match scope", () => {
	const map = new FixtureMap([
		makeFixture("a", "test", false),
		makeFixture("b", "test", false),
	]);
	expect(map.auto("test")).toEqual([]);
});

test("auto returns empty array when scope does not match", () => {
	const map = new FixtureMap([makeFixture("a", "file", true)]);
	expect(map.auto("test")).toEqual([]);
	expect(map.auto("worker")).toEqual([]);
});

test("auto with parent does not duplicate overridden auto fixtures", () => {
	const parent = new FixtureMap([makeFixture("a", "test", true)]);
	const child = new FixtureMap([makeFixture("a", "test", true)], parent);
	const auto = child.auto("test");
	expect(auto).toEqual(["a"]);
});
