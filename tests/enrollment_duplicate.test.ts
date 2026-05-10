// Simulate DB prepare and unique constraint
const mockDB = {
  data: new Set<string>(),
  prepare: function(query: string) {
    return {
      bind: function(...args: any[]) {
        return {
          run: async function() {
            const key = args[1] + "_" + args[2]; // user_id_course_id
            if (mockDB.data.has(key)) {
              throw new Error("UNIQUE constraint failed: Enrollments.user_id, Enrollments.course_id");
            }
            mockDB.data.add(key);
            return { success: true };
          }
        };
      }
    };
  }
};

async function simulateEnroll(userId: string, courseId: string) {
  const enrollmentId = "YA-ENR-TEST";
  try {
    await mockDB.prepare(
      "INSERT INTO Enrollments (id, user_id, course_id, payment_status, status) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(enrollmentId, userId, courseId, "unpaid", "active")
      .run();
    console.log(`>> SUCCESS: User ${userId} enrolled in ${courseId} ✅`);
    return { status: 200 };
  } catch (e: any) {
    if (e.message.includes("UNIQUE constraint failed")) {
      console.log(`>> SKIP: Duplicate enrollment blocked for User ${userId} in ${courseId} ❌`);
      return { status: 409, error: "Already enrolled" };
    }
    throw e;
  }
}

async function runTests() {
  console.log("Test Case 1: First time enrolling");
  let res1 = await simulateEnroll("user_1", "course_1");

  console.log("\nTest Case 2: Simulating race condition / duplicate enroll");
  let res2 = await simulateEnroll("user_1", "course_1");

  if (res1.status === 200 && res2.status === 409) {
    console.log("\n✅ All enrollment logic tests passed!");
  } else {
    console.log("\n❌ Logic tests failed!");
  }
}

runTests();
export {};
