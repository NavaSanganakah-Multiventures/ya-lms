import re
with open('src/index.ts', 'r') as f:
    content = f.read()

content = content.replace("CREATE TABLE IF NOT EXISTS Lessons (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, chapter_title TEXT DEFAULT 'General', title TEXT NOT NULL, type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording')) NOT NULL, content_url TEXT, order_index INTEGER NOT NULL, is_free INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, text_content TEXT, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);",
"CREATE TABLE IF NOT EXISTS Lessons (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, batch_id TEXT, chapter_title TEXT DEFAULT 'General', title TEXT NOT NULL, type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording')) NOT NULL, content_url TEXT, order_index INTEGER NOT NULL, is_free INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, text_content TEXT, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE, FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL);")

content = content.replace("await env.DB.prepare(`ALTER TABLE Lessons ADD COLUMN is_free INTEGER DEFAULT 0;`).run();\n    } catch (e) { /* Column already exists, safe to ignore */ }",
"await env.DB.prepare(`ALTER TABLE Lessons ADD COLUMN is_free INTEGER DEFAULT 0;`).run();\n    } catch (e) { /* Column already exists, safe to ignore */ }\n\n    // Attempt to add batch_id to Lessons\n    try {\n      await env.DB.prepare(`ALTER TABLE Lessons ADD COLUMN batch_id TEXT REFERENCES Batches(id) ON DELETE SET NULL;`).run();\n    } catch (e) { /* Column already exists, safe to ignore */ }")

with open('src/index.ts', 'w') as f:
    f.write(content)
