// Mock mimetext to avoid ts-node loading its buggy package under Node.js
import Module from 'module';
import fs from 'fs';

// Teach Node.js how to require .sql files as raw strings
(require as any).extensions['.sql'] = function (module: any, filename: string) {
  module.exports = fs.readFileSync(filename, 'utf8');
};

const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'mimetext') {
    return { createMimeMessage: () => ({}) };
  }
  if (id === 'cloudflare:email') {
    return { EmailMessage: class {} };
  }
  if (id === 'cloudflare:workers') {
    return { DurableObject: class {}, WorkflowEntrypoint: class {} };
  }
  return originalRequire.apply(this, arguments);
};

const { createWhisperAudioPayload, resolveLessonMediaStorageKey } = require('../src/index');

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn: () => void, expected: string) {
  try {
    fn();
    throw new Error(`Expected error containing "${expected}"`);
  } catch (error: any) {
    const message = error?.message || String(error);
    assert(message.includes(expected), `Expected "${expected}" in "${message}"`);
  }
}

function runTests() {
  console.log("Starting tests for Whisper audio payload helpers...");

  console.log("Test 1: Uint8Array input stays binary");
  const uint8Payload = createWhisperAudioPayload(new Uint8Array([1, 2, 3]), "test-uint8");
  assert(uint8Payload.audio instanceof Uint8Array, "Uint8Array input should stay binary");
  assert(uint8Payload.audio.length === 3, "Uint8Array payload should preserve byte length");
  assert(uint8Payload.audio[1] === 2, "Uint8Array payload should preserve byte values");

  console.log("Test 2: number[] input converts to Uint8Array");
  const arrayPayload = createWhisperAudioPayload([4, 5, 6], "test-array");
  assert(arrayPayload.audio instanceof Uint8Array, "number[] input should convert to Uint8Array");
  assert(arrayPayload.audio[2] === 6, "number[] payload should preserve byte values");

  console.log("Test 3: string input is rejected with actionable error");
  assertThrows(
    () => createWhisperAudioPayload("https://example.com/audio.mp3" as any, "test-string"),
    "Invalid Whisper audio source type: string",
  );

  console.log("Test 4: empty binary input is rejected");
  assertThrows(
    () => createWhisperAudioPayload(new Uint8Array(), "test-empty"),
    "Whisper audio source is empty",
  );

  console.log("Test 5: recording asset URLs resolve to storage keys");
  const assetKey = resolveLessonMediaStorageKey("/api/assets/YA-CRS-1/general/recording/audio_test.mp3");
  assert(assetKey === "YA-CRS-1/general/recording/audio_test.mp3", `Unexpected asset key: ${assetKey}`);

  console.log("Test 6: media URLs still resolve to storage keys");
  const mediaKey = resolveLessonMediaStorageKey("/api/media/YA-CRS-2/lesson/video.mp4");
  assert(mediaKey === "YA-CRS-2/lesson/video.mp4", `Unexpected media key: ${mediaKey}`);

  console.log("\n✅ All Whisper audio payload helper tests passed!");
}

try {
  runTests();
} catch (err) {
  console.error("\n❌ Test failed!");
  console.error(err);
  process.exit(1);
}

export {};
