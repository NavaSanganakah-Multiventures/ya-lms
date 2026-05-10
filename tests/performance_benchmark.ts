
const mockDB = {
  pool: [
    { plan_id: "plan_1", item_type: "course", item_id: "course_1" },
    { plan_id: "plan_1", item_type: "course", item_id: "course_2" },
    { plan_id: "plan_1", item_type: "course", item_id: "course_3" },
  ],
  prepare: function(query: string) {
    const self = this;
    return {
      bind: function(...args: any[]) {
        return {
          first: async function() {
            if (query.includes("PlanContentPool")) {
              const planId = args[0];
              const itemId = args[1];
              return self.pool.find(p => p.plan_id === planId && p.item_id === itemId) || null;
            }
            return null;
          },
          all: async function() {
            if (query.includes("PlanContentPool")) {
                // Simplified IN clause simulation
                const planId = args[0];
                // We assume args[1], args[2]... are the course IDs
                const itemIds = args.slice(1);
                const results = self.pool.filter(p => p.plan_id === planId && itemIds.includes(p.item_id));
                return { results };
            }
            return { results: [] };
          }
        };
      }
    };
  }
};

async function currentImplementation(planId: string, selectedCourseIds: string[]) {
    const start = performance.now();
    for (const cId of selectedCourseIds) {
        const inPool: any = await mockDB.prepare(
          `SELECT id FROM PlanContentPool WHERE plan_id = ? AND item_type = 'course' AND item_id = ?`,
        )
          .bind(planId, cId)
          .first();
        if (!inPool) {
            return { error: `Course ${cId} is not in pool`, time: performance.now() - start };
        }
    }
    return { success: true, time: performance.now() - start };
}

async function optimizedImplementation(planId: string, selectedCourseIds: string[]) {
    const start = performance.now();
    if (selectedCourseIds.length > 0) {
        const placeholders = selectedCourseIds.map(() => "?").join(",");
        const inPoolResults: any = await mockDB.prepare(
            `SELECT item_id FROM PlanContentPool WHERE plan_id = ? AND item_type = 'course' AND item_id IN (${placeholders})`,
        )
            .bind(planId, ...selectedCourseIds)
            .all();

        const foundCourseIds = new Set(inPoolResults.results.map((r: any) => r.item_id));
        for (const cId of selectedCourseIds) {
            if (!foundCourseIds.has(cId)) {
                return { error: `Course ${cId} is not in pool`, time: performance.now() - start };
            }
        }
    }
    return { success: true, time: performance.now() - start };
}

async function runBenchmark() {
    const planId = "plan_1";
    const selectedCourseIds = ["course_1", "course_2", "course_3"];

    console.log("--- Performance Benchmark (Simulated) ---");

    // Warmup
    await currentImplementation(planId, selectedCourseIds);
    await optimizedImplementation(planId, selectedCourseIds);

    let totalTimeCurrent = 0;
    const iterations = 1000;
    for(let i=0; i<iterations; i++) {
        const res = await currentImplementation(planId, selectedCourseIds);
        totalTimeCurrent += res.time;
    }
    console.log(`Current Implementation (Average over ${iterations} iterations): ${totalTimeCurrent / iterations}ms`);

    let totalTimeOptimized = 0;
    for(let i=0; i<iterations; i++) {
        const res = await optimizedImplementation(planId, selectedCourseIds);
        totalTimeOptimized += res.time;
    }
    console.log(`Optimized Implementation (Average over ${iterations} iterations): ${totalTimeOptimized / iterations}ms`);

    const improvement = ((totalTimeCurrent - totalTimeOptimized) / totalTimeCurrent) * 100;
    console.log(`Improvement: ${improvement.toFixed(2)}%`);
}

runBenchmark();
export {};
