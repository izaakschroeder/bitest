import type {
	DependenciesBase,
	FixtureFnSimple,
	FixtureScope,
	IFixture,
} from "./types";

/**
 * A fixture implementation backed by a `vitest`-style simple function
 * that produces the appropriate fixture value. Such a function looks
 * something like this:
 *
 * ```ts
 * const fn = ({ onCleanup }) => {
 *   const value = setupValue();
 *   onCleanup(() => destroyValue(value));
 *   return value;
 * }
 * ```
 *
 * The returned value can also be a [disposable] (or its async version)
 * which will be automatically disposed of instead of having to
 * manually invoke the `onCleanup` option.
 *
 * See: {@link IFixture}
 * See: https://vitest.dev/guide/test-context.html#extend-test-context
 *
 * [disposable]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/dispose
 */
export class FixtureImplFnSimple<
	TDependencies extends DependenciesBase,
	TKey extends string,
	TValue,
> implements IFixture<TDependencies, TKey, TValue>
{
	/**
	 * Create a new `FixtureImplFnSimple`.
	 *
	 * @param name Name of the fixture.
	 * @param fn Function that accepts dependencies as arguments and
	 * returns the instantiated fixture value.
	 * @param scope Scope the fixture lives at.
	 * @param auto True to always instantiate this fixture.
	 */
	constructor(
		public readonly name: TKey,
		public readonly fn: FixtureFnSimple<TDependencies, TValue>,
		public readonly scope: FixtureScope = "test",
		public readonly auto: boolean = false,
	) {}

	execute(
		dependencies: TDependencies,
		cleanup: Promise<void>[],
		finalizer: Promise<void>,
	): TValue | Promise<TValue> {
		const onCleanup = (cleanupFn: () => void | PromiseLike<void>) => {
			cleanup.push(finalizer.then(cleanupFn));
		};
		const res = this.fn(dependencies, { onCleanup });
		if (res && typeof res === "object") {
			if (Symbol.asyncDispose in res) {
				const fn = res[Symbol.asyncDispose];
				if (typeof fn === "function") {
					onCleanup(() => fn.call(res));
				}
			} else if (Symbol.dispose in res) {
				const fn = res[Symbol.dispose];
				if (typeof fn === "function") {
					onCleanup(() => fn.call(res));
				}
			}
		}
		return res;
	}
}
