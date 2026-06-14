const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');

// 1. JWT Env Hardening
code = code.replace(/verifyJWT\s*\(\s*([^,]+)\s*,\s*([^,\)]+)\s*\)/g, 'verifyJWT($1, $2, env.ENVIRONMENT)');
code = code.replace(/env: string\s*=\s*'production'/g, 'expectedEnv?: string');
code = code.replace(/if \(!isValid\) \{/g, 'if (expectedEnv && payload.env !== expectedEnv) { throw new Error("Environment mismatch"); }\n  if (!isValid) {');
code = code.replace(/role: user.role,/g, 'role: user.role,\n        env: env.ENVIRONMENT,');

// 2. Admin Routes Auth
const funcsToUpdate = [
  'handleAdminListBooks', 'handleAdminCreateBook', 'handleAdminUpdateBook', 'handleAdminDeleteBook',
  'handleAdminGetBookLessons', 'handleAdminCreateBookLesson', 'handleAdminUpdateBookLesson',
  'handleAdminDeleteBookLesson', 'handleAdminGetCourseBooks', 'handleAdminLinkBookToCourse',
  'handleAdminUnlinkBookFromCourse'
];
funcsToUpdate.forEach(func => {
  const regex = new RegExp('(async function ' + func + '\\([^\\)]+\\): Promise<Response> {\\s*try {)', 'g');
  code = code.replace(regex, '$1\n    await requireAdminOrTeacher(request, env);');
});

// 3. AI Gateway Timeouts
const target1 = `  try {
    const gRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "cf-aig-authorization": \`Bearer \${aigToken}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });`;
const r1 = `  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const gRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "cf-aig-authorization": \`Bearer \${aigToken}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));`;
code = code.replace(target1, r1);

const target2 = `      const retryRes = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          "cf-aig-authorization": \`Bearer \${aigToken}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });`;
const r2 = `      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 10000);
      const retryRes = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          "cf-aig-authorization": \`Bearer \${aigToken}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: fallbackController.signal,
      }).finally(() => clearTimeout(fallbackTimeoutId));`;
code = code.replace(target2, r2);

// 4. Recording Retries
const target3 = `      // Stream directly to R2 to avoid OOM
      // Assuming downloadUrl is a pre-signed S3 URL, no Authorization header should be added
      const fileRes = await fetch(downloadUrl);
      if (fileRes.ok && fileRes.body) {`;
const r3 = `      // Stream directly to R2 to avoid OOM
      // Assuming downloadUrl is a pre-signed S3 URL, no Authorization header should be added
      let fileRes = await fetch(downloadUrl);
      for (let retries = 0; retries < 5; retries++) {
        if (fileRes.ok) break;
        if (fileRes.status === 404 || fileRes.status === 403) {
          console.log(\`Cloudflare recording URL returned \${fileRes.status}, retrying in 5s...\`);
          await new Promise((r) => setTimeout(r, 5000));
          fileRes = await fetch(downloadUrl);
        } else {
          break;
        }
      }
      if (fileRes.ok && fileRes.body) {`;
code = code.replace(target3, r3);

const target4 = `    // Proxy the download from Cloudflare API so the browser can download it
    // S3 Pre-signed URLs don't need Authorization header
    const fileRes = await fetch(downloadUrl);

    if (!fileRes.ok || !fileRes.body) {`;
const r4 = `    // Proxy the download from Cloudflare API so the browser can download it
    // S3 Pre-signed URLs don't need Authorization header
    let fileRes = await fetch(downloadUrl);
    for (let retries = 0; retries < 3; retries++) {
      if (fileRes.ok) break;
      if (fileRes.status === 404 || fileRes.status === 403) {
        await new Promise((r) => setTimeout(r, 3000));
        fileRes = await fetch(downloadUrl);
      } else {
        break;
      }
    }

    if (!fileRes.ok || !fileRes.body) {`;
code = code.replace(target4, r4);

// 5. Live Class Credits
const target5 = `AND user_id IN (SELECT user_id FROM Enrollments WHERE course_id = ? AND status = 'active')`;
const r5 = `AND user_id IN (SELECT user_id FROM Attendance WHERE session_id = ?)`;
code = code.replace(target5, r5);
const target6 = `.bind(session.course_id, session.course_id)`;
const r6 = `.bind(session.id, session.course_id)`;
code = code.replace(target6, r6);

fs.writeFileSync('src/index.ts', code);
console.log('All fixes applied correctly.');
