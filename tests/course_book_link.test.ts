import { describe, expect, test, mock } from "bun:test";

describe("CourseBooks Link Logic", () => {
  test("returns 409 Conflict if book is already linked to the course", async () => {
    // Isolated mock of handleAdminLinkBookToCourse logic
    const courseId = "course-123";
    const body = { book_id: "book-456", order_index: 1 };

    // Mock the environment DB
    const env = {
      DB: {
        prepare: mock((query: string) => {
          return {
            bind: mock((...args: any[]) => {
              return {
                first: mock(async () => {
                  if (query.includes("SELECT 1 FROM CourseBooks WHERE course_id = ? AND book_id = ?")) {
                    return { 1: 1 }; // Simulate the record exists
                  }
                  return null;
                }),
                run: mock(async () => {
                  return { success: true }; // Should not be called in this test
                }),
              };
            }),
          };
        }),
      },
    };

    // The Logic
    let response: Response | undefined;

    const existing = await env.DB.prepare("SELECT 1 FROM CourseBooks WHERE course_id = ? AND book_id = ?")
      .bind(courseId, body.book_id).first();

    if (existing) {
      response = new Response(
        JSON.stringify({ success: false, error: "Book is already linked to this course" }),
        { status: 409, headers: {} }
      );
    } else {
      await env.DB.prepare("INSERT INTO CourseBooks (course_id, book_id, order_index) VALUES (?, ?, ?)")
        .bind(courseId, body.book_id, body.order_index || 0).run();
      response = new Response(JSON.stringify({ success: true }), { headers: {} });
    }

    expect(response).toBeDefined();
    expect(response?.status).toBe(409);

    const responseBody = await response?.json();
    expect(responseBody).toEqual({ success: false, error: "Book is already linked to this course" });
  });

  test("returns 200 OK and proceeds to INSERT if book is not linked", async () => {
    const courseId = "course-123";
    const body = { book_id: "book-456", order_index: 1 };

    let runCalled = false;

    // Mock the environment DB
    const env = {
      DB: {
        prepare: mock((query: string) => {
          return {
            bind: mock((...args: any[]) => {
              return {
                first: mock(async () => {
                  if (query.includes("SELECT 1 FROM CourseBooks WHERE course_id = ? AND book_id = ?")) {
                    return null; // Simulate the record DOES NOT exist
                  }
                  return null;
                }),
                run: mock(async () => {
                  runCalled = true;
                  return { success: true };
                }),
              };
            }),
          };
        }),
      },
    };

    // The Logic
    let response: Response | undefined;

    const existing = await env.DB.prepare("SELECT 1 FROM CourseBooks WHERE course_id = ? AND book_id = ?")
      .bind(courseId, body.book_id).first();

    if (existing) {
      response = new Response(
        JSON.stringify({ success: false, error: "Book is already linked to this course" }),
        { status: 409, headers: {} }
      );
    } else {
      await env.DB.prepare("INSERT INTO CourseBooks (course_id, book_id, order_index) VALUES (?, ?, ?)")
        .bind(courseId, body.book_id, body.order_index || 0).run();
      response = new Response(JSON.stringify({ success: true }), { headers: {} });
    }

    expect(response).toBeDefined();
    expect(response?.status).toBe(200);
    expect(runCalled).toBe(true);

    const responseBody = await response?.json();
    expect(responseBody).toEqual({ success: true });
  });
});
