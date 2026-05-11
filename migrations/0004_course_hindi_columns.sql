-- Add Hindi title/description fields used by the admin course editor.
ALTER TABLE Courses ADD COLUMN title_hi TEXT;
ALTER TABLE Courses ADD COLUMN description_hi TEXT;
