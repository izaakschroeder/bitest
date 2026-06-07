import { expect, test } from "bun:test";
import { FixtureImplStatic } from "../FixtureImplStatic";
import { FixtureMap } from "../FixtureMap";
import { FixtureMapCombined } from "../FixtureMapCombined";

function makeFixture(
	name: string,
	scope: "test" | "file" | "worker" = "test",
	auto = false,
) {
	return new FixtureImplStatic(name, name, scope, auto);
}

test("get prefers left map", () => {
	const left = new FixtureMap([makeFixture("a")]);
	const right = new FixtureMap([makeFixture("a"), makeFixture("b")]);
	const combined = new FixtureMapCombined(left, right);
	expect(combined.get("a")).toBe(left.get("a"));
	expect(combined.get("b")).toBe(right.get("b"));
});

test("has checks both maps", () => {
	const left = new FixtureMap([makeFixture("a")]);
	const right = new FixtureMap([makeFixture("b")]);
	const combined = new FixtureMapCombined(left, right);
	expect(combined.has("a")).toBe(true);
	expect(combined.has("b")).toBe(true);
	expect(combined.has("c")).toBe(false);
});

test("auto merges from both maps, preferring left", () => {
	const left = new FixtureMap([makeFixture("a", "test", true)]);
	const right = new FixtureMap([makeFixture("b", "test", true)]);
	const combined = new FixtureMapCombined(left, right);
	const auto = combined.auto("test");
	expect(auto).toContain("a");
	expect(auto).toContain("b");
});

test("auto deduplicates when left overrides right", () => {
	const left = new FixtureMap([makeFixture("a", "test", true)]);
	const right = new FixtureMap([makeFixture("a", "test", true)]);
	const combined = new FixtureMapCombined(left, right);
	expect(combined.auto("test")).toEqual(["a"]);
});

test("empty returns true only when both maps are empty", () => {
	const empty = new FixtureMap();
	const nonEmpty = new FixtureMap([makeFixture("a")]);
	expect(new FixtureMapCombined(empty, empty).empty()).toBe(true);
	expect(new FixtureMapCombined(nonEmpty, empty).empty()).toBe(false);
	expect(new FixtureMapCombined(empty, nonEmpty).empty()).toBe(false);
});

test("static from returns left when right is empty", () => {
	const left = new FixtureMap([makeFixture("a")]);
	const right = new FixtureMap();
	const result = FixtureMapCombined.from(left, right);
	expect(result).toBe(left);
});

test("static from returns right when left is empty", () => {
	const left = new FixtureMap();
	const right = new FixtureMap([makeFixture("a")]);
	const result = FixtureMapCombined.from(left, right);
	expect(result).toBe(right);
});

test("static from returns combined when both are non-empty", () => {
	const left = new FixtureMap([makeFixture("a")]);
	const right = new FixtureMap([makeFixture("b")]);
	const result = FixtureMapCombined.from(left, right);
	expect(result).toBeInstanceOf(FixtureMapCombined);
});

test("keys returns deduplicated keys from both maps", () => {
	const left = new FixtureMap([makeFixture("a"), makeFixture("b")]);
	const right = new FixtureMap([makeFixture("b"), makeFixture("c")]);
	const combined = new FixtureMapCombined(left, right);
	const keys = combined.keys();
	expect(keys).toContain("a");
	expect(keys).toContain("b");
	expect(keys).toContain("c");
});

test("get returns undefined when missing in both maps", () => {
	const left = new FixtureMap([makeFixture("a")]);
	const right = new FixtureMap([makeFixture("b")]);
	const combined = new FixtureMapCombined(left, right);
	expect(combined.get("missing")).toBeUndefined();
});

test("static from returns combined when both are empty", () => {
	const left = new FixtureMap();
	const right = new FixtureMap();
	const result = FixtureMapCombined.from(left, right);
	// Both empty => `from` short-circuits to one of them.
	expect(result.empty()).toBe(true);
});

test("auto from left only when right is empty", () => {
	const left = new FixtureMap([makeFixture("a", "test", true)]);
	const right = new FixtureMap();
	const combined = new FixtureMapCombined(left, right);
	expect(combined.auto("test")).toEqual(["a"]);
});

test("auto across scopes only returns matching scope", () => {
	const left = new FixtureMap([
		makeFixture("a", "test", true),
		makeFixture("b", "file", true),
	]);
	const right = new FixtureMap([makeFixture("c", "worker", true)]);
	const combined = new FixtureMapCombined(left, right);
	expect(combined.auto("test")).toEqual(["a"]);
	expect(combined.auto("file")).toEqual(["b"]);
	expect(combined.auto("worker")).toEqual(["c"]);
});
