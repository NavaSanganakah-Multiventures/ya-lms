import { z } from "zod";
import { Env } from "../index";

// ─────────────────────────────────────────────────────
// Zod Schemas for Validation
// ─────────────────────────────────────────────────────
export const registerSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters long").max(15, "Phone number too long"),
  birth_date: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  grand_father_name: z.string().optional(),
  education: z.string().optional(),
  diksha: z.string().optional(),
  address: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pin_code: z.string().optional(),
  role: z.enum(["student", "teacher", "admin"]).default("student"),
});

// ─────────────────────────────────────────────────────
// Route Handlers
// ─────────────────────────────────────────────────────
export async function handleRegisterModular(request: Request, env: Env): Promise<Response> {
  try {
    const rawBody = await request.json();
    
    // Validate request body with Zod
    const validationResult = registerSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: "Validation failed", 
        details: validationResult.error.format() 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = validationResult.data;
    
    // Basic implementation to show the pattern (this would normally call DB insertion logic)
    // The actual complex logic remains in index.ts for now; this file serves as the architecture blueprint.
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Data validated successfully via zod module",
      validatedData: data
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
