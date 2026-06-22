-- Migration number: 0001 	 2024-06-22T02:20:00.000Z
CREATE TABLE IF NOT EXISTS AccountDeletionRequests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      scheduled_deletion_date DATETIME NOT NULL,
      status TEXT CHECK(status IN ('pending', 'cancelled')) DEFAULT 'pending',
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
