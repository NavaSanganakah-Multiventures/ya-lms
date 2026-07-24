import { z } from "zod";
import { Env } from "../index";

// ─────────────────────────────────────────────────────
// Zod Schemas for Validation
// ─────────────────────────────────────────────────────
export const registerSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters long").max(15, "Phone number too long").optional().nullable(),
  otp: z.string().min(4, "OTP is required"),
  birth_date: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  grand_father_name: z.string().optional(),
  education: z.string().optional(),
  diksha: z.string().optional(),
  address: z.string().optional(),
  district: z.string().optional().nullable(),
  state: z.string().optional(),
  country: z.string().optional().nullable(),
  pin_code: z.string().optional(),
  role: z.enum(["student", "teacher", "admin"]).default("student"),
});

/**
 * Validates registration request body against registerSchema.
 * Returns { success: true, data } or { success: false, response } (400).
 */
export async function validateRegistrationRequest(request: Request): Promise<
  { success: true; data: z.infer<typeof registerSchema> }
  | { success: false; response: Response }
> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  const result = registerSchema.safeParse(rawBody);

  if (!result.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: "Validation failed",
          details: result.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  return { success: true, data: result.data };
}

