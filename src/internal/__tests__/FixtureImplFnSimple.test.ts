import { expect, test } from "bun:test";
import { FixtureImplFnSimple } from "../FixtureImplFnSimple";

test("returns the value from the simple function", () => {
	const fixture = new FixtureImplFnSimple("test", () => 42, "test", false);
	const result = fixture.execute({}, [], Promise.resolve());
	expect(result).toBe(42);
});

test("supports async simple functions", async () => {
	const fixture = new FixtureImplFnSimple(
		"test",
		async () => 42,
		"test",
		false,
	);
	const result = fixture.execute({}, [], Promise.resolve());
	expect(result).toBeInstanceOf(Promise);
	expect(await result).toBe(42);
});

test("onCleanup is called on cleanup", async () => {
	let cleaned = false;
	const fixture = new FixtureImplFnSimple(
		"test",
		(_, { onCleanup }) => {
			onCleanup(() => {
				cleaned = true;
			});
			return 42;
		},
		"test",
		false,
	);
	const cleanup: Promise<void>[] = [];
	const finalizer = Promise.resolve();
	fixture.execute({}, cleanup, finalizer);
	expect(cleanup).toHaveLength(1);
	await Promise.all(cleanup);
	expect(cleaned).toBe(true);
});

test("auto-disposes Symbol.dispose values", async () => {
	let disposed = false;
	const disposable = {
		[Symbol.dispose]: () => {
			disposed = true;
		},
	};
	const fixture = new FixtureImplFnSimple(
		"test",
		() => disposable,
		"test",
		false,
	);
	const cleanup: Promise<void>[] = [];
	fixture.execute({}, cleanup, Promise.resolve());
	expect(cleanup).toHaveLength(1);
	await Promise.all(cleanup);
	expect(disposed).toBe(true);
});

test("auto-disposes Symbol.asyncDispose values", async () => {
	let disposed = false;
	const disposable: AsyncDisposable = {
		[Symbol.asyncDispose]: async () => {
			disposed = true;
		},
	};
	const fixture = new FixtureImplFnSimple(
		"test",
		() => disposable,
		"test",
		false,
	);
	const cleanup: Promise<void>[] = [];
	fixture.execute({}, cleanup, Promise.resolve());
	expect(cleanup).toHaveLength(1);
	await Promise.all(cleanup);
	expect(disposed).toBe(true);
});

test("accepts dependencies", () => {
	const fixture = new FixtureImplFnSimple(
		"test",
		(deps: Record<string, unknown>) => deps.foo,
		"test",
		false,
	);
	const result = fixture.execute(
		{ foo: 99 } as Record<string, unknown>,
		[],
		Promise.resolve(),
	);
	expect(result).toBe(99);
});
