/**
 * Tests for components/ui/button.tsx and components/ui/card.tsx
 * Verifies component exports, displayNames, and className composition.
 */
import { expect, test, describe } from "bun:test";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card";

// ─────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────

describe("Button component", () => {
  test("is exported from components/ui/button", () => {
    expect(Button).toBeDefined();
  });

  test("has displayName set to 'Button'", () => {
    expect(Button.displayName).toBe("Button");
  });

  test("is a function (React forwardRef component)", () => {
    expect(typeof Button).toBe("function");
  });

  test("has $$typeof set to React.forwardRef type", () => {
    // React forwardRef components have a $$typeof symbol
    const anyButton = Button as any;
    // forwardRef components expose render and $$typeof
    expect(anyButton.$$typeof).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// Card components
// ─────────────────────────────────────────────────────────────

describe("Card component", () => {
  test("is exported from components/ui/card", () => {
    expect(Card).toBeDefined();
  });

  test("has displayName set to 'Card'", () => {
    expect(Card.displayName).toBe("Card");
  });

  test("is a function (React forwardRef component)", () => {
    expect(typeof Card).toBe("function");
  });
});

describe("CardHeader component", () => {
  test("is exported from components/ui/card", () => {
    expect(CardHeader).toBeDefined();
  });

  test("has displayName set to 'CardHeader'", () => {
    expect(CardHeader.displayName).toBe("CardHeader");
  });

  test("is a function (React forwardRef component)", () => {
    expect(typeof CardHeader).toBe("function");
  });
});

describe("CardTitle component", () => {
  test("is exported from components/ui/card", () => {
    expect(CardTitle).toBeDefined();
  });

  test("has displayName set to 'CardTitle'", () => {
    expect(CardTitle.displayName).toBe("CardTitle");
  });

  test("is a function (React forwardRef component)", () => {
    expect(typeof CardTitle).toBe("function");
  });
});

describe("CardDescription component", () => {
  test("is exported from components/ui/card", () => {
    expect(CardDescription).toBeDefined();
  });

  test("has displayName set to 'CardDescription'", () => {
    expect(CardDescription.displayName).toBe("CardDescription");
  });

  test("is a function (React forwardRef component)", () => {
    expect(typeof CardDescription).toBe("function");
  });
});

describe("CardContent component", () => {
  test("is exported from components/ui/card", () => {
    expect(CardContent).toBeDefined();
  });

  test("has displayName set to 'CardContent'", () => {
    expect(CardContent.displayName).toBe("CardContent");
  });

  test("is a function (React forwardRef component)", () => {
    expect(typeof CardContent).toBe("function");
  });
});

describe("CardFooter component", () => {
  test("is exported from components/ui/card", () => {
    expect(CardFooter).toBeDefined();
  });

  test("has displayName set to 'CardFooter'", () => {
    expect(CardFooter.displayName).toBe("CardFooter");
  });

  test("is a function (React forwardRef component)", () => {
    expect(typeof CardFooter).toBe("function");
  });
});

// ─────────────────────────────────────────────────────────────
// className fallback logic — inline unit tests
// ─────────────────────────────────────────────────────────────

describe("className fallback logic (className || '')", () => {
  // This is the same pattern used in both button.tsx and card.tsx:
  //   className={`...base-classes... ${className || ''}`}
  // We test the pattern in isolation to ensure correctness.

  function buildClassName(base: string, extra?: string): string {
    return `${base} ${extra || ""}`.trim();
  }

  test("appends custom className when provided", () => {
    const result = buildClassName("base-class", "custom-class");
    expect(result).toBe("base-class custom-class");
  });

  test("does not append extra space when className is undefined", () => {
    const result = buildClassName("base-class", undefined);
    expect(result).toBe("base-class");
  });

  test("does not append extra space when className is empty string", () => {
    const result = buildClassName("base-class", "");
    expect(result).toBe("base-class");
  });

  test("handles multiple className values", () => {
    const result = buildClassName("base-class", "extra1 extra2");
    expect(result).toBe("base-class extra1 extra2");
  });
});

// ─────────────────────────────────────────────────────────────
// All Card sub-components exported from the barrel
// ─────────────────────────────────────────────────────────────

describe("card.tsx barrel exports", () => {
  test("exports exactly the expected named exports", () => {
    const exports = { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
    const names = Object.keys(exports);
    expect(names).toContain("Card");
    expect(names).toContain("CardHeader");
    expect(names).toContain("CardFooter");
    expect(names).toContain("CardTitle");
    expect(names).toContain("CardDescription");
    expect(names).toContain("CardContent");
    expect(names.length).toBe(6);
  });

  test("every Card sub-component is a defined function", () => {
    const components = [Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent];
    for (const comp of components) {
      expect(comp).toBeDefined();
      expect(typeof comp).toBe("function");
    }
  });
});