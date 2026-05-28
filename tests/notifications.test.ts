import { expect, test, describe } from "bun:test";
import { Database } from "bun:sqlite";

describe("Notification Endpoint Complexity test", () => {
  test("handles extremely complex endpoint strings without D1_ERROR: LIKE or GLOB pattern too complex", () => {
    const db = new Database();
    db.run("CREATE TABLE PushSubscriptions (id TEXT, user_id TEXT, subscription_json TEXT)");
    db.run("INSERT INTO PushSubscriptions (id, user_id, subscription_json) VALUES ('sub_1', 'user_1', '{\"endpoint\": \"https://someurl.com/a?b=%20%20%20\"}')");

    const endpoint = "https://someurl.com/a?b=%20%20%20" + "%".repeat(2048);
    // Mimic the backend fix
    const safeEndpoint = endpoint.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

    // This should NOT throw "LIKE or GLOB pattern too complex" because the wildcards are escaped
    let result: any[] = [];
    expect(() => {
        result = db.prepare("SELECT id FROM PushSubscriptions WHERE user_id = ? AND subscription_json LIKE ? ESCAPE '\\'").all('user_1', `%${safeEndpoint}%`);
    }).not.toThrow();

    // We expect 0 rows since the % are treated literally and our DB row doesn't have 2048 literal %
    expect(result.length).toBe(0);
  });

  test("correctly matches legitimate endpoint with URL encoded characters", () => {
    const db = new Database();
    db.run("CREATE TABLE PushSubscriptions (id TEXT, user_id TEXT, subscription_json TEXT)");

    const realEndpoint = "https://someurl.com/a?b=%20%20%20";
    db.run(`INSERT INTO PushSubscriptions (id, user_id, subscription_json) VALUES ('sub_1', 'user_1', '{"endpoint": "${realEndpoint}"}')`);

    const safeEndpoint = realEndpoint.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

    const result = db.prepare("SELECT id FROM PushSubscriptions WHERE user_id = ? AND subscription_json LIKE ? ESCAPE '\\'").all('user_1', `%${safeEndpoint}%`);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('sub_1');
  });
});
