import { describe, expect, test } from "@jest/globals";
import { cn } from "../lib/utils";

describe("cn utility", () => {
  test("merges standard classes", () => {
    expect(cn("px-2", "py-2")).toBe("px-2 py-2");
  });

  test("handles conditional classes", () => {
    expect(cn("px-2", true && "py-2", false && "hidden")).toBe("px-2 py-2");
  });

  test("handles objects", () => {
    expect(cn({ "bg-red-500": true, "text-white": false })).toBe("bg-red-500");
  });

  test("handles arrays", () => {
    expect(cn(["px-2", "py-2"])).toBe("px-2 py-2");
  });

  test("handles nested arrays and objects", () => {
    expect(cn("base", ["arr1", { obj1: true, obj2: false }], { obj3: true })).toBe("base arr1 obj1 obj3");
  });

  test("handles null, undefined, and boolean values gracefully", () => {
    expect(cn("px-2", null, undefined, true, false, "py-2")).toBe("px-2 py-2");
  });

  test("resolves tailwind conflicts (tailwind-merge)", () => {
    // Verifies that tailwind-merge correctly resolves conflicts by keeping the last class
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("px-2 py-2", "p-4")).toBe("p-4"); // p-4 supersedes px/py shorthands
  });
});
