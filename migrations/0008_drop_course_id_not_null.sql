-- Migration: Drop NOT NULL constraint on course_id in Lessons table

-- 1. Disable foreign keys temporarily
PRAGMA foreign_keys=OFF;

-- 2. Create the new table without NOT NULL on course_id
CREATE TABLE IF NOT EXISTS Lessons_new (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    book_id TEXT,
    batch_id TEXT,
    chapter_title TEXT DEFAULT 'General',
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording')) NOT NULL,
    content_url TEXT,
    recording_url TEXT,
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    text_content TEXT,
    is_free INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'pending',
    processing_error TEXT,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL
);

-- 3. Copy data from old table to new table (handle old columns)
INSERT INTO Lessons_new (
    id, course_id, book_id, batch_id, chapter_title, title, type, content_url, recording_url, order_index, created_at, text_content, is_free, processing_status, processing_error
)
SELECT 
    id, 
    -- If course_id was stored as empty string by our recent bug workaround, turn it back to NULL so it doesn't break FK
    CASE WHEN course_id = '' THEN NULL ELSE course_id END, 
    book_id, batch_id, chapter_title, title, type, content_url, recording_url, order_index, created_at, text_content, is_free, processing_status, processing_error
FROM Lessons;

-- 4. Drop the old table
DROP TABLE Lessons;

-- 5. Rename new table to old table
ALTER TABLE Lessons_new RENAME TO Lessons;

-- 6. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_lessons_processing_status ON Lessons(processing_status);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON Lessons(course_id);

-- 7. Re-enable foreign keys
PRAGMA foreign_keys=ON;
