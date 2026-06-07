import type { TestOptions } from "bun:test";

// ====================================================================
// Interfaces
// ====================================================================

/**
 * Generic interface representing a fixture.
 */
export interface IFixture<
	TDependencies extends DependenciesBase,
	TKey extends string,
	TValue,
> {
	/**
	 * Name of the fixture. Must be unique across all fixtures.
	 */
	name: TKey;

	/**
	 * The level at which the fixture is shared.
	 * See: {@link FixtureScope}
	 */
	scope: FixtureScope;

	/**
	 * True if the fixture should be automatically executed even if not
	 * directly depended on.
	 */
	auto: boolean;

	/**
	 * Create an instance of the given fixture.
	 * @param dependencies Dependencies for this fixture.
	 * @param cleanup List of promises to wait for.
	 * @param finalizer Promise that resolves right before cleanup.
	 */
	execute(
		dependencies: TDependencies,
		cleanup: Promise<void>[],
		finalizer: Promise<void>,
	): TValue | Promise<TValue>;
}

/**
 * Map-like type that can store fixtures and query some basic info
 * about them.
 */
export interface IFixtureMap {
	/**
	 * Get a given fixture if it exists, undefined otherwise.
	 * @param name Name of the fixture to get.
	 */
	get(name: string): FixtureOpaque | undefined;

	/**
	 * True if this map stores the named fixture.
	 * @param name Name of the fixture to check.
	 * @returns True if the map contains the fixtures, false otherwise.
	 */
	has(name: string): boolean;

	/**
	 * For a given fixture scope, return the list of fixture names that
	 * need to be automatically initialized for that scope.
	 * @param scope The target fixture scope.
	 * @returns List of fixture names.
	 */
	auto(scope: FixtureScope): string[];

	/**
	 * Check if this map is empty or not.
	 * @returns True if this map contains no fixtures.
	 */
	empty(): boolean;

	/**
	 * Get a list of available fixtures.
	 * @returns String array of keys.
	 */
	keys(): string[];
}

// ====================================================================
// Utility types
// ====================================================================

/**
 * The base constraint for fixture dependency record types. Real user
 * fixture maps will be narrower than this (with concrete property
 * types) but use this for the constraint so that {@link FixturesObjectBase}
 * accepts arbitrary user input.
 *
 * The choice of `Record<PropertyKey, unknown>` (rather than `{}` or
 * `Record<string, any>`) keeps us compatible with `noBannedTypes` and
 * `noExplicitAny` lints without sacrificing any inference: the
 * actual property types flow in from the test's existing dependency
 * record via the generic parameter.
 */
export type DependenciesBase = Record<PropertyKey, unknown>;

/**
 * Makes an object type with a single property `TProp` that has a
 * single value `TVal`.
 *
 * @param TProp The string property name to use
 * @param TVal The type of its value
 */
type MakeObject<TProp extends string, TVal> = {
	[K in TProp]: TVal;
};

// ====================================================================
// Configuration types
// ====================================================================

/**
 * Scope of a fixture.
 */
export type FixtureScope = "test" | "file" | "worker";

/**
 * Fixture configuration options.
 *
 * See: {@link https://vitest.dev/guide/test-context.html#fixture-options}
 */
export type FixtureConfig = {
	/**
	 * Scope of the fixture determines its lifetime and with which tests
	 * it is potentially shared.
	 */
	scope?: FixtureScope;

	/**
	 * If true, fixture will be created whether it is accessed or not.
	 */
	auto?: boolean;

	/**
	 * If true, the fixture value is treated as the fixture itself,
	 * instead of as a factory function.
	 */
	option?: boolean;
};

/**
 * Extra options passed as a second parameter in a simple fixture
 * function.
 */
type FixtureFnSimpleExtra = {
	/**
	 * Pass a callback to be executed when the fixture cleans up.
	 * @param cb Callback to be executed.
	 * @returns Nothing.
	 */
	onCleanup: (cb: () => void | Promise<void>) => void;
};

// ====================================================================
// Fixture implementation types (used by the internal classes)
// ====================================================================

/**
 * An opaque fixture, used by the runtime. The dependency type is
 * erased to `unknown` because the implementation does not actually
 * need to know it.
 */
export type FixtureOpaque = IFixture<DependenciesBase, string, unknown>;

export type FixtureOpaqueCollection =
	| FixtureOpaque[]
	| [FixtureOpaqueCollection, FixtureOpaqueCollection];

// ====================================================================
// Public fixture function types
// ====================================================================

