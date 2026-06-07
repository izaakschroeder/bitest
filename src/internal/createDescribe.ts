import type { Describe } from "bun:test";
import { FixtureMapScoped } from "./FixtureMapScoped";
import { getTestFile } from "./getTestFile";

const statics = ["only", "skip", "todo", "concurrent", "serial"] as const;

const conditionals = ["if", "skipIf", "todoIf"] as const;

type KeyStatic = (typeof statics)[number];
type KeyCondition = (typeof conditionals)[number];

function liftStatic<TKey extends KeyStatic, TCases extends readonly unknown[]>(
	base: Describe<TCases>,
	key: TKey,
): Describe<TCases>[TKey] {
	const wrapped = (...args: Parameters<Describe<TCases>>) => {
		const file = getTestFile();
		const previous = FixtureMapScoped.currentOrForFile(file);
		const scope = new FixtureMapScoped(previous);
		return scope.run(() => base[key](...args));
	};
	return wrapped as unknown as Describe<TCases>[TKey];
}

function liftCondition<
	TKey extends KeyCondition,
	TCases extends readonly unknown[],
>(base: Describe<TCases>, key: TKey): Describe<TCases>[TKey] {
	const lifted = (cond: boolean) => {
		const fn = base[key](cond);
		const wrapped = (...args: Parameters<Describe<TCases>>) => {
			const file = getTestFile();
			const previous = FixtureMapScoped.currentOrForFile(file);
			const scope = new FixtureMapScoped(previous);
			return scope.run(() => fn(...args));
		};
		return wrapped as Describe<TCases>;
	};
	return lifted as Describe<TCases>[TKey];
}

function liftEach<TCases extends readonly unknown[]>(
	base: Describe<TCases>,
): Describe<TCases>["each"] {
	const lifted = (cases: Parameters<Describe<TCases>>) => {
		const fn = base.each(cases) as unknown as (
			...args: Parameters<Describe<TCases>>
		) => void;
		// Note: we cannot run `fn(...)` directly inside the
		// `AsyncLocalStorage.run` callback because bun's native
		// `describe.each(...)(...)` implementation invokes `.bind` on the
		// callback that the ALS context creates, which currently throws
		// `TypeError: bind() called on non-callable`. We work around this
		// by having the ALS frame produce a thunk that performs the
		// `fn(...)` call outside the ALS frame.
		const wrapped = (...args: Parameters<Describe<TCases>>) => {
			const file = getTestFile();
			const previous = FixtureMapScoped.currentOrForFile(file);
			const scope = new FixtureMapScoped(previous);
			const thunk = scope.run(() => () => fn(...args));
			return thunk();
		};
		return wrapped as Describe<TCases>;
	};
	return lifted as Describe<TCases>["each"];
}

export function createDescribe<TCases extends readonly unknown[]>(
	base: Describe<TCases>,
): Describe<TCases> {
	const wrapped = (...args: Parameters<Describe<TCases>>) => {
		const file = getTestFile();
		const previous = FixtureMapScoped.currentOrForFile(file);
		const scope = new FixtureMapScoped(previous);
		return scope.run(() => base(...args));
	};
	const describe = wrapped as unknown as Describe<TCases>;
	for (const key of statics) {
		describe[key] = liftStatic(base, key);
	}
	for (const key of conditionals) {
		describe[key] = liftCondition(base, key);
	}
	describe.each = liftEach(base);
	return describe;
}
