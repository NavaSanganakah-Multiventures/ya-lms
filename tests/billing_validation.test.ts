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
  return originalRequire.apply(this, arguments);
};

import { validateBillingAddress } from '../src/index';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function runTests() {
    console.log("Starting tests for validateBillingAddress (imported from src/index)...");

    // 1. Valid billing address
    console.log("Test 1: Valid billing address");
    const validAddress = {
        full_name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        line1: "123 Main St",
        city: "Anytown",
        state: "CA",
        pincode: "123456"
    };
    assert(validateBillingAddress(validAddress) === null, "Valid address should return null");

    // 2. Missing one field
    console.log("Test 2: Missing one field (email)");
    const missingEmail = { ...validAddress };
    delete (missingEmail as any).email;
    const result2 = validateBillingAddress(missingEmail);
    assert(result2 === "Billing address missing: email", `Should report missing email, got: ${result2}`);

    // 3. Missing multiple fields
    console.log("Test 3: Missing multiple fields (city, state)");
    const missingCityState = { ...validAddress };
    delete (missingCityState as any).city;
    delete (missingCityState as any).state;
    const result3 = validateBillingAddress(missingCityState);
    assert(result3 === "Billing address missing: city, state", `Should report missing city and state, got: ${result3}`);

    // 4. Empty object
    console.log("Test 4: Empty object");
    const result4 = validateBillingAddress({});
    assert(result4 !== null && result4.includes("Billing address missing"), "Empty object should return missing fields error");

    // 5. null/undefined address
    console.log("Test 5: null address");
    const result5 = validateBillingAddress(null);
    assert(result5 !== null && result5.includes("Billing address missing"), "null address should return missing fields error");

    console.log("\n✅ All billing validation tests passed!");
}

try {
    runTests();
} catch (err) {
    console.error("\n❌ Test failed!");
    console.error(err);
    process.exit(1);
}

export {};
