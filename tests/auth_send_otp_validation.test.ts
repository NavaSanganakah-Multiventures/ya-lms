import { expect, test, describe } from "bun:test";

// Simulates the validation logic in handleSendOTP
function validateEmail(email: any) {
  if (!email || typeof email !== "string" || email.length > 2048) {
    return { valid: false, error: "Valid Email or Student ID is required" };
  }
  return { valid: true, email: String(email).toLowerCase().trim() };
}

describe("handleSendOTP validation logic", () => {
  test("Valid email passes", () => {
    const res = validateEmail("test@example.com");
    expect(res.valid).toBe(true);
    expect(res.email).toBe("test@example.com");
  });

  test("Valid Student ID passes", () => {
    const res = validateEmail("STU-123");
    expect(res.valid).toBe(true);
    expect(res.email).toBe("stu-123");
  });

  test("Missing email fails", () => {
    const res = validateEmail(undefined);
    expect(res.valid).toBe(false);
  });

  test("Object (nested JSON) fails", () => {
    const res = validateEmail({ "$ne": null });
    expect(res.valid).toBe(false);
  });

  test("Array fails", () => {
    const res = validateEmail(["test@example.com"]);
    expect(res.valid).toBe(false);
  });

  test("Oversized string fails", () => {
    const hugeString = "a".repeat(3000);
    const res = validateEmail(hugeString);
    expect(res.valid).toBe(false);
  });
});
