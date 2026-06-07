import type { FixtureOpaque, FixtureScope, IFixtureMap } from "./types";

/**
 * Base implementation for a generic fixture map that stores fixtures.
 *
 * See: {@link IFixtureMap}
 */
export class FixtureMap implements IFixtureMap {
	#map = new Map<string, FixtureOpaque>();
	#parent: IFixtureMap | undefined;

	/**
	 * Create a new `FixtureMap`.
	 *
	 * @param init Fixtures to add to the map.
	 * @param parent Another `IFixtureMap` to fall back to if a requested
	 * fixture cannot be found in this map.
	 */
	constructor(
		init?: readonly FixtureOpaque[],
		parent?: IFixtureMap | undefined,
	) {
		this.#parent = parent;
		if (init) {
			for (const fixture of init) {
				this.add(fixture);
			}
		}
	}

	add(fixture: FixtureOpaque): void {
		this.#map.set(fixture.name, fixture);
	}

	get(name: string): FixtureOpaque | undefined {
		return this.#map.get(name) ?? this.#parent?.get(name);
	}

	has(name: string): boolean {
		return this.#map.has(name) || !!this.#parent?.has(name);
	}

	auto(scope: FixtureScope): string[] {
		const out = [];
		for (const [key, value] of this.#map.entries()) {
			if (value.auto && value.scope === scope) {
				out.push(key);
			}
		}
		if (this.#parent) {
			const parentAuto = this.#parent.auto(scope);
			return [...parentAuto.filter((entry) => !this.has(entry)), ...out];
		}
		return out;
	}

	keys(): string[] {
		const ownKeys = this.#map.keys();
		if (!this.#parent) {
			return [...ownKeys];
		}
		const parentKeys = this.#parent.keys();
		return [...ownKeys, ...parentKeys].filter((x, i, a) => a.indexOf(x) === i);
	}

	empty(): boolean {
		return this.#map.size === 0 && (!this.#parent || !!this.#parent?.empty());
	}

	/**
	 * Returns a string representation of the fixture map, showing
	 * own keys and parent keys separated by `|`.
	 */
	toString(): string {
		const base = [...this.#map.keys()].join(", ");
		return `${base} | ${this.#parent?.toString()}`;
	}
}
