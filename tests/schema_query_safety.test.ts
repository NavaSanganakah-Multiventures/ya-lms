import assert from 'node:assert/strict';
import { isSafeSchemaQuery } from '../src/schema-safety';

async function runTests() {
  console.log('Starting schema query safety tests...');

  assert.equal(isSafeSchemaQuery('CREATE TABLE IF NOT EXISTS test (id TEXT)'), true);
  assert.equal(isSafeSchemaQuery('ALTER TABLE Users ADD COLUMN last_seen TEXT'), true);
  assert.equal(isSafeSchemaQuery('DROP TABLE IF EXISTS Users'), false);
  assert.equal(isSafeSchemaQuery('DROP INDEX IF EXISTS idx_users'), false);
  assert.equal(isSafeSchemaQuery('UPDATE Users SET full_name = "x" WHERE id = 1'), true);
  assert.equal(isSafeSchemaQuery('UPDATE Users SET full_name = "x"'), false);
  assert.equal(isSafeSchemaQuery('DELETE FROM Users WHERE id = 1'), true);
  assert.equal(isSafeSchemaQuery('DELETE FROM Users'), false);

  console.log('✅ schema query safety tests passed!');
}

runTests();