/**
 * Type for callback passed to the user-defined fixture function that
 * must be invoked to pass the fixture value to the test.
 *
 * @param TValue The type the fixture callback consumes.
 *
 * See: {@link FixtureFnUse}
 */
export type UseFn<TValue> = (value: TValue) => Promise<void>;

/**
 * Base type used in `extends ...` block for dependencies.
 *
 * @example
 * type Dependencies = {
 *   fixture1: number;
 *   fixture2: string
 * }
 * type T = Dependencies extends DependenciesBase ? true : false;
 * // T = true
 */

/**
 * Type that defines a fixture function that provides a fixture value.
 *
 * @param TDependencies A record type indicating which other fixtures
 * this fixture function depends on.
 * @param TValue The type of value the fixture function provides.
 *
 * @example
 * const fixtureFn: FixtureFn<{foo: number}, string> =
 *   async ({ foo }, use) => {
 *     // setup code
 *     await use (`foo = ${foo}`);
 *     // teardown code
 *   }
 */
export type FixtureFnUse<TDependencies extends DependenciesBase, TValue> = (
	deps: TDependencies,
	use: UseFn<TValue>,
) => void | Promise<void>;

/**
 * A `vitest`-style simple fixture function that simply returns the
 * fixture value in the function instead of having a `use`-style
 * callback. Cleanup is done via passing a `cleanup` option in the
 * `options` entry. This function can return a promise if async, or
 * can return a normal value.
 *
 * @param TDependencies Type of representing pre-existing dependencies
 * available to be used by this function.
 * @param TValue Type returned by this function.
 */
export type FixtureFnSimple<TDependencies extends DependenciesBase, TValue> = (
	deps: TDependencies,
	options: FixtureFnSimpleExtra,
) => Promise<TValue> | TValue;

/**
 * A fixture function tuple is either a single value with a fixture
 * function inside of it _OR_ a fixture function value and associated
 * fixture configuration.
 *
 * @param TDependencies Dependencies for the fixture function
 * @param TValue Type of value produced by the fixture function
 */
type FixtureFnUseTuple<TDependencies extends DependenciesBase, TValue> =
	// Fixture function tuple with no options
	| readonly [FixtureFnUse<TDependencies, TValue>]
	// Fixture function tuple with provided options
	| readonly [FixtureFnUse<TDependencies, TValue>, FixtureConfig];

/**
 * A fixture literal tuple is a tuple with config setting the
 * `option` key to true.
 *
 * @param TValue Type of value produced by the fixture
 */
type FixtureLiteralTuple<TValue> = readonly [
	TValue,
	FixtureConfig & { option: true },
];

/**
 * The type of a single fixture producer value inside of a
 * `FixturesObjectBase` object. This is either a standalone fixture
 * function _OR_ a fixture function wrapped in a tuple.
 *
 * @param TDependencies Dependencies for the fixture function
 * @param TValue Type of value produced by the fixture function
 */
type FixtureObjectFnValue<TDependencies extends DependenciesBase, TValue> =
	| FixtureFnUseTuple<TDependencies, TValue>
	| FixtureFnUse<TDependencies, TValue>;

/**
 * The object-style fixture map that is provided to `.extend`. Each key
 * corresponds to the name of the fixture, and each value corresponds
 * to either a {@link FixtureFn} factory function, a literal value or a
 * tuple containing either of the above and a {@link FixtureConfig}.
 *
 * The trailing `unknown` in the index signature is what allows
 * primitive values to be passed: without it TypeScript would require
 * every value to be either a function or a tuple. The actual value
 * type is recovered in {@link ExtractFixturesObject}.
 *
 * @param TDependencies Type of representing pre-existing dependencies
 * available to be used by fixture functions in this object.
 */
export interface FixturesObjectBase<TDependencies extends DependenciesBase> {
	[TKey: string]:
		| FixtureLiteralTuple<unknown>
		| FixtureObjectFnValue<TDependencies, unknown>
		| unknown;
}

export type FixtureArgsBase =
	| [Record<string, unknown>]
	| [string, unknown]
	| [string, FixtureConfig, unknown];

// ====================================================================
// Extraction helpers
// ====================================================================

/**
 * Recover the value a fixture function passes to its `use` callback.
 * `TUse` is expected to look like `(value: T) => ...`.
 */
type ExtractUseValue<TUse> = TUse extends (value: infer U) => unknown
	? U
	: never;

