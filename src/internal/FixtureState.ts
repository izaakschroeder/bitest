import { isPromise } from "node:util/types";
import type { DependenciesBase, FixtureScope, IFixtureMap } from "./types";
import { waitForPromise } from "./waitForPromise";

/**
 * Object that stores the state for a given set of fixtures at a given
 * scope level. This class is instantiated:
 *
 * - Once globally for sharing fixture data within a worker,
 * - Once for each file for sharing fixture data for that file,
 * - Once for each test for providing fixture data to that test.
 */
export class FixtureState<TFixtures extends DependenciesBase> {
	/**
	 * When fixtures are resolved, their data is stored in this object.
	 * This prevents fixtures from being re-initialized if they are
	 * accessed multiple times.
	 */
	#store: Record<string, unknown> = {};

	/**
	 * Promise and its resolvers for state finalization; the promise is
	 * resolved when the state is _READY_ to be disposed. This value is
	 * managed by this class.
	 */
	#finalizer = Promise.withResolvers<void>();

	/**
	 * Set of promises to wait for before the test is marked as done.
	 * These promises are provided by fixture implementations.
	 */
	#cleanup: Promise<void>[] = [];

	/**
	 * A map of fixtures available to this state. When a fixture is
	 * accessed by a test it is looked up in this map in order to
	 * determine how to construct its value.
	 */
	#fixtures: IFixtureMap;

	/**
	 * What level of scope this fixture state is for.
	 */
	#scope: FixtureScope;

	/**
	 * The fixture object that's actually passed to the test. This is
	 * what allows lazy access to fixtures; when the value is requested
	 * on the proxy, it is synthesized on-demand.
	 */
	public readonly proxy: TFixtures;

	/**
	 * Create a new fixture state.
	 *
	 * @param scope The scope at which this state operations.
	 * @param fixtures The fixtures available to this state.
	 * @param parent Parent state to inherit fixtures from.
	 */
	constructor(
		scope: FixtureScope,
		fixtures: IFixtureMap,
		parent?: FixtureState<TFixtures>,
	) {
		this.#scope = scope;
		this.#fixtures = fixtures;
		const proxy = new Proxy(this.#store, {
			set(_target, _key) {
				throw new Error("fixtures are not writeable");
			},
			has(target, key) {
				return key in target || !!(parent && key in parent.proxy);
			},
			get: (target, key) => {
				if (typeof key !== "string") {
					throw new TypeError("fixture keys must be strings");
				}
				if (key in target) {
					return target[key as keyof typeof target];
				}
				const fixture = fixtures.get(key);
				if (!fixture) {
					throw new Error(`Missing fixture ${key}`);
				}
				if (fixture && fixture.scope === scope) {
					// biome-ignore lint/suspicious/noExplicitAny: for loop breaking
					target[key as keyof typeof target] = undefined as any;
					const res = fixture.execute(
						this.proxy,
						this.#cleanup,
						this.#finalizer.promise,
					);
					if (isPromise(res)) {
						const out = waitForPromise(
							Promise.race([res, this.#finalizer.promise]),
						);
						this.#store[key] = out;
						return out;
					}
					this.#store[key] = res;
					return res;
				}
				if (parent) {
					return parent.proxy[key as keyof typeof parent.proxy];
				}
				throw new Error(
					`tried to access a fixture "${fixture}" in scope "${scope}" that does not exist`,
				);
			},
		});
		this.proxy = proxy as TFixtures;
	}

	bootstrap(): void {
		for (const key of this.#fixtures.auto(this.#scope)) {
			Reflect.get(this.proxy, key);
		}
	}

	done(): void {
		this.#finalizer.resolve();
		if (this.#cleanup.length > 0) {
			waitForPromise(Promise.all(this.#cleanup));
		}
	}
}
