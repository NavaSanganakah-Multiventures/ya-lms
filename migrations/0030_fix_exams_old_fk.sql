-- Fix dangling foreign keys to Exams_Old from a previous incomplete migration

-- 1. Fix ExamAttempts table
PRAGMA defer_foreign_keys = ON;

CREATE TABLE ExamAttempts_new (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      score_percent INTEGER NOT NULL DEFAULT 0,
      total_marks INTEGER NOT NULL DEFAULT 0,
      passed INTEGER DEFAULT 0,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

INSERT INTO ExamAttempts_new SELECT * FROM ExamAttempts;
DROP TABLE ExamAttempts;
ALTER TABLE ExamAttempts_new RENAME TO ExamAttempts;
CREATE INDEX IF NOT EXISTS idx_examattempts_user ON ExamAttempts(user_id);

-- 2. Fix ExamQuestions table
CREATE TABLE ExamQuestions_new (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_json TEXT NOT NULL,
      marks INTEGER NOT NULL DEFAULT 1,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE CASCADE
    );

INSERT INTO ExamQuestions_new SELECT * FROM ExamQuestions;
DROP TABLE ExamQuestions;
ALTER TABLE ExamQuestions_new RENAME TO ExamQuestions;

-- 3. Fix Lessons table
CREATE TABLE Lessons_new (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      book_id TEXT,
      batch_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      is_preview INTEGER DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0,
      resource_url TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      exam_id TEXT,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
      FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE SET NULL
    );

INSERT INTO Lessons_new SELECT * FROM Lessons;
DROP TABLE Lessons;
ALTER TABLE Lessons_new RENAME TO Lessons;
CREATE INDEX IF NOT EXISTS idx_lessons_course_id_order ON Lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_book_id_order ON Lessons(book_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_course_batch ON Lessons(course_id, batch_id);

PRAGMA defer_foreign_keys = OFF;
