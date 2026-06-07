import { describe as base, type Describe } from "bun:test";
import { createDescribe } from "./internal";

/**
 * Describes a group of related tests.
 *
 * See: {@link https://bun.com/docs/test}
 *
 * @example
 * function sum(a, b) {
 *   return a + b;
 * }
 * describe("sum()", () => {
 *   test("can sum two values", () => {
 *     expect(sum(1, 1)).toBe(2);
 *   });
 * });
 *
 * @param label the label for the tests
 * @param fn the function that defines the tests
 */
export const describe: Describe<readonly unknown[]> = createDescribe(base);