/**
 * Given a value that may be a function, a tuple wrapping a function
 * (with optional config), a tuple wrapping a literal value with
 * `{ option: true }`, or a bare value, pull the produced fixture
 * value out of it.
 *
 * For a function (including `Mock` wrappers) we look at the second
 * parameter (`use`). For a 2-element tuple we look at the first
 * element and ignore the trailing config.
 */
type ExtractFixturesObjectValue<TValue> = TValue extends (
	// biome-ignore lint/suspicious/noExplicitAny: extension type
	...args: any[]
) => unknown
	? ExtractUseValue<Parameters<TValue>[1]>
	: TValue extends readonly [infer F, ...unknown[]]
		? // biome-ignore lint/suspicious/noExplicitAny: extension type
			F extends (...args: any[]) => unknown
			? ExtractUseValue<Parameters<F>[1]>
			: TValue extends readonly [infer V, FixtureConfig & { option: true }]
				? V
				: F
		: TValue extends readonly [infer V, FixtureConfig & { option: true }]
			? V
			: TValue;

/**
 * If you have a type that extends `FixturesObjectBase`, then produce
 * a mapped type where each key corresponds to the fixture key and
 * each value corresponds to the produced fixture value type.
 *
 * @example
 * const f = {
 *   fixture: (_: {}, use: UseFn<number>) => use(5)
 * } satisfies FixturesObjectBase<unknown>
 * type T = ExtractFixturesObject<typeof f>
 * // T = { fixture: number }
 */
type ExtractFixturesObject<TObj extends FixturesObjectBase<DependenciesBase>> =
	{
		[TKey in keyof TObj]: ExtractFixturesObjectValue<TObj[TKey]>;
	};

/**
 * Extracts the value type of a simple `vitest`-style fixture function.
 */
type ExtractFixtureFnSimple<TName extends string, TFn> = TFn extends (
	// biome-ignore lint/suspicious/noExplicitAny: extension type
	...args: any[]
) => unknown
	? MakeObject<TName, Awaited<ReturnType<TFn>>>
	: never;

// ====================================================================
// Test function argument types
// ====================================================================

/**
 * Phantom flag used to encode the difference between `test.each` and
 * `test.for` in the test cases type parameter.
 */
export type TestCasesBase = readonly unknown[] & { __sane?: boolean };

/**
 * Given a union of row tuples, produce a union of mutable tuples
 * where each member is the row's elements spread out and followed
 * by the dependency type. e.g.
 *
 *   `[1, 2, 3] | [4, 5, 9]` with `Dep` -> `[1, 2, 3, Dep] | [4, 5, 9, Dep]`
 *
 * The result is mutable (not `readonly`) so that variadic rest
 * function parameter types can be assigned to destructured parameter
 * lists with matching fixed arity, and the destructured param types
 * become the element-wise union across the row members (e.g.
 * `(a, b, c, fix) => void` with a destructured union gives
 * `a: 1 | 4, b: 2 | 5, c: 3 | 9, fix: Dep`).
 */
type SpreadRows<TRowUnion, TDep> = TRowUnion extends readonly unknown[]
	? [...TRowUnion, TDep]
	: never;

/**
 * Compute the argument list for a test function given the available
 * dependencies and the test cases.
 *
 * - No cases: the function receives only the dependencies object.
 * - `__sane: true` (`test.for`): the function receives the row as a
 *   single argument followed by the dependencies.
 * - `__sane: false` (`test.each`): the function receives the row
 *   elements spread out as individual arguments followed by the
 *   dependencies.
 *
 * The discriminant checks use `[TCases] extends [...]` to stop TS
 * from distributing the conditional across the row union, which
 * would otherwise leak the row *element* types into the inference.
 */
type TestFnArgs<
	TDependencies extends DependenciesBase,
	TCases extends TestCasesBase,
> = [TCases] extends [{ __sane: true }]
	? readonly [TCases, TDependencies]
	: [TCases] extends [{ __sane: false }]
		? [TCases] extends [readonly unknown[]]
			? SpreadRows<TCases[number], TDependencies>
			: readonly [TCases[number], TDependencies]
		: readonly [TDependencies];

// ====================================================================
// Test interface
// ====================================================================

/**
 * Runs a test.
 *
 * @example
 * test("can check if using Bun", () => {
 *   expect(Bun).toBeDefined();
 * });
 *
 * test("can make a fetch() request", async () => {
 *   const response = await fetch("https://example.com/");
 *   expect(response.ok).toBe(true);
 * });
 *
 * test("can set a timeout", async () => {
 *   await Bun.sleep(100);
 * }, 50); // or { timeout: 50 }
 *
 * @param label the label for the test
 * @param fn the test function
 * @param options the test timeout or options
 *
 */
