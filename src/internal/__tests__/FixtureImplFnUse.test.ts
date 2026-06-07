import { expect, test } from "bun:test";
import { FixtureImplFnUse } from "../FixtureImplFnUse";

test("returns the value passed to use", async () => {
	const fixture = new FixtureImplFnUse(
		"test",
		async (_, use) => {
			await use(42);
		},
		"test",
		false,
	);
	const result = fixture.execute({}, [], Promise.resolve());
	expect(result).toBeInstanceOf(Promise);
	expect(await result).toBe(42);
});

test("rejects if the function does not return a promise", () => {
	const fn = (_deps: unknown, _use: unknown) => {
		return undefined;
	};
	const fixture = new FixtureImplFnUse("test", fn, "test", false);
	expect(() => fixture.execute({}, [], Promise.resolve())).toThrow(TypeError);
});

test("auto-disposes Symbol.dispose values passed to use", async () => {
	let disposed = false;
	const disposable = {
		[Symbol.dispose]: () => {
			disposed = true;
		},
	};
	const fixture = new FixtureImplFnUse(
		"test",
		async (_, use) => {
			await use(disposable);
		},
		"test",
		false,
	);
	const cleanup: Promise<void>[] = [];
	const finalizer = Promise.resolve();
	await fixture.execute({}, cleanup, finalizer);
	expect(cleanup).toHaveLength(1);
	await Promise.all(cleanup);
	expect(disposed).toBe(true);
});

test("auto-disposes Symbol.asyncDispose values passed to use", async () => {
	let disposed = false;
	const disposable: AsyncDisposable = {
		[Symbol.asyncDispose]: async () => {
			disposed = true;
		},
	};
	const fixture = new FixtureImplFnUse(
		"test",
		async (_, use) => {
			await use(disposable);
		},
		"test",
		false,
	);
	const cleanup: Promise<void>[] = [];
	const finalizer = Promise.resolve();
	await fixture.execute({}, cleanup, finalizer);
	expect(cleanup).toHaveLength(1);
	await Promise.all(cleanup);
	expect(disposed).toBe(true);
});

test("accepts dependencies", async () => {
	const fixture = new FixtureImplFnUse(
		"test",
		async (deps: Record<string, unknown>, use) => {
			await use(deps.foo);
		},
		"test",
		false,
	);
	const result = await fixture.execute(
		{ foo: 99 } as Record<string, unknown>,
		[],
		Promise.resolve(),
	);
	expect(result).toBe(99);
});

test("cleanup includes the fixture's teardown promise", async () => {
	let teardownCalled = false;
	const fixture = new FixtureImplFnUse(
		"test",
		async (_, use) => {
			await use(42);
			teardownCalled = true;
		},
		"test",
		false,
	);
	const cleanup: Promise<void>[] = [];
	const finalizer = Promise.resolve();
	await fixture.execute({}, cleanup, finalizer);
	expect(cleanup).toHaveLength(1);
	await Promise.all(cleanup);
	expect(teardownCalled).toBe(true);
});
