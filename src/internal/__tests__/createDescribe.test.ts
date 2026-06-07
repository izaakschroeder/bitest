import { describe as base, expect, test } from "bun:test";
import { createDescribe } from "../createDescribe";

const describe = createDescribe(base);

let topLevelRan = false;
describe("outer group", () => {
	topLevelRan = true;
});

let nestedRan = false;
describe("outer with inner", () => {
	describe("inner", () => {
		nestedRan = true;
	});
});

let skipBodyRan = false;
describe.skip("skipped group", () => {
	test("skipped test", () => {
		skipBodyRan = true;
	});
});

let todoBodyRan = false;
describe.todo("todo group", () => {
	test("todo test", () => {
		todoBodyRan = true;
	});
});

let ifTrueBodyRan = false;
describe.if(true)("if(true) group", () => {
	ifTrueBodyRan = true;
});

let ifFalseBodyRan = false;
describe.if(false)("if(false) group", () => {
	test("if(false) test", () => {
		ifFalseBodyRan = true;
	});
});

let skipIfTrueBodyRan = false;
describe.skipIf(true)("skipIf(true) group", () => {
	test("skipIf(true) test", () => {
		skipIfTrueBodyRan = true;
	});
});

let skipIfFalseBodyRan = false;
describe.skipIf(false)("skipIf(false) group", () => {
	skipIfFalseBodyRan = true;
});

let todoIfTrueBodyRan = false;
describe.todoIf(true)("todoIf(true) group", () => {
	test("todoIf(true) test", () => {
		todoIfTrueBodyRan = true;
	});
});

let todoIfFalseBodyRan = false;
describe.todoIf(false)("todoIf(false) group", () => {
	todoIfFalseBodyRan = true;
});

let concurrentBodyRan = false;
describe.concurrent("concurrent group", () => {
	concurrentBodyRan = true;
});

let serialBodyRan = false;
describe.serial("serial group", () => {
	serialBodyRan = true;
});

const eachCalls: number[] = [];
describe.each([1, 2, 3])("each row %i", (i) => {
	eachCalls.push(i);
});

base("createDescribe wrapping", () => {
	test("top-level describe body runs", () => {
		expect(topLevelRan).toBe(true);
	});

	test("nested describe bodies run", () => {
		expect(nestedRan).toBe(true);
	});

	test("describe.skip never invokes the body", () => {
		expect(skipBodyRan).toBe(false);
	});

	test("describe.todo never invokes the body", () => {
		expect(todoBodyRan).toBe(false);
	});

	test("describe.if(true) runs the body", () => {
		expect(ifTrueBodyRan).toBe(true);
	});

	test("describe.if(false) does not run the body", () => {
		expect(ifFalseBodyRan).toBe(false);
	});

	test("describe.skipIf(true) does not run the body", () => {
		expect(skipIfTrueBodyRan).toBe(false);
	});

	test("describe.skipIf(false) runs the body", () => {
		expect(skipIfFalseBodyRan).toBe(true);
	});

	test("describe.todoIf(true) does not run the body", () => {
		expect(todoIfTrueBodyRan).toBe(false);
	});

	test("describe.todoIf(false) runs the body", () => {
		expect(todoIfFalseBodyRan).toBe(true);
	});

	test("describe.concurrent still runs the body", () => {
		expect(concurrentBodyRan).toBe(true);
	});

	test("describe.serial still runs the body", () => {
		expect(serialBodyRan).toBe(true);
	});

	test("describe.each runs once per row", () => {
		expect(eachCalls).toEqual([1, 2, 3]);
	});
});

base("createDescribe property access", () => {
	test("returns existing properties on the proxy target", () => {
		// `name` and `length` are inherent function properties.
		expect(typeof describe.name).toBe("string");
		expect(typeof describe.length).toBe("number");
	});

	test("lifted methods are functions", () => {
		expect(typeof describe.only).toBe("function");
		expect(typeof describe.skip).toBe("function");
		expect(typeof describe.todo).toBe("function");
		expect(typeof describe.concurrent).toBe("function");
		expect(typeof describe.serial).toBe("function");
		expect(typeof describe.if).toBe("function");
		expect(typeof describe.skipIf).toBe("function");
		expect(typeof describe.todoIf).toBe("function");
		expect(typeof describe.each).toBe("function");
	});
});
