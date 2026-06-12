/**
 * Tests for db-migrate.ts
 * Tests checkMigrations, runAutoMigration, and exportDatabaseToJson
 * using a mock D1Database.
 */
import { expect, test, describe, beforeEach, mock } from "bun:test";

// Mock schema.sql before importing db-migrate
// This provides controlled SQL statements for testing
const mockSchemaSql = `
CREATE TABLE IF NOT EXISTS Users (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS Batches (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  name TEXT NOT NULL,
  status TEXT CHECK(status IN ('upcoming', 'ongoing', 'completed')) DEFAULT 'upcoming'
);
`;

// Provide the schema mock via module mock
mock.module("../schema.sql", () => mockSchemaSql);

// Import after mock is set up
const { checkMigrations, runAutoMigration, exportDatabaseToJson } = await import("../db-migrate");

// Helper to build a mock D1Database
function makeMockDb(overrides: Partial<{
  pragmaResults: Record<string, any[]>;
  masterResults: any[];
  tableDataResults: Record<string, any[]>;
}> = {}) {
  const pragmaResults = overrides.pragmaResults ?? {};
  const masterResults = overrides.masterResults ?? [];
  const tableDataResults = overrides.tableDataResults ?? {};

  const preparedStatements: Map<string, any> = new Map();

  const prepare = (sql: string) => {
    const stmt = {
      sql,
      all: async () => {
        // PRAGMA table_info
        const pragmaMatch = sql.match(/PRAGMA table_info\((\w+)\)/i);
        if (pragmaMatch) {
          const tableName = pragmaMatch[1];
          const results = pragmaResults[tableName] ?? null;
          return { results };
        }
        // sqlite_master query
        if (sql.includes("sqlite_master")) {
          return { results: masterResults };
        }
        // SELECT * FROM <table>
        const selectMatch = sql.match(/SELECT \* FROM (\w+)/i);
        if (selectMatch) {
          const tableName = selectMatch[1];
          return { results: tableDataResults[tableName] ?? [] };
        }
        return { results: [] };
      },
      run: mock(async () => ({ success: true })),
    };
    return stmt;
  };

  return { prepare } as unknown as import("@cloudflare/workers-types").D1Database;
}

// ─────────────────────────────────────────────────────────────
// checkMigrations
// ─────────────────────────────────────────────────────────────

