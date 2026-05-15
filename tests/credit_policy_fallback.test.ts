import { describe, test, expect } from "bun:test";

// Mocking policy retrieval logic
function getMockPolicy(session: any, fallbackBatch: any) {
  if (session.batch_id && session.group_class_credit_cost !== null) {
    return {
      ...session,
      self_study_group_enabled: session.self_study_group_enabled ?? 1,
      group_class_credit_cost: session.group_class_credit_cost ?? 0,
      group_class_credit_unit: session.group_class_credit_unit ?? 'class',
      credit_deduction_timing: session.credit_deduction_timing ?? 'on_join'
    };
  }

  return {
    ...session,
    self_study_group_enabled: fallbackBatch?.self_study_group_enabled ?? session.self_study_group_enabled ?? 1,
    group_class_credit_cost: fallbackBatch?.group_class_credit_cost ?? session.group_class_credit_cost ?? 0,
    group_class_credit_unit: fallbackBatch?.group_class_credit_unit ?? session.group_class_credit_unit ?? 'class',
    credit_deduction_timing: fallbackBatch?.credit_deduction_timing ?? session.credit_deduction_timing ?? 'on_join'
  };
}

describe("Credit Policy Fallback Logic", () => {
  test("uses batch policy if available", () => {
    const session = { batch_id: "B1", group_class_credit_cost: 10, self_study_group_enabled: 1 };
    const policy = getMockPolicy(session, null);
    expect(policy.group_class_credit_cost).toBe(10);
    expect(policy.group_class_credit_unit).toBe('class');
  });

  test("uses fallback batch if session has no batch or policy", () => {
    const session = { batch_id: null, group_class_credit_cost: null, self_study_group_enabled: 1 };
    const fallbackBatch = { group_class_credit_cost: 5, group_class_credit_unit: 'minute', credit_deduction_timing: 'minute' };
    const policy = getMockPolicy(session, fallbackBatch);
    expect(policy.group_class_credit_cost).toBe(5);
    expect(policy.group_class_credit_unit).toBe('minute');
    expect(policy.credit_deduction_timing).toBe('minute');
  });
});
