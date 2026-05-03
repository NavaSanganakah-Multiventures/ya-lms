import re
with open('schema.sql', 'r') as f:
    content = f.read()

content = content.replace("CREATE TABLE IF NOT EXISTS Lessons (\n    id TEXT PRIMARY KEY,\n    course_id TEXT NOT NULL,\n    chapter_title TEXT DEFAULT 'General',\n    title TEXT NOT NULL,\n    type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image')) NOT NULL,\n    content_url TEXT, -- R2 Object Key or URL\n    order_index INTEGER NOT NULL,\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE\n);",
"CREATE TABLE IF NOT EXISTS Lessons (\n    id TEXT PRIMARY KEY,\n    course_id TEXT NOT NULL,\n    batch_id TEXT,\n    chapter_title TEXT DEFAULT 'General',\n    title TEXT NOT NULL,\n    type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording')) NOT NULL,\n    content_url TEXT, -- R2 Object Key or URL\n    order_index INTEGER NOT NULL,\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n    text_content TEXT,\n    is_free INTEGER DEFAULT 0,\n    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,\n    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL\n);")

with open('schema.sql', 'w') as f:
    f.write(content)
