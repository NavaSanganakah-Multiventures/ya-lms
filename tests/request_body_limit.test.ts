import assert from 'node:assert/strict';
import { parseJsonRequestBody } from '../src/request-utils';

async function runTests() {
  console.log('Starting request body parsing tests...');

  const smallRequest = new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  });

  const smallBody = await parseJsonRequestBody(smallRequest);
  assert.deepStrictEqual(smallBody, { ok: true });

  const oversizedPayload = 'x'.repeat(70 * 1024);
  const oversizedRequest = new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ payload: oversizedPayload }),
  });

  try {
    await parseJsonRequestBody(oversizedRequest);
    assert.fail('Expected oversized request to fail');
  } catch (error: any) {
    assert.equal(error instanceof Response, true);
    assert.equal(error.status, 413);
    const body = await error.text();
    assert.match(body, /Request body too large/i);
  }

  console.log('✅ request body parsing tests passed!');
}

runTests();
