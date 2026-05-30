import { expect, test, describe } from "bun:test";
import { Database } from "bun:sqlite";

describe("Notification Endpoint Subscription", () => {
  test("handles endpoint exact match without LIKE pattern complexity issues", () => {
    const db = new Database();
    db.run("CREATE TABLE PushSubscriptions (id TEXT, user_id TEXT, endpoint TEXT, subscription_json TEXT)");
    db.run("INSERT INTO PushSubscriptions (id, user_id, endpoint, subscription_json) VALUES ('sub_1', 'user_1', 'https://someurl.com/a?b=%20%20%20', '{\"endpoint\": \"https://someurl.com/a?b=%20%20%20\"}')");

    const endpoint = "https://someurl.com/a?b=%20%20%20" + "%".repeat(2048);
    let result: any[] = [];
    expect(() => {
        result = db.prepare("SELECT id FROM PushSubscriptions WHERE user_id = ? AND endpoint = ?").all('user_1', endpoint) as any[];
    }).not.toThrow();
    expect(result.length).toBe(0);
  });

  test("correctly matches legitimate endpoint with exact match", () => {
    const db = new Database();
    db.run("CREATE TABLE PushSubscriptions (id TEXT, user_id TEXT, endpoint TEXT, subscription_json TEXT)");

    const realEndpoint = "https://someurl.com/a?b=%20%20%20";
    db.run(`INSERT INTO PushSubscriptions (id, user_id, endpoint, subscription_json) VALUES ('sub_1', 'user_1', '${realEndpoint}', '{"endpoint": "${realEndpoint}"}')`);

    const result = db.prepare("SELECT id FROM PushSubscriptions WHERE user_id = ? AND endpoint = ?").all('user_1', realEndpoint) as any[];

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('sub_1');
  });
});
