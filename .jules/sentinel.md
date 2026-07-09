## 2025-02-24 - [Auth Bypass using User-Agent Spoofing]
**Vulnerability:** The App Signature verification logic in `src/index.ts` allowed requests to sensitive OTP endpoints (`/api/auth/send-otp` and `/api/auth/verify-otp`) without an App-JWT if the `User-Agent` matched specific strings (`AdityanveshanApp/1.0` or `AdityanveshanAdmin/1.0`).
**Learning:** `User-Agent` strings are easily manipulated by attackers and should never be used as a standalone factor to bypass cryptographic signature or token verification checks on sensitive API routes.
**Prevention:** Strictly enforce cryptographic verification (like App-JWT validation) or session-based authentication for critical endpoints, ensuring fallback paths don't introduce trivial bypass mechanisms based on insecure client-provided headers.
