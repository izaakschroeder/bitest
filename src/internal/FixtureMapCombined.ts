import type { FixtureOpaque, FixtureScope, IFixtureMap } from "./types";

/**
 * A fixture map that represents the union of two fixture maps. The
 * first provided fixture map is given higher priority.
 *
 * See: {@link IFixtureMap}
 */
export class FixtureMapCombined implements IFixtureMap {
	#left: IFixtureMap;
	#right: IFixtureMap;

	static from(left: IFixtureMap, right: IFixtureMap): IFixtureMap {
		if (right.empty()) {
			return left;
		}
		if (left.empty()) {
			return right;
		}
		return new FixtureMapCombined(left, right);
	}

	/**
	 * Create a new `FixtureMapCombined`.
	 *
	 * @param left The fixture map to try first (higher priority).
	 * @param right  The fixture map to try second (fallback).
	 */
	constructor(left: IFixtureMap, right: IFixtureMap) {
		this.#left = left;
		this.#right = right;
	}

	get(name: string): FixtureOpaque | undefined {
		return this.#left.get(name) ?? this.#right.get(name);
	}

	has(name: string): boolean {
		return this.#left.has(name) || this.#right.has(name);
	}

	auto(scope: FixtureScope): string[] {
		const prev = this.#right
			.auto(scope)
			.filter((entry) => !this.#left.has(entry));
		return [...this.#left.auto(scope), ...prev];
	}

	empty(): boolean {
		return this.#left.empty() && this.#right.empty();
	}

	keys(): string[] {
		return [...this.#left.keys(), ...this.#right.keys()].filter(
			(x, i, a) => a.indexOf(x) === i,
		);
	}
}
