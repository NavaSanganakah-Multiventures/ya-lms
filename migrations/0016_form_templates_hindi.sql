-- Add Hindi title/description fields for FormTemplates
ALTER TABLE FormTemplates ADD COLUMN title_hi TEXT;
ALTER TABLE FormTemplates ADD COLUMN description_hi TEXT;