export interface Test<
	TDependencies extends DependenciesBase,
	TCases extends TestCasesBase,
> {
	(
		label: string,
		fn: (...args: TestFnArgs<TDependencies, TCases>) => void,
		options?: TestOptions,
	): void;

	/**
	 * Object-style `extend`. Each key in `obj` becomes a fixture whose
	 * value type is inferred from the function or literal that produced
	 * it. Primitive values are passed through as-is.
	 */
	extend<TObject extends FixturesObjectBase<TDependencies>>(
		obj: TObject,
	): Test<TDependencies & ExtractFixturesObject<TObject>, TCases>;

	/**
	 * Simple `vitest`-style `extend` for adding a single function-based
	 * fixture.
	 */
	extend<TName extends string, TFn extends (deps: TDependencies) => unknown>(
		name: TName,
		fn: TFn,
	): Test<TDependencies & ExtractFixtureFnSimple<TName, TFn>, TCases>;

	/**
	 * Simple `vitest`-style `extend` for adding a single static value
	 * as a fixture.
	 */
	extend<TName extends string, TValue>(
		name: TName,
		value: TValue,
	): Test<TDependencies & MakeObject<TName, Awaited<TValue>>, TCases>;

	/**
	 * Simple `vitest`-style `extend` for adding a single function-based
	 * fixture, including a configuration object.
	 */
	extend<
		TName extends string,
		TFn extends (deps: TDependencies, config: FixtureConfig) => unknown,
	>(
		name: TName,
		config: FixtureConfig,
		fn: TFn,
	): Test<TDependencies & ExtractFixtureFnSimple<TName, TFn>, TCases>;

	/**
	 * Simple `vitest`-style `extend` for adding a single static value
	 * as a fixture, including a configuration object.
	 */
	extend<TName extends string, TValue>(
		name: TName,
		config: FixtureConfig,
		value: TValue,
	): Test<TDependencies & MakeObject<TName, Awaited<TValue>>, TCases>;

	/**
	 * Add fixtures to the surrounding lexical scope (e.g. a `describe`
	 * block or the file scope). The test itself is returned unchanged.
	 */
	scoped(...args: FixtureArgsBase): this;

	/**
	 * Alias for {@link Test.scoped}.
	 */
	use(...args: FixtureArgsBase): this;

	/**
	 * Same as `test.only`.
	 */
	only: Test<TDependencies, TCases>;

	/**
	 * Same as `test.skip`.
	 */
	skip: Test<TDependencies, TCases>;

	/**
	 * Same as `test.todo`.
	 */
	todo: Test<TDependencies, TCases>;

	/**
	 * Same as `test.failing`.
	 */
	failing: Test<TDependencies, TCases>;

	/**
	 * Same as `test.concurrent`.
	 */
	concurrent: Test<TDependencies, TCases>;

	/**
	 * Same as `test.serial`.
	 */
	serial: Test<TDependencies, TCases>;

	/**
	 * Same as `test.if`.
	 */
	if: Test<TDependencies, TCases>;

	/**
	 * Same as `test.skipIf`.
	 */
	skipIf(condition: boolean): Test<TDependencies, TCases>;

	/**
	 * Same as `test.todoIf`.
	 */
	todoIf(condition: boolean): Test<TDependencies, TCases>;

	/**
	 * Same as `test.failingIf`.
	 */
	failingIf(condition: boolean): Test<TDependencies, TCases>;

	/**
	 * Same as `test.concurrentIf`.
	 */
	concurrentIf(condition: boolean): Test<TDependencies, TCases>;

	/**
	 * Same as `test.serialIf`.
	 */
	serialIf(condition: boolean): Test<TDependencies, TCases>;

	/**
	 * `vitest`-style `test.each`. Accepts a table of rows where each
	 * row becomes the leading arguments to the test function followed
	 * by the dependencies object.
	 */
	each<const TTable extends readonly unknown[]>(
		table: TTable,
	): Test<TDependencies, TTable & { __sane: false }>;

	/**
	 * `vitest`-style `test.for`. Accepts a table of rows where each
	 * row is passed as a single tuple argument followed by the
	 * dependencies object.
	 */
	for<TRow extends readonly unknown[]>(
		table: readonly TRow[],
	): Test<TDependencies, TRow & { __sane: true }>;
}
