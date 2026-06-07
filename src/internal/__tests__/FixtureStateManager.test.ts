import { expect, test } from "bun:test";
import { FixtureImplStatic } from "../FixtureImplStatic";
import { FixtureMap } from "../FixtureMap";
import { FixtureStateManager } from "../FixtureStateManager";

test("getStateForTest returns a FixtureState", () => {
	const manager = new FixtureStateManager();
	const map = new FixtureMap([new FixtureImplStatic("x", 42)]);
	const state = manager.getStateForTest(map);
	expect(state).toBeDefined();
	const proxy = state.proxy as Record<string, unknown>;
	expect(proxy.x).toBe(42);
});

test("getStateForTest creates separate states for each call", () => {
	const manager = new FixtureStateManager();
	const map = new FixtureMap([new FixtureImplStatic("x", 42)]);
	const state1 = manager.getStateForTest(map);
	const state2 = manager.getStateForTest(map);
	expect(state1).not.toBe(state2);
});

test("getStateForTest handles empty fixture map", () => {
	const manager = new FixtureStateManager();
	const map = new FixtureMap();
	const state = manager.getStateForTest(map);
	expect(state).toBeDefined();
});

test("file-scoped fixtures are shared between tests in the same file", () => {
	const manager = new FixtureStateManager();
	const map = new FixtureMap([
		new FixtureImplStatic("counter", { value: 0 }, "file"),
	]);
	const state1 = manager.getStateForTest(map);
	const state2 = manager.getStateForTest(map);
	const p1 = state1.proxy as Record<string, { value: number }>;
	const p2 = state2.proxy as Record<string, { value: number }>;
	// Both tests refer to the same file-scoped fixture instance
	expect(p1.counter).toBe(p2.counter);
});

test("worker scope fixtures resolve through manager", () => {
	const map = new FixtureMap([
		new FixtureImplStatic("shared", "value", "worker"),
	]);
	const manager = new FixtureStateManager(map);
	const state = manager.getStateForTest(map);
	const proxy = state.proxy as Record<string, unknown>;
	expect(proxy.shared).toBe("value");
});

test("missing fixtures throw when accessed", () => {
	const manager = new FixtureStateManager();
	const map = new FixtureMap();
	const state = manager.getStateForTest(map);
	const proxy = state.proxy as Record<string, unknown>;
	expect(() => proxy.missing).toThrow();
});
