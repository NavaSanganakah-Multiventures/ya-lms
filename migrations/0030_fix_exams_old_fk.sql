-- Fix dangling foreign keys to Exams_Old from a previous incomplete migration

PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

-- 1. Fix ExamAttempts table
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

INSERT INTO ExamAttempts_new (id, exam_id, user_id, answers_json, score, score_percent, total_marks, passed, submitted_at)
SELECT id, exam_id, user_id, answers_json, score, score_percent, total_marks, passed, submitted_at FROM ExamAttempts;

DROP TABLE ExamAttempts;
ALTER TABLE ExamAttempts_new RENAME TO ExamAttempts;
CREATE INDEX IF NOT EXISTS idx_examattempts_user ON ExamAttempts(user_id);

-- 2. Fix ExamQuestions table
CREATE TABLE ExamQuestions_new (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_option_index INTEGER NOT NULL DEFAULT 0,
      marks INTEGER NOT NULL DEFAULT 1,
      question_type TEXT DEFAULT 'mcq',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE CASCADE
    );

INSERT INTO ExamQuestions_new (id, exam_id, question_text, options_json, correct_option_index, marks, question_type, order_index, created_at)
SELECT id, exam_id, question_text, options_json, correct_option_index, marks, question_type, order_index, created_at FROM ExamQuestions;

DROP TABLE ExamQuestions;
ALTER TABLE ExamQuestions_new RENAME TO ExamQuestions;

-- 3. Fix Lessons table
CREATE TABLE Lessons_new (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      book_id TEXT,
      batch_id TEXT,
      chapter_title TEXT DEFAULT 'General',
      title TEXT NOT NULL,
      type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording', 'quiz')) NOT NULL,
      content_url TEXT,
      audio_url TEXT,
      order_index INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      text_content TEXT,
      text_content_hi TEXT,
      is_free INTEGER DEFAULT 0,
      processing_status TEXT DEFAULT 'pending',
      processing_error TEXT,
      exam_id TEXT,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
      FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE SET NULL
    );

INSERT INTO Lessons_new (id, course_id, book_id, batch_id, chapter_title, title, type, content_url, audio_url, order_index, created_at, text_content, text_content_hi, is_free, processing_status, processing_error, exam_id)
SELECT id, course_id, book_id, batch_id, chapter_title, title, type, content_url, audio_url, order_index, created_at, text_content, text_content_hi, is_free, processing_status, processing_error, exam_id FROM Lessons;

DROP TABLE Lessons;
ALTER TABLE Lessons_new RENAME TO Lessons;

CREATE INDEX IF NOT EXISTS idx_lessons_course_id_order ON Lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_book_id_order ON Lessons(book_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_course_batch ON Lessons(course_id, batch_id);

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
