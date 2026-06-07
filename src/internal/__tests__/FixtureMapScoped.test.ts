import { expect, test } from "bun:test";
import { FixtureMapScoped } from "../FixtureMapScoped";

test("current returns undefined when no scope is active", () => {
	expect(FixtureMapScoped.current()).toBeUndefined();
});

test("run sets current scope within callback", () => {
	const scope = new FixtureMapScoped();
	scope.run(() => {
		expect(FixtureMapScoped.current()).toBe(scope);
	});
});

test("current returns undefined after run completes", () => {
	const scope = new FixtureMapScoped();
	scope.run(() => {});
	expect(FixtureMapScoped.current()).toBeUndefined();
});

test("nested scopes are properly nested", () => {
	const outer = new FixtureMapScoped();
	const inner = new FixtureMapScoped(outer);
	outer.run(() => {
		expect(FixtureMapScoped.current()).toBe(outer);
		inner.run(() => {
			expect(FixtureMapScoped.current()).toBe(inner);
		});
		expect(FixtureMapScoped.current()).toBe(outer);
	});
});

test("forFile returns same instance for same file", () => {
	const a = FixtureMapScoped.forFile("/test/file.ts");
	const b = FixtureMapScoped.forFile("/test/file.ts");
	expect(a).toBe(b);
});

test("forFile returns different instances for different files", () => {
	const a = FixtureMapScoped.forFile("/test/a.ts");
	const b = FixtureMapScoped.forFile("/test/b.ts");
	expect(a).not.toBe(b);
});

test("currentOrForFile returns current scope if active", () => {
	const scope = new FixtureMapScoped();
	scope.run(() => {
		const result = FixtureMapScoped.currentOrForFile("/some/file.ts");
		expect(result).toBe(scope);
	});
});

test("currentOrForFile falls back to forFile when no scope is active", () => {
	const result = FixtureMapScoped.currentOrForFile("/test/file.ts");
	const expected = FixtureMapScoped.forFile("/test/file.ts");
	expect(result).toBe(expected);
});

test("forFile caches per-file instances", () => {
	const a1 = FixtureMapScoped.forFile("/cache/path.ts");
	const a2 = FixtureMapScoped.forFile("/cache/path.ts");
	expect(a1).toBe(a2);
});

test("run returns the value of its callback", () => {
	const scope = new FixtureMapScoped();
	const out = scope.run(() => 42);
	expect(out).toBe(42);
});

test("parent is exposed via the parent property", () => {
	const parent = new FixtureMapScoped();
	const child = new FixtureMapScoped(parent);
	expect(child.parent).toBe(parent);
});

test("FixtureMapScoped inherits FixtureMap behaviours", () => {
	const scope = new FixtureMapScoped();
	expect(scope.empty()).toBe(true);
	expect(scope.has("missing")).toBe(false);
	expect(scope.get("missing")).toBeUndefined();
});
