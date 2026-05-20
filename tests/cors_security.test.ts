import { assert } from "console";

// Mocking the environment and Request
interface MockEnv {
  PLATFORM_SECRETS: {
    get: (key: string) => Promise<string | null>;
  };
  ENVIRONMENT: string;
}

/**
 * Dynamically determines the allowed origin for CORS to avoid overly permissive "*" policies.
 * (Copied from src/index.ts for logic verification in isolation)
 */
async function getCORSHeaders(
  request: Request,
  env: MockEnv,
): Promise<Record<string, string>> {
  const origin = request.headers.get("Origin");
  // Simulating getSecret
  const appUrl = await env.PLATFORM_SECRETS.get("APP_URL");
  const normalizedAppUrl = appUrl ? appUrl.replace(/\/$/, "") : null;

  let allowedOrigin = normalizedAppUrl || "";

  if (origin) {
    if (normalizedAppUrl && origin === normalizedAppUrl) {
      allowedOrigin = origin;
    } else if (env.ENVIRONMENT !== "production") {
      const isDevOrigin =
        origin === "http://localhost" ||
        origin.startsWith("http://localhost:") ||
        origin === "http://127.0.0.1" ||
        origin.startsWith("http://127.0.0.1:") ||
        origin === "http://10.0.2.2" ||
        origin.startsWith("http://10.0.2.2:"); // Android Emulator

      if (isDevOrigin) {
        allowedOrigin = origin;
      }
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    Vary: "Origin",
  };
}

async function runTests() {
  console.log("Running CORS Security Tests...");

  // Test Case 1: Production, matching Origin
  {
    const env: MockEnv = {
      PLATFORM_SECRETS: {
        get: async (key: string) => (key === "APP_URL" ? "https://myapp.com" : null),
      },
      ENVIRONMENT: "production",
    };
    const request = new Request("https://api.myapp.com", {
      headers: { Origin: "https://myapp.com" },
    });
    const headers = await getCORSHeaders(request, env);
    if (headers["Access-Control-Allow-Origin"] !== "https://myapp.com") {
        throw new Error("Test Case 1 Failed: Should allow matching origin in production");
    }
    if (headers["Vary"] !== "Origin") {
        throw new Error("Test Case 1 Failed: Should include Vary: Origin");
    }
  }

  // Test Case 2: Production, mismatching Origin
  {
    const env: MockEnv = {
      PLATFORM_SECRETS: {
        get: async (key: string) => (key === "APP_URL" ? "https://myapp.com" : null),
      },
      ENVIRONMENT: "production",
    };
    const request = new Request("https://api.myapp.com", {
      headers: { Origin: "https://malicious.com" },
    });
    const headers = await getCORSHeaders(request, env);
    if (headers["Access-Control-Allow-Origin"] !== "https://myapp.com") {
        throw new Error("Test Case 2 Failed: Should default to APP_URL in production for non-matching origins");
    }
  }

  // Test Case 3: Development, localhost Origin
  {
    const env: MockEnv = {
      PLATFORM_SECRETS: {
        get: async (key: string) => (key === "APP_URL" ? "https://myapp.com" : null),
      },
      ENVIRONMENT: "development",
    };
    const request = new Request("http://localhost:3000", {
      headers: { Origin: "http://localhost:3000" },
    });
    const headers = await getCORSHeaders(request, env);
    if (headers["Access-Control-Allow-Origin"] !== "http://localhost:3000") {
        throw new Error("Test Case 3 Failed: Should allow localhost in development");
    }
  }

  // Test Case 4: Development, malicious Origin
  {
    const env: MockEnv = {
      PLATFORM_SECRETS: {
        get: async (key: string) => (key === "APP_URL" ? "https://myapp.com" : null),
      },
      ENVIRONMENT: "development",
    };
    const request = new Request("http://localhost:3000", {
      headers: { Origin: "http://malicious.com" },
    });
    const headers = await getCORSHeaders(request, env);
    if (headers["Access-Control-Allow-Origin"] !== "https://myapp.com") {
        throw new Error("Test Case 4 Failed: Should default to APP_URL for non-dev origins in development");
    }
  }

  // Test Case 5: No Origin header
  {
    const env: MockEnv = {
      PLATFORM_SECRETS: {
        get: async (key: string) => (key === "APP_URL" ? "https://myapp.com" : null),
      },
      ENVIRONMENT: "production",
    };
    const request = new Request("https://api.myapp.com");
    const headers = await getCORSHeaders(request, env);
    if (headers["Access-Control-Allow-Origin"] !== "https://myapp.com") {
        throw new Error("Test Case 5 Failed: Should default to APP_URL when no origin is provided");
    }
  }

  console.log("All CORS Security Tests Passed!");
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
