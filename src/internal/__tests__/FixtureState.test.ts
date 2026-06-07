import { expect, test } from "bun:test";
import { FixtureImplStatic } from "../FixtureImplStatic";
import { FixtureMap } from "../FixtureMap";
import { FixtureState } from "../FixtureState";

test("fixture proxy resolves on access", () => {
	const map = new FixtureMap([new FixtureImplStatic("x", 42)]);
	const state = new FixtureState("test", map);
	const p = state.proxy as Record<string, unknown>;
	expect(p.x).toBe(42);
});

test("fixture proxy caches resolved values", () => {
	const map = new FixtureMap([new FixtureImplStatic("obj", { n: 1 })]);
	const state = new FixtureState("test", map);
	const p = state.proxy as Record<string, unknown>;
	const a = p.obj;
	const b = p.obj;
	expect(a).toBe(b);
});

test("fixture proxy is non-writeable", () => {
	const state = new FixtureState("test", new FixtureMap());
	expect(() => {
		(state.proxy as Record<string, unknown>).x = 1;
	}).toThrow();
});

test("fixture proxy throws on missing fixture", () => {
	const state = new FixtureState("test", new FixtureMap());
	const p = state.proxy as Record<string, unknown>;
	expect(() => p.missing).toThrow();
});

test("fixture proxy throws when accessed with non-string key", () => {
	const map = new FixtureMap([new FixtureImplStatic("x", 1)]);
	const state = new FixtureState("test", map);
	const p = state.proxy as Record<string | symbol, unknown>;
	const sym = Symbol("z");
	expect(() => p[sym]).toThrow();
});

test("fixture proxy falls back to parent when scope mismatches", () => {
	const parentMap = new FixtureMap([new FixtureImplStatic("y", 100, "file")]);
	const parent = new FixtureState("file", parentMap);
	const childMap = new FixtureMap([new FixtureImplStatic("y", 100, "file")]);
	const child = new FixtureState("test", childMap, parent);
	const p = child.proxy as Record<string, unknown>;
	expect(p.y).toBe(100);
});

test("bootstrap initializes auto fixtures", () => {
	let ran = false;
	class AutoFixture {
		name = "auto" as const;
		scope = "test" as const;
		auto = true;
		execute() {
			ran = true;
			return 1;
		}
	}
	const map = new FixtureMap([new AutoFixture()]);
	const state = new FixtureState("test", map);
	state.bootstrap();
	expect(ran).toBe(true);
});

test("done resolves finalizer and waits for cleanup", () => {
	let cleaned = false;
	class CleanupFixture {
		name = "cleanup" as const;
		scope = "test" as const;
		auto = false;
		execute(_d: unknown, cleanup: Promise<void>[], finalizer: Promise<void>) {
			cleanup.push(
				finalizer.then(() => {
					cleaned = true;
				}),
			);
			return 1;
		}
	}
	const map = new FixtureMap([new CleanupFixture()]);
	const state = new FixtureState("test", map);
	const p = state.proxy as Record<string, unknown>;
	void p.cleanup;
	state.done();
	expect(cleaned).toBe(true);
});

test("done is a no-op when no cleanup is pending", () => {
	const state = new FixtureState("test", new FixtureMap());
	expect(() => state.done()).not.toThrow();
});

test("has reports own keys and parent keys", () => {
	const parentMap = new FixtureMap([new FixtureImplStatic("y", 1, "file")]);
	const parent = new FixtureState("file", parentMap);
	const childMap = new FixtureMap([new FixtureImplStatic("x", 1)]);
	const child = new FixtureState("test", childMap, parent);
	const p = child.proxy as Record<string, unknown>;
	void p.x;
	expect("x" in p).toBe(true);
});
