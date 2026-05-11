import sys

with open("src/index.ts", "r") as f:
    content = f.read()

search_block = """    if (token) {
      const jwtSecret = await getSecret(env, "JWT_SECRET");
      if (!jwtSecret) throw new Error("JWT_SECRET missing");
      try {
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub;
        role = payload.role;
        console.log(`[AI Chat] Authenticated User: ${userId} (Role: ${role})`);
      } catch (e) {
        console.warn(
          `[AI Chat] Token validation failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    } else {
      console.warn(`[AI Chat] No session token found in cookies`);
    }

    let body: any;"""

replace_block = """    if (token) {
      const jwtSecret = await getSecret(env, "JWT_SECRET");
      if (!jwtSecret) throw new Error("JWT_SECRET missing");
      try {
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub;
        role = payload.role;
        console.log(`[AI Chat] Authenticated User: ${userId} (Role: ${role})`);
      } catch (e) {
        console.warn(
          `[AI Chat] Token validation failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    } else {
      console.warn(`[AI Chat] No session token found in cookies`);
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized. Please log in to use the AI chat." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    let body: any;"""

if search_block in content:
    content = content.replace(search_block, replace_block)
    with open("src/index.ts", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Search block not found")