describe("checkMigrations", () => {
  test("detects tables that are completely missing (PRAGMA returns no rows)", async () => {
    const db = makeMockDb({
      // No results for any table → all tables are missing
      pragmaResults: {
        Users: null as any,
        Categories: null as any,
        Batches: null as any,
      },
    });

    const { missingTables, missingColumns } = await checkMigrations(db);

    expect(missingTables.length).toBe(3);
    expect(missingColumns.length).toBe(0);
    expect(missingTables.some((s) => s.includes("Users"))).toBe(true);
    expect(missingTables.some((s) => s.includes("Categories"))).toBe(true);
    expect(missingTables.some((s) => s.includes("Batches"))).toBe(true);
  });

  test("detects tables that return empty results array (PRAGMA returns [])", async () => {
    const db = makeMockDb({
      pragmaResults: {
        Users: [],
        Categories: [],
        Batches: [],
      },
    });

    const { missingTables, missingColumns } = await checkMigrations(db);

    expect(missingTables.length).toBe(3);
    expect(missingColumns.length).toBe(0);
  });

  test("returns no missing tables when all tables exist with all columns", async () => {
    const db = makeMockDb({
      pragmaResults: {
        Users: [
          { name: "id" },
          { name: "full_name" },
          { name: "email" },
        ],
        Categories: [
          { name: "id" },
          { name: "name" },
          { name: "description" },
        ],
        Batches: [
          { name: "id" },
          { name: "course_id" },
          { name: "name" },
          { name: "status" },
        ],
      },
    });

    const { missingTables, missingColumns } = await checkMigrations(db);

    expect(missingTables.length).toBe(0);
    expect(missingColumns.length).toBe(0);
  });

  test("detects missing columns when table exists but is missing columns", async () => {
    const db = makeMockDb({
      pragmaResults: {
        // Users table exists but is missing 'email' and 'full_name'
        Users: [{ name: "id" }],
        Categories: [
          { name: "id" },
          { name: "name" },
          { name: "description" },
        ],
        Batches: [
          { name: "id" },
          { name: "course_id" },
          { name: "name" },
          { name: "status" },
        ],
      },
    });

    const { missingTables, missingColumns } = await checkMigrations(db);

    expect(missingTables.length).toBe(0);
    expect(missingColumns.length).toBeGreaterThan(0);
    expect(missingColumns.some((s) => s.includes("ALTER TABLE Users"))).toBe(true);
    expect(missingColumns.some((s) => s.includes("email"))).toBe(true);
    expect(missingColumns.some((s) => s.includes("full_name"))).toBe(true);
  });

  test("ALTER TABLE statements have correct format", async () => {
    const db = makeMockDb({
      pragmaResults: {
        Users: [{ name: "id" }],
        Categories: [
          { name: "id" },
          { name: "name" },
          { name: "description" },
        ],
        Batches: [
          { name: "id" },
          { name: "course_id" },
          { name: "name" },
          { name: "status" },
        ],
      },
    });

    const { missingColumns } = await checkMigrations(db);

    for (const col of missingColumns) {
      expect(col).toMatch(/^ALTER TABLE \w+ ADD COLUMN .+/);
    }
  });

  test("skips FOREIGN KEY, PRIMARY KEY, UNIQUE, and CHECK constraint lines", async () => {
    // Batches has a CHECK constraint in schema - should not be treated as a column
    const db = makeMockDb({
      pragmaResults: {
        Users: [
          { name: "id" },
          { name: "full_name" },
          { name: "email" },
        ],
        Categories: [
          { name: "id" },
          { name: "name" },
          { name: "description" },
        ],
        Batches: [
          { name: "id" },
          { name: "course_id" },
          { name: "name" },
          { name: "status" },
        ],
      },
    });

    const { missingColumns } = await checkMigrations(db);

    // Should not produce ALTER TABLE for FOREIGN, PRIMARY, UNIQUE, CHECK tokens
    for (const col of missingColumns) {
      expect(col).not.toMatch(/ALTER TABLE \w+ ADD COLUMN FOREIGN/i);
      expect(col).not.toMatch(/ALTER TABLE \w+ ADD COLUMN PRIMARY/i);
      expect(col).not.toMatch(/ALTER TABLE \w+ ADD COLUMN UNIQUE/i);
      expect(col).not.toMatch(/ALTER TABLE \w+ ADD COLUMN CHECK/i);
    }
  });

  test("handles mix: some tables missing, some with missing columns", async () => {
    const db = makeMockDb({
      pragmaResults: {
        // Users: table completely missing
        Users: [],
        // Categories: exists but missing 'description'
        Categories: [{ name: "id" }, { name: "name" }],
        // Batches: fully in sync
        Batches: [
          { name: "id" },
          { name: "course_id" },
          { name: "name" },
          { name: "status" },
        ],
      },
    });

    const { missingTables, missingColumns } = await checkMigrations(db);

    expect(missingTables.length).toBe(1);
    expect(missingTables[0]).toContain("Users");
    expect(missingColumns.length).toBeGreaterThan(0);
    expect(missingColumns.some((c) => c.includes("Categories") && c.includes("description"))).toBe(true);
  });

  test("column name comparison is case-insensitive", async () => {
    const db = makeMockDb({
      pragmaResults: {
        // Column names returned with different casing by PRAGMA
        Users: [
          { name: "ID" },       // uppercase variant
          { name: "Full_Name" },
          { name: "EMAIL" },
        ],
        Categories: [
          { name: "ID" },
          { name: "Name" },
          { name: "Description" },
        ],
        Batches: [
          { name: "ID" },
          { name: "Course_Id" },
          { name: "Name" },
          { name: "Status" },
        ],
      },
    });

    const { missingTables, missingColumns } = await checkMigrations(db);

    // All columns should be considered present despite casing differences
    expect(missingTables.length).toBe(0);
    expect(missingColumns.length).toBe(0);
  });

  test("continues gracefully when PRAGMA throws an error", async () => {
    let callCount = 0;
    const db = {
      prepare: (sql: string) => ({
        all: async () => {
          const pragmaMatch = sql.match(/PRAGMA table_info\((\w+)\)/i);
          if (pragmaMatch) {
            callCount++;
            if (callCount === 1) {
              // First table throws
              throw new Error("DB error");
            }
            // Subsequent calls succeed
            return { results: [{ name: "id" }, { name: "full_name" }, { name: "email" }] };
          }
          return { results: [] };
        },
        run: mock(async () => ({})),
      }),
    } as unknown as import("@cloudflare/workers-types").D1Database;

    // Should not throw, just logs the error and continues
    const result = await checkMigrations(db);
    expect(result).toBeDefined();
    expect(Array.isArray(result.missingTables)).toBe(true);
    expect(Array.isArray(result.missingColumns)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// runAutoMigration
// ─────────────────────────────────────────────────────────────

describe("runAutoMigration", () => {
  test("calls prepare().run() for each missing table", async () => {
    const runCalls: string[] = [];
    const db = {
      prepare: (sql: string) => ({
        all: async () => {
          const pragmaMatch = sql.match(/PRAGMA table_info\((\w+)\)/i);
          if (pragmaMatch) {
            // All tables missing
            return { results: [] };
          }
          return { results: [] };
        },
        run: async () => {
          runCalls.push(sql);
          return { success: true };
        },
      }),
    } as unknown as import("@cloudflare/workers-types").D1Database;

    await runAutoMigration(db);

    // Should have called run() for each missing table (3 in mockSchemaSql)
    expect(runCalls.length).toBe(3);
  });

  test("calls prepare().run() for each missing column", async () => {
    const runCalls: string[] = [];
    const db = {
      prepare: (sql: string) => ({
        all: async () => {
          const pragmaMatch = sql.match(/PRAGMA table_info\((\w+)\)/i);
          if (pragmaMatch) {
            // All tables exist but each only has 'id' column
            return { results: [{ name: "id" }] };
          }
          return { results: [] };
        },
        run: async () => {
          runCalls.push(sql);
          return { success: true };
        },
      }),
    } as unknown as import("@cloudflare/workers-types").D1Database;

    await runAutoMigration(db);

    // Should have ALTER TABLE calls for missing columns
    expect(runCalls.some((s) => s.startsWith("ALTER TABLE"))).toBe(true);
  });

  test("does not call prepare().run() when schema is up to date", async () => {
    const runCalls: string[] = [];
    const db = {
      prepare: (sql: string) => ({
        all: async () => {
          const pragmaMatch = sql.match(/PRAGMA table_info\((\w+)\)/i);
          if (pragmaMatch) {
            const tableName = pragmaMatch[1];
            const colMap: Record<string, any[]> = {
              Users: [{ name: "id" }, { name: "full_name" }, { name: "email" }],
              Categories: [{ name: "id" }, { name: "name" }, { name: "description" }],
              Batches: [{ name: "id" }, { name: "course_id" }, { name: "name" }, { name: "status" }],
            };
            return { results: colMap[tableName] ?? [] };
          }
          return { results: [] };
        },
        run: async () => {
          runCalls.push(sql);
          return { success: true };
        },
      }),
    } as unknown as import("@cloudflare/workers-types").D1Database;

    await runAutoMigration(db);

    expect(runCalls.length).toBe(0);
  });

  test("continues running remaining migrations if one table creation fails", async () => {
    const runCalls: string[] = [];
    let runCallCount = 0;
    const db = {
      prepare: (sql: string) => ({
        all: async () => {
          const pragmaMatch = sql.match(/PRAGMA table_info\((\w+)\)/i);
          if (pragmaMatch) {
            return { results: [] }; // all tables missing
          }
          return { results: [] };
        },
        run: async () => {
          runCallCount++;
          if (runCallCount === 1) {
            throw new Error("Simulated DB error on first table");
          }
          runCalls.push(sql);
          return { success: true };
        },
      }),
    } as unknown as import("@cloudflare/workers-types").D1Database;

    // Should not throw
    await expect(runAutoMigration(db)).resolves.toBeUndefined();
    // Remaining tables should still be attempted
    expect(runCalls.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// exportDatabaseToJson
// ─────────────────────────────────────────────────────────────

describe("exportDatabaseToJson", () => {
  test("returns valid JSON string", async () => {
    const db = makeMockDb({
      masterResults: [{ name: "Users" }, { name: "Categories" }],
      tableDataResults: {
        Users: [{ id: "1", name: "Alice" }],
        Categories: [{ id: "cat1", name: "Math" }],
      },
    });

    const result = await exportDatabaseToJson(db);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  test("includes non-excluded tables in the dump", async () => {
    const db = makeMockDb({
      masterResults: [{ name: "Users" }, { name: "Categories" }],
      tableDataResults: {
        Users: [{ id: "1", full_name: "Alice" }],
        Categories: [{ id: "c1", name: "Science" }],
      },
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result).toHaveProperty("Users");
    expect(result).toHaveProperty("Categories");
    expect(result.Users[0].full_name).toBe("Alice");
  });

  test("excludes sqlite_sequence table", async () => {
    const db = makeMockDb({
      masterResults: [{ name: "sqlite_sequence" }, { name: "Users" }],
      tableDataResults: {
        sqlite_sequence: [{ name: "Users", seq: 5 }],
        Users: [{ id: "1" }],
      },
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result).not.toHaveProperty("sqlite_sequence");
    expect(result).toHaveProperty("Users");
  });

  test("excludes _cf_KV table", async () => {
    const db = makeMockDb({
      masterResults: [{ name: "_cf_KV" }, { name: "Users" }],
      tableDataResults: {
        _cf_KV: [{ key: "somekey" }],
        Users: [{ id: "1" }],
      },
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result).not.toHaveProperty("_cf_KV");
  });

  test("excludes ErrorSessions table", async () => {
    const db = makeMockDb({
      masterResults: [{ name: "ErrorSessions" }, { name: "Categories" }],
      tableDataResults: {
        ErrorSessions: [{ id: "e1", title: "Error" }],
        Categories: [{ id: "c1", name: "Math" }],
      },
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result).not.toHaveProperty("ErrorSessions");
    expect(result).toHaveProperty("Categories");
  });

  test("excludes ErrorSessionEvents table", async () => {
    const db = makeMockDb({
      masterResults: [{ name: "ErrorSessionEvents" }, { name: "Users" }],
      tableDataResults: {
        ErrorSessionEvents: [{ id: "ev1" }],
        Users: [{ id: "u1" }],
      },
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result).not.toHaveProperty("ErrorSessionEvents");
  });

  test("excludes ChatHistory table", async () => {
    const db = makeMockDb({
      masterResults: [{ name: "ChatHistory" }, { name: "Users" }],
      tableDataResults: {
        ChatHistory: [{ id: "ch1", content: "hello" }],
        Users: [{ id: "u1" }],
      },
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result).not.toHaveProperty("ChatHistory");
  });

  test("excludes all excluded tables simultaneously", async () => {
    const db = makeMockDb({
      masterResults: [
        { name: "sqlite_sequence" },
        { name: "_cf_KV" },
        { name: "ErrorSessions" },
        { name: "ErrorSessionEvents" },
        { name: "ChatHistory" },
        { name: "Users" },
      ],
      tableDataResults: {
        Users: [{ id: "1" }],
      },
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(Object.keys(result)).toEqual(["Users"]);
  });

  test("returns empty object when all tables are excluded", async () => {
    const db = makeMockDb({
      masterResults: [
        { name: "sqlite_sequence" },
        { name: "_cf_KV" },
        { name: "ErrorSessions" },
        { name: "ErrorSessionEvents" },
        { name: "ChatHistory" },
      ],
      tableDataResults: {},
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result).toEqual({});
  });

  test("returns empty object when no tables exist", async () => {
    const db = makeMockDb({
      masterResults: [],
      tableDataResults: {},
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result).toEqual({});
  });

  test("uses empty array when table data query returns no results", async () => {
    const db = makeMockDb({
      masterResults: [{ name: "Categories" }],
      tableDataResults: {
        // Categories has no data
      },
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result.Categories).toEqual([]);
  });

  test("handles tables with multiple rows", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: `Item ${i}` }));
    const db = makeMockDb({
      masterResults: [{ name: "Categories" }],
      tableDataResults: {
        Categories: rows,
      },
    });

    const result = JSON.parse(await exportDatabaseToJson(db));
    expect(result.Categories.length).toBe(10);
  });
});
