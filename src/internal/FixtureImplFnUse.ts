import { isPromise } from "node:util/types";
import type {
	DependenciesBase,
	FixtureFnUse,
	FixtureScope,
	IFixture,
} from "./types";

/**
 * A fixture implementation backed by `playwright`-style functions that
 * take a `use` parameter that passes in the fixture value. Such a
 * function looks something like this:
 *
 * ```ts
 * const fn = async (use) => {
 *   const value = setupValue();
 *   use(value);
 *   await destroyValue(value);
 * }
 * ```
 *
 * The value passed to `use` can also be a [disposable] (or its async
 * version) which will be automatically disposed of instead of having
 * to clean it up yourself after invoking `use`.
 *
 * See: {@link IFixture}
 * See: https://playwright.dev/docs/test-fixtures#creating-a-fixture
 *
 * [disposable]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/dispose
 */
export class FixtureImplFnUse<
	TDependencies extends DependenciesBase,
	TKey extends string,
	TValue,
> implements IFixture<TDependencies, TKey, TValue>
{
	/**
	 * Create a new `FixtureImplFnUse`.
	 *
	 * @param name Name of the fixture.
	 * @param fn Function that accepts dependencies and `use` function
	 * to pass in the instantiated value.
	 * @param scope Scope the fixture lives at.
	 * @param auto True to always instantiate this fixture.
	 */
	constructor(
		public readonly name: TKey,
		public readonly fn: FixtureFnUse<TDependencies, TValue>,
		public readonly scope: FixtureScope = "test",
		public readonly auto: boolean = false,
	) {}

	public execute(
		dependencies: TDependencies,
		cleanup: Promise<void>[],
		finalizer: Promise<void>,
	): Promise<TValue> {
		const {
			promise: valuePromise,
			resolve: valueResolve,
			reject: valueReject,
		} = Promise.withResolvers<TValue>();
		const use = (val: TValue) => {
			valueResolve(val);
			if (val && typeof val === "object") {
				if (Symbol.asyncDispose in val) {
					const fn = val[Symbol.asyncDispose];
					if (typeof fn === "function") {
						return finalizer.then(() => fn.call(val));
					}
				}
				if (Symbol.dispose in val) {
					const fn = val[Symbol.dispose];
					if (typeof fn === "function") {
						return finalizer.then(() => fn.call(val));
					}
				}
			}
			return finalizer;
		};
		const res = this.fn(dependencies, use);
		if (!isPromise(res)) {
			throw new TypeError("Must return promise.");
		}
		cleanup.push(
			res.catch((err: unknown) => {
				valueReject(err);
				throw err;
			}),
		);
		return valuePromise;
	}
}
