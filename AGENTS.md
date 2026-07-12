# Migration Guidelines

## Column Rename with Value Transformation

When renaming a database column AND the value representation/unit changes simultaneously:

1. **NEVER rely solely on `ALTER TABLE RENAME COLUMN`** — use a two-step approach:
   - Step 1: Add the new column with the correct name, type, and default
   - Step 2: Transform and copy old values to the new column with proper conversion factor
   - Step 3: (Optional) Drop old column after verifying data integrity

2. **Always verify the conversion factor** — For example, if old values were in credits (÷10 = rupees), the migration SQL must use `/ 10.0`, NOT `/ 20.0` or any other wrong divisor. Double-check every math operation.

3. **Handle NOT NULL + DEFAULT carefully** — SQLite does not allow `ALTER TABLE ADD COLUMN` with `NOT NULL` but no `DEFAULT`. If a new column must be NOT NULL, always provide a DEFAULT value. If the schema has NOT NULL without DEFAULT, strip NOT NULL from the ADD COLUMN statement.

4. **Dependent objects (indexes, triggers) block DROP COLUMN** — Before dropping a column, check if any index, trigger, or foreign key references it. Drop those first.

5. **Log the full SQL in error messages** — Errors like "Cannot add a NOT NULL column with default value NULL" are useless without showing the actual SQL that failed. Always include the failing SQL in error logs.

6. **Test on preview first** — Run migrations on a copy (preview/fork) before production.
