-- Migration: 0019_form_templates_book_id.sql
-- Description: Add book_id to FormTemplates to link forms to standalone books.

ALTER TABLE FormTemplates ADD COLUMN book_id TEXT;
