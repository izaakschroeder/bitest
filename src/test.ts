import { test as base } from "bun:test";
import { createTest } from "./internal";
import type {
	DependenciesBase,
	TestCasesBase,
	Test as TestT,
} from "./internal/types";

/**
 * Runs a test.
 *
 * See: {@link https://bun.com/docs/test}
 *
 * @example
 * test("can check if Bun is defined", () => {
 *   expect(Bun).toBeDefined();
 * });
 *
 * test("can make a fetch() request", async () => {
 *   const response = await fetch("https://example.com/");
 *   expect(response.ok).toBe(true);
 * });
 *
 * @param label the label for the test
 * @param fn the test function
 */
export const test: TestT<DependenciesBase, TestCasesBase> = createTest(base);

/**
 * Same as `test.skip`
 */
export const xtest: TestT<DependenciesBase, TestCasesBase> = test.skip;

/**
 * Alias for {@link test}
 */
export const it: TestT<DependenciesBase, TestCasesBase> = test;

/**
 * Alias for {@link xtest}
 */
export const xit: TestT<DependenciesBase, TestCasesBase> = xtest;
