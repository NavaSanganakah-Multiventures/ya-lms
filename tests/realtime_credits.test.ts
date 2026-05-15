import { describe, test, expect } from "bun:test";

function normalizeNonNegativeInt(value: any, fallback = 0): number {
  const n = parseInt(value);
  return isNaN(n) || n < 0 ? fallback : n;
}

function normalizeGroupClassCreditUnit(value: any): string {
  const unit = String(value || "class");
  return ["class", "minute", "half_hour", "hour"].includes(unit) ? unit : "class";
}

function calculateGroupClassCredits(rate: any, unit: any, attendedMinutes?: any): number {
  const safeRate = normalizeNonNegativeInt(rate);
  if (safeRate <= 0) return 0;
  const safeUnit = normalizeGroupClassCreditUnit(unit);
  if (safeUnit === "class") return safeRate;
  const minutes = Math.max(1, normalizeNonNegativeInt(attendedMinutes, 1));
  if (safeUnit === "minute") return safeRate * minutes;
  if (safeUnit === "half_hour") return safeRate * Math.ceil(minutes / 30);
  return safeRate * Math.ceil(minutes / 60);
}

describe("Real-time Credit Calculation Logic", () => {
  test("minute unit", () => {
    expect(calculateGroupClassCredits(5, "minute", 1)).toBe(5);
    expect(calculateGroupClassCredits(5, "minute", 10)).toBe(50);
  });

  test("class unit", () => {
    expect(calculateGroupClassCredits(10, "class", 120)).toBe(10);
  });

  test("half_hour unit", () => {
    expect(calculateGroupClassCredits(10, "half_hour", 15)).toBe(10);
    expect(calculateGroupClassCredits(10, "half_hour", 45)).toBe(20);
  });
});
