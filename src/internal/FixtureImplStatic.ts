import type { DependenciesBase, FixtureScope, IFixture } from "./types";

/**
 * A fixture implementation that is backed by a single, static value.
 * This value is cloned via `structuredClone` so that a unique copy
 * can be provided for the appropriately given scope.
 *
 * See: {@link IFixture}
 */
export class FixtureImplStatic<
	TDependencies extends DependenciesBase,
	TKey extends string,
	TValue,
> implements IFixture<TDependencies, TKey, TValue>
{
	/**
	 * Create a new `FixtureImplStatic`.
	 *
	 * @param name Name of the fixture.
	 * @param value The value to use for the fixture.
	 * @param scope Scope the fixture lives at.
	 * @param auto True to always instantiate this fixture.
	 */
	constructor(
		public name: TKey,
		public value: TValue,
		public readonly scope: FixtureScope = "test",
		public readonly auto: boolean = false,
	) {}

	execute(): TValue {
		// Only bother cloning the value if needed.
		if (typeof this.value === "object" && this.value) {
			return structuredClone(this.value);
		}
		return this.value;
	}
}
