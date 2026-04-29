import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createMimeMessage } from 'mimetext';

export interface Env {
  DB: D1Database;
  PLATFORM_SECRETS: KVNamespace;
  STORAGE: R2Bucket;
  ENVIRONMENT: string;
  SEND_EMAIL: { send: (msg: any) => Promise<void> };
}

// --- Crypto Utilities (Zero Dependency) ---

async function getSecret(env: Env, key: string, isCritical = true): Promise<string | null> {
  const val = await env.PLATFORM_SECRETS.get(key);
  if (!val && isCritical) {
    console.warn(`[Config Missing] Key: ${key}`);
    // Trigger alert without blocking
    sendRedAlert(env, 'Missing Configuration', `Critical configuration key '${key}' is missing or empty in PLATFORM_SECRETS.`).catch(() => {});
  }
  return val;
}

async function generateSalt(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 32 bytes
  );
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const base64UrlEncode = (obj: any) => 
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${encodedSignature}`;
}

// --- Global Error Handler ---

async function sendWhatsAppAlert(env: Env, context: string, error: any) {
  try {
    const apiKey = await getSecret(env, 'INFOBIP_API_KEY');
    const baseUrl = await getSecret(env, 'INFOBIP_BASE_URL');
    const adminWhatsApp = await getSecret(env, 'ADMIN_WHATSAPP_NUMBER');

    if (!apiKey || !baseUrl || !adminWhatsApp) return;

    const message = `[YAGYA LMS ERROR]\nContext: ${context}\nError: ${error instanceof Error ? error.message : String(error).substring(0, 500)}`;

    await fetch(`${baseUrl.replace(/\/$/, '')}/whatsapp/1/message/text`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: "447860099299", // Common Infobip test sender, ideally dynamic if configured
        to: adminWhatsApp,
        content: { text: message }
      })
    });
  } catch (e) {
    console.error('Failed to send WhatsApp alert:', e);
  }
}

async function sendRedAlert(env: Env, context: string, details: string) {
  try {
    const adminEmail = await getSecret(env, 'ADMIN_CONTACT_EMAIL', false) || 'navasanganakah@gmail.com';
    const subject = `[🚨 URGENT RED ALERT] LMS System Error - ${context}`;
    
    const htmlContent = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚨 CRITICAL SYSTEM ALERT 🚨</h1>
        </div>
        <div style="padding: 24px; background-color: #fef2f2; color: #171717;">
          <p style="font-size: 16px; margin-top: 0;">Namaste Admin,</p>
          <p style="font-size: 16px;">A critical error or missing configuration has been detected in the LMS platform.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #fee2e2; font-weight: bold; width: 120px; color: #991b1b;">Context:</td>
              <td style="padding: 12px; border-bottom: 1px solid #fee2e2; font-family: monospace;">${context}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #fee2e2; font-weight: bold; color: #991b1b;">Time:</td>
              <td style="padding: 12px; border-bottom: 1px solid #fee2e2; font-family: monospace;">${new Date().toISOString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: bold; color: #991b1b; vertical-align: top;">Details:</td>
              <td style="padding: 12px; font-family: monospace; background: #262626; color: #f87171; white-space: pre-wrap; font-size: 13px; line-height: 1.5;">${details}</td>
            </tr>
          </table>
          
          <p style="font-weight: bold; color: #b91c1c;">Please investigate immediately.</p>
          <p style="margin-bottom: 0;">Om!</p>
        </div>
      </div>
    `;
    
    const textContent = `Namaste Admin,\n\n🚨 CRITICAL SYSTEM ALERT 🚨\n\nContext: ${context}\nTime: ${new Date().toISOString()}\n\nDetails:\n${details}\n\nPlease investigate immediately.\n\nOm!`;
    
    const sent = await sendEmailNative(env, adminEmail, subject, textContent, htmlContent);
    if (!sent) console.error('Failed to send RED ALERT email to:', adminEmail);
  } catch (e) {
    console.error('Error during sendRedAlert:', e);
  }
}

async function handleGlobalError(error: any, context: string, env: Env): Promise<Response> {
  console.error(`[${context}] Error:`, error);
  
  // Trigger Real-time Alerts
  const errorDetails = error instanceof Error ? (error.stack || error.message) : String(error);
  
  await Promise.allSettled([
    sendRedAlert(env, context, errorDetails),
    sendWhatsAppAlert(env, context, error)
  ]);

  // Hide raw error details from end user for security
  return new Response(JSON.stringify({ error: "System Error. The administration has been notified." }), {
    status: 500,
    headers: { 
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    }
  });
}

// --- Email Utilities (Native Binding) ---

async function sendEmailNative(env: Env, toEmail: string, subject: string, textContent: string, htmlContent?: string): Promise<boolean> {
  try {
    const payload: any = {
      from: "Yagya Ashram Family <om@yagyaashram.com>",
      to: toEmail,
      subject: subject,
      text: textContent,
    };
    if (htmlContent) {
      payload.html = htmlContent;
    }
    
    await env.SEND_EMAIL.send(payload);
    return true;
  } catch (error) {
    console.error('Cloudflare Send Email Binding Route Error:', error);
    return false;
  }
}

// --- API Route Handlers (OTP based) ---

async function handleSendOTP(request: Request, env: Env): Promise<Response> {
  try {
    const { email } = await request.json() as any;
    if (!email) return new Response(JSON.stringify({ error: "Email is required" }), { status: 400 });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await env.DB.prepare('INSERT OR REPLACE INTO OTPs (email, otp, expires_at) VALUES (?, ?, ?)')
      .bind(email, otp, expiresAt).run();

    // Log for local dev viewing just in case
    console.log(`[OTP GENERATED] Email: ${email} | OTP: ${otp}`);

    // Call Cloudflare Email Service implementation via native binding
    const textContent = `Namaste,\n\nYour OTP for logging into the Yagya Ashram LMS is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nOm!`;
    const emailSent = await sendEmailNative(env, email, 'Your LMS Login OTP Code', textContent);
    
    if (!emailSent) {
      throw new Error("Cloudflare Email Service Failed to send OTP.");
    }

    return new Response(JSON.stringify({ message: "OTP sent successfully to your email." }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleGlobalError(error, 'Auth.SendOTP', env);
  }
}

async function handleVerifyOTP(request: Request, env: Env): Promise<Response> {
  try {
    const { email, otp } = await request.json() as any;
    if (!email || !otp) return new Response(JSON.stringify({ error: "Email and OTP required" }), { status: 400 });

    const record: any = await env.DB.prepare('SELECT otp, expires_at FROM OTPs WHERE email = ?').bind(email).first();
    
    if (!record || record.otp !== String(otp)) {
      return new Response(JSON.stringify({ error: "Invalid OTP" }), { status: 401 });
    }

    if (new Date(record.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP has expired" }), { status: 401 });
    }

    // OTP Valid. Delete it to prevent reuse.
    await env.DB.prepare('DELETE FROM OTPs WHERE email = ?').bind(email).run();

    // Register user if it's their first time
    let user: any = await env.DB.prepare('SELECT id, role, full_name, phone, birth_date, father_name, mother_name, grand_father_name FROM Users WHERE email = ?').bind(email).first();
    let isNew = false;
    const assignedRole = (email === 'admin@edtech.com' || email === 'navasanganakah@gmail.com') ? 'admin' : 'student';

    if (!user) {
      const generatedId = generateStudentId();
      user = { id: generatedId, role: assignedRole };
      // Insert with dummy hash/salt since we no longer use passwords
      await env.DB.prepare('INSERT INTO Users (id, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)')
        .bind(user.id, email, 'otp_auth', 'none', user.role).run();
      isNew = true;
      
      // Welcome Notification
      await createNotification(env, user.id, 'Welcome to Yagya Ashram!', 'Namaste. Step into the world of unbounded knowledge.', 'success');
    } else {
      if ((email === 'admin@edtech.com' || email === 'navasanganakah@gmail.com') && user.role !== 'admin') {
        user.role = 'admin';
        await env.DB.prepare('UPDATE Users SET role = ? WHERE email = ?').bind('admin', email).run();
      }
    }

    const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
    
    // Role-based session duration: admin/teacher = 3h, student = 12h
    const sessionSeconds = (user.role === 'admin' || user.role === 'teacher') ? 3 * 60 * 60 : 12 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    
    const token = await signJWT({
      sub: user.id,
      role: user.role,
      iat: now,
      exp: now + sessionSeconds
    }, jwtSecret);

    const response = new Response(JSON.stringify({ 
      message: "Login successful", 
      role: user.role, 
      isNew,
      sessionDuration: sessionSeconds,
      profileComplete: !!(user.full_name && user.phone && user.birth_date && user.father_name && user.mother_name && user.grand_father_name)
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

    // Cookie Max-Age matches JWT expiry exactly
    response.headers.append('Set-Cookie', `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionSeconds}`);
    return response;
  } catch (error) {
    return handleGlobalError(error, 'Auth.VerifyOTP', env);
  }
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const { full_name, email, phone, country, district, otp } = await request.json() as any;
    if (!email || !otp || !full_name) return new Response(JSON.stringify({ error: "Required fields missing" }), { status: 400 });

    const record: any = await env.DB.prepare('SELECT otp, expires_at FROM OTPs WHERE email = ?').bind(email).first();
    if (!record || record.otp !== String(otp)) return new Response(JSON.stringify({ error: "Invalid OTP" }), { status: 401 });
    if (new Date(record.expires_at) < new Date()) return new Response(JSON.stringify({ error: "OTP has expired" }), { status: 401 });

    await env.DB.prepare('DELETE FROM OTPs WHERE email = ?').bind(email).run();

    const existingUser = await env.DB.prepare('SELECT id FROM Users WHERE email = ?').bind(email).first();
    if (existingUser) return new Response(JSON.stringify({ error: "Email already registered. Please login." }), { status: 409 });

    const generatedId = generateStudentId(country || 'IN', district || '01');
    const role = 'student';

    await env.DB.prepare('INSERT INTO Users (id, email, password_hash, salt, role, full_name, phone, country, district) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(generatedId, email, 'otp_auth', 'none', role, full_name, phone || null, country || 'IN', district || '01').run();

    const jwtSecret = await env.PLATFORM_SECRETS.get('JWT_SECRET') || 'default_secret';
    const sessionSeconds = 12 * 60 * 60; // student = 12h
    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT({ sub: generatedId, id: generatedId, role, email, iat: now, exp: now + sessionSeconds }, jwtSecret);

    const response = new Response(JSON.stringify({ message: "Registration successful", id: generatedId }), {
      status: 201, headers: { 'Content-Type': 'application/json' }
    });

    response.headers.append('Set-Cookie', `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionSeconds}`);
    return response;
  } catch (error) {
    return handleGlobalError(error, 'Auth.Register', env);
  }
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const response = new Response(JSON.stringify({ message: "Logout successful" }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
  response.headers.append('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  return response;
}

// POST /api/auth/refresh — Activity ping: validates session & checks inactivity (1 hour limit)
// Returns new token if active, 401 if expired or inactive >1h
async function handleRefreshSession(request: Request, env: Env): Promise<Response> {
  try {
    const token = getCookie(request, 'session');
    if (!token) return new Response(JSON.stringify({ error: 'No session' }), { status: 401 });

    const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
    let payload: any;
    try {
      payload = await verifyJWT(token, jwtSecret);
    } catch (e) {
      // Token expired or invalid
      const expiredRes = new Response(JSON.stringify({ error: 'Session expired', code: 'SESSION_EXPIRED' }), { status: 401 });
      expiredRes.headers.append('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
      return expiredRes;
    }

    // Inactivity check — iat = last issued/refreshed time
    const INACTIVITY_LIMIT = 60 * 60; // 1 hour in seconds
    const now = Math.floor(Date.now() / 1000);
    const lastActivity = payload.iat || now;

    if (now - lastActivity > INACTIVITY_LIMIT) {
      const inactiveRes = new Response(JSON.stringify({ error: 'Logged out due to inactivity', code: 'INACTIVITY_LOGOUT' }), { status: 401 });
      inactiveRes.headers.append('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
      return inactiveRes;
    }

    // Active — issue refreshed token with new iat but same exp (do not extend total session)
    const newToken = await signJWT({
      sub: payload.sub,
      role: payload.role,
      iat: now,        // reset activity timestamp
      exp: payload.exp // keep original expiry
    }, jwtSecret);

    const sessionSeconds = (payload.role === 'admin' || payload.role === 'teacher') ? 3 * 60 * 60 : 12 * 60 * 60;
    const res = new Response(JSON.stringify({ ok: true, role: payload.role, exp: payload.exp }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
    res.headers.append('Set-Cookie', `session=${newToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionSeconds}`);
    return res;
  } catch (error) {
    return handleGlobalError(error, 'Auth.Refresh', env);
  }
}

// --- JWT & Cookie Utilities ---

function generateCustomId(prefix: string): string {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${randomPart}${timestampPart}`;
}

function generateBatchId(courseId: string): string {
  // Extract clean suffix (e.g., YA-CRS-JYOTISH -> JYOTISH)
  const suffix = courseId.replace('YA-CRS-', '');
  const dateStr = new Date().getFullYear().toString().slice(-2) + (new Date().getMonth() + 1).toString().padStart(2, '0');
  const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `YA-BTC-${suffix}-${dateStr}-${randomPart}`;
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

function base64UrlDecode(str: string) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  return atob(padded);
}

async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );

  const signatureStr = base64UrlDecode(encodedSignature);
  const signature = new Uint8Array(signatureStr.length);
  for (let i = 0; i < signatureStr.length; i++) {
    signature[i] = signatureStr.charCodeAt(i);
  }

  const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(dataToSign));
  if (!isValid) throw new Error('Invalid signature');

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

// --- Auth Utilities ---

function generateStudentId(countryCode: string = 'IN', districtCode: string = '01'): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const country = countryCode.slice(0, 2).toUpperCase();
  const district = districtCode.slice(0, 2).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `YA${year}${country}${district}${month}${random}`;
}

async function requireAuth(request: Request, env: Env): Promise<{sub: string, role: string}> {
  const token = getCookie(request, 'session');
  if (!token) throw new Error('Unauthorized');
  const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
  return await verifyJWT(token, jwtSecret);
}

async function handleGeneratePdf(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const { title, data } = await request.json() as any;
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height, width } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    page.drawText(title || "Report", { x: 50, y: height - 50, size: 24, font: boldFont });
    
    let y = height - 100;
    for (const [key, val] of Object.entries(data)) {
        page.drawText(`${key}: ${val}`, { x: 50, y, size: 12, font });
        y -= 25;
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Response(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"'
      }
    });
  } catch (error) {
    return handleGlobalError(error, 'Admin.GeneratePdf', env);
  }
}


async function requireAdmin(request: Request, env: Env): Promise<string> {
  const token = getCookie(request, 'session');
  if (!token) throw new Error('Unauthorized');
  const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
  const payload = await verifyJWT(token, jwtSecret);
  if (payload.role !== 'admin') throw new Error('Forbidden');
  return payload.sub; // Returns admin's user ID
}

async function handleAdminStats(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const users = await env.DB.prepare('SELECT COUNT(*) as c FROM Users').first();
    const courses = await env.DB.prepare('SELECT COUNT(*) as c FROM Courses').first();
    const enrollments = await env.DB.prepare('SELECT COUNT(*) as c FROM Enrollments').first();
    const revenue = await env.DB.prepare('SELECT SUM(price) as r FROM Courses c JOIN Enrollments e ON c.id = e.course_id WHERE e.status = "active"').first();

    return new Response(JSON.stringify({ 
      users: (users as any)?.c || 0, 
      courses: (courses as any)?.c || 0, 
      enrollments: (enrollments as any)?.c || 0,
      revenue: (revenue as any)?.r || 0
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    return handleGlobalError(error, 'Admin.Stats', env);
  }
}

async function handleAdminUsers(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT id, email, role, full_name, created_at FROM Users ORDER BY created_at DESC').all();
      return new Response(JSON.stringify({ users: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'PUT') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      const body = await request.json() as any;
      const { role, full_name, email, bio } = body;
      
      await env.DB.prepare('UPDATE Users SET role = COALESCE(?, role), full_name = COALESCE(?, full_name), email = COALESCE(?, email), bio = COALESCE(?, bio) WHERE id = ?')
        .bind(role ?? null, full_name ?? null, email ?? null, bio ?? null, id).run();
      
      return new Response(JSON.stringify({ success: true, message: "User updated successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    return handleGlobalError(error, 'Admin.Users', env);
  }
}

async function handleAdminCourses(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT c.*, u.email as teacher_email, cat.name as category_name FROM Courses c LEFT JOIN Users u ON c.teacher_id = u.id LEFT JOIN Categories cat ON c.category_id = cat.id ORDER BY c.created_at DESC').all();
      return new Response(JSON.stringify({ courses: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'POST') {
      const adminId = await requireAdmin(request, env);
      const { title, description, price_inr, price_usd, teacher_id, category_id } = await request.json() as any;
      const courseId = generateCustomId('YA-CRS');
      
      const finalTeacherId = teacher_id || adminId;

      if (!finalTeacherId) {
        return new Response(JSON.stringify({ error: "Teacher ID is required" }), { status: 400 });
      }

      await env.DB.prepare('INSERT INTO Courses (id, title, description, teacher_id, price, price_inr, price_usd, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(
          courseId, 
          title || 'Untitled Course', 
          description || '', 
          finalTeacherId, 
          price_inr ?? 0, 
          price_inr ?? 0, 
          price_usd ?? 0, 
          category_id || null
        ).run();
      return new Response(JSON.stringify({ message: "Course created successfully", id: courseId }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'PUT') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      const { title, description, price_inr, price_usd, teacher_id, category_id } = await request.json() as any;
      
      await env.DB.prepare('UPDATE Courses SET title = COALESCE(?, title), description = COALESCE(?, description), price = COALESCE(?, price), price_inr = COALESCE(?, price_inr), price_usd = COALESCE(?, price_usd), teacher_id = COALESCE(?, teacher_id), category_id = COALESCE(?, category_id) WHERE id = ?')
        .bind(
          title || null, 
          description || null, 
          price_inr ?? null, 
          price_inr ?? null, 
          price_usd ?? null, 
          teacher_id || null, 
          category_id || null, 
          id
        ).run();
      
      return new Response(JSON.stringify({ success: true, message: "Course updated successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM Courses WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ success: true, message: "Course deleted successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    return handleGlobalError(error, 'Admin.Courses', env);
  }
}

async function handleAdminCategories(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM Categories ORDER BY name ASC').all();
      return new Response(JSON.stringify({ categories: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'POST') {
      const { name, description } = await request.json() as any;
      const id = generateCustomId('YA-CAT');
      await env.DB.prepare('INSERT INTO Categories (id, name, description) VALUES (?, ?, ?)')
        .bind(id, name, description || '').run();
      return new Response(JSON.stringify({ message: "Category created successfully", id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'PUT') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      const { name, description } = await request.json() as any;
      await env.DB.prepare('UPDATE Categories SET name = ?, description = ? WHERE id = ?')
        .bind(name, description || '', id).run();
      return new Response(JSON.stringify({ message: "Category updated successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM Categories WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ message: "Category deleted successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    return handleGlobalError(error, 'Admin.Categories', env);
  }
}

async function handleAdminEnrollments(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT e.*, u.email as user_email, u.full_name as user_name, c.title as course_title, b.name as batch_name
        FROM Enrollments e 
        JOIN Users u ON e.user_id = u.id 
        JOIN Courses c ON e.course_id = c.id 
        LEFT JOIN Batches b ON e.batch_id = b.id
        ORDER BY e.purchased_at DESC
      `).all();
      return new Response(JSON.stringify({ enrollments: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'POST') {
      const { user_id, course_id, batch_id, status } = await request.json() as any;
      const id = generateCustomId('YA-ENR');
      await env.DB.prepare('INSERT INTO Enrollments (id, user_id, course_id, batch_id, status) VALUES (?, ?, ?, ?, ?)')
        .bind(id, user_id, course_id, batch_id || null, status || 'active').run();
      return new Response(JSON.stringify({ message: "Student enrolled successfully", id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM Enrollments WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ message: "Enrollment removed successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    return handleGlobalError(error, 'Admin.Enrollments', env);
  }
}

async function handleAdminBatches(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const url = new URL(request.url);
    
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT b.*, c.title as course_title 
        FROM Batches b 
        JOIN Courses c ON b.course_id = c.id 
        ORDER BY b.created_at DESC
      `).all();
      return new Response(JSON.stringify({ batches: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'POST') {
      const { course_id, name, start_date, end_date, status } = await request.json() as any;
      const id = generateBatchId(course_id);
      await env.DB.prepare('INSERT INTO Batches (id, course_id, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, course_id, name, start_date || null, end_date || null, status || 'upcoming').run();
      return new Response(JSON.stringify({ message: "Batch created successfully", id }), { status: 201 });
    }
    if (request.method === 'PUT') {
      const id = url.pathname.split('/').pop();
      const { name, start_date, end_date, status } = await request.json() as any;
      await env.DB.prepare('UPDATE Batches SET name = COALESCE(?, name), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), status = COALESCE(?, status) WHERE id = ?')
        .bind(name, start_date, end_date, status, id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    if (request.method === 'DELETE') {
      const id = url.pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM Batches WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    return handleGlobalError(error, 'Admin.Batches', env);
  }
}

// --- Notifications Handlers ---

export async function createNotification(env: Env, userId: string, title: string, message: string, type: 'info' | 'alert' | 'success' | 'warning' = 'info') {
  try {
    await env.DB.prepare('INSERT INTO Notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .bind(generateCustomId('YA-NTF'), userId, title, message, type).run();
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

async function handleGetMyCourses(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const userId = payload.sub;

    const { results } = await env.DB.prepare(`
      SELECT c.*, cat.name as category_name, e.payment_status, e.status as enrollment_status
      FROM Enrollments e
      JOIN Courses c ON e.course_id = c.id
      LEFT JOIN Categories cat ON c.category_id = cat.id
      WHERE e.user_id = ?
      ORDER BY e.purchased_at DESC
    `).bind(userId).all();

    return new Response(JSON.stringify({ courses: results }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return handleGlobalError(error, 'User.MyCourses', env);
  }
}

async function handleGetProfile(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const user = await env.DB.prepare('SELECT * FROM Users WHERE id = ?')
      .bind(payload.sub).first();
    
    return new Response(JSON.stringify({ user }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    return handleGlobalError(error, 'User.GetProfile', env);
  }
}

async function handleUpdateProfile(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const body = await request.json() as any;
    const { 
      email, full_name, phone, district, state, country, 
      birth_date, father_name, mother_name, grand_father_name,
      pincode, gender, bio, birth_place 
    } = body;
    
    if (!email || !full_name || !phone || !birth_date || !father_name || !mother_name || !grand_father_name) {
      return new Response(JSON.stringify({ error: "Email, Name, Phone, Birth Date, Father Name, Mother Name and Grandfather Name are required" }), { status: 400 });
    }

    await env.DB.prepare(`
      UPDATE Users SET 
        email = ?, full_name = ?, phone = ?, district = ?, state = ?, country = ?, 
        birth_date = ?, father_name = ?, mother_name = ?, grand_father_name = ?, 
        pincode = ?, gender = ?, bio = ?, birth_place = ? 
      WHERE id = ?
    `)
      .bind(
        email, full_name, phone, district || null, state || null, country || 'IN',
        birth_date, father_name, mother_name, grand_father_name,
        pincode || null, gender || null, bio || null, birth_place || null,
        payload.sub
      ).run();

    return new Response(JSON.stringify({ success: true, message: "Profile updated successfully" }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    return handleGlobalError(error, 'User.UpdateProfile', env);
  }
}

async function handleGetNotifications(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { results } = await env.DB.prepare('SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .bind(payload.sub).all();
    return new Response(JSON.stringify({ notifications: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    return handleGlobalError(error, 'Notifications.Get', env);
  }
}

async function handleMarkNotificationRead(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { id } = await request.json() as any;
    
    if (id === 'all') {
      await env.DB.prepare('UPDATE Notifications SET is_read = 1 WHERE user_id = ?').bind(payload.sub).run();
    } else {
      await env.DB.prepare('UPDATE Notifications SET is_read = 1 WHERE user_id = ? AND id = ?').bind(payload.sub, id).run();
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    return handleGlobalError(error, 'Notifications.MarkRead', env);
  }
}

// --- Course & Enrollment Handlers ---

async function handleListCourses(request: Request, env: Env): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(`
      SELECT c.id, c.title, c.description, c.price, c.price_inr, c.price_usd, c.teacher_id, cat.name as category_name 
      FROM Courses c 
      LEFT JOIN Categories cat ON c.category_id = cat.id 
      ORDER BY c.created_at DESC
    `).all();
    return new Response(JSON.stringify({ courses: results }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleGlobalError(error, 'Course.List', env);
  }
}

async function handleGetCourse(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const course = await env.DB.prepare('SELECT * FROM Courses WHERE id = ?').bind(courseId).first();
    if (!course) return new Response(JSON.stringify({ error: "Course not found" }), { status: 404 });

    let isEnrolled = false;
    let isAdmin = false;

    const token = getCookie(request, 'session');
    if (token) {
      try {
        const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
        const payload = await verifyJWT(token, jwtSecret);
        if (payload.role === 'admin' || payload.role === 'teacher') isAdmin = true;
        const existing = await env.DB.prepare('SELECT id FROM Enrollments WHERE user_id = ? AND course_id = ?').bind(payload.sub, courseId).first();
        if (existing) isEnrolled = true;
      } catch (e) { /* ignore invalid token for public view */ }
    }

    return new Response(JSON.stringify({ course, isEnrolled, isAdmin }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleGlobalError(error, 'Course.Get', env);
  }
}

async function handleListLessons(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const token = getCookie(request, 'session');
    let allowed = false;
    let isPaid = false;
    let userId = null;
    
    if (token) {
      try {
        const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub;
        if (payload.role === 'admin' || payload.role === 'teacher') {
          allowed = true;
          isPaid = true;
        } else {
          const enrollment: any = await env.DB.prepare('SELECT payment_status FROM Enrollments WHERE user_id = ? AND course_id = ?').bind(userId, courseId).first();
          if (enrollment) {
            allowed = true;
            isPaid = enrollment.payment_status === 'paid';
          }
        }
      } catch (e) {}
    }

    const { results } = await env.DB.prepare('SELECT * FROM Lessons WHERE course_id = ? ORDER BY order_index ASC').bind(courseId).all();
    
    let completedLessonIds: string[] = [];
    if (userId && allowed) {
      const completedQuery = await env.DB.prepare('SELECT lesson_id FROM CompletedLessons WHERE user_id = ?').bind(userId).all();
      if (completedQuery.results) {
         completedLessonIds = completedQuery.results.map((r: any) => r.lesson_id);
      }
    }

    if (!allowed) {
      // Return only titles and types if not allowed to view content at all
      const safeResults = results.map(r => ({ 
        id: r.id, 
        chapter_title: r.chapter_title, 
        title: r.title, 
        type: r.type, 
        order_index: r.order_index,
        is_free: r.is_free 
      }));
      return new Response(JSON.stringify({ lessons: safeResults, locked: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // If allowed but NOT paid, strip content from premium lessons
    const filteredResults = results.map(r => {
      if (!isPaid && r.is_free !== 1) {
        return { 
          ...r, 
          content_url: '', 
          text_content: '🔒 This content is premium. Please enroll/pay to unlock.',
          is_locked: true
        };
      }
      return { ...r, is_locked: false };
    });

    return new Response(JSON.stringify({ 
      lessons: filteredResults, 
      locked: !isPaid, 
      completedLessonIds,
      isEnrolled: allowed,
      paymentStatus: isPaid ? 'paid' : 'unpaid'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Course.Lessons', env);
  }
}

async function handleGetLesson(request: Request, env: Env, lessonId: string): Promise<Response> {
  try {
    const token = getCookie(request, 'session');
    let userId = null;
    let isAdmin = false;
    
    if (token) {
      const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
      try {
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub;
        isAdmin = payload.role === 'admin' || payload.role === 'teacher';
      } catch (e) {}
    }

    const lesson: any = await env.DB.prepare('SELECT * FROM Lessons WHERE id = ?').bind(lessonId).first();
    if (!lesson) return new Response(JSON.stringify({ error: "Lesson not found" }), { status: 404 });

    const course: any = await env.DB.prepare('SELECT * FROM Courses WHERE id = ?').bind(lesson.course_id).first();

    // Access Logic:
    // 1. Admin/Teacher always allowed
    // 2. Free lessons always allowed (for everyone)
    // 3. Paid lessons require 'paid' enrollment status
    let allowed = isAdmin || lesson.is_free === 1;
    
    if (!allowed && userId) {
      const enrollment: any = await env.DB.prepare('SELECT payment_status FROM Enrollments WHERE user_id = ? AND course_id = ?').bind(userId, lesson.course_id).first();
      if (enrollment && enrollment.payment_status === 'paid') {
        allowed = true;
      }
    }

    if (!allowed) {
      // Return safe version of lesson without sensitive content
      const safeLesson = { 
        id: lesson.id, 
        course_id: lesson.course_id, 
        title: lesson.title, 
        type: lesson.type, 
        is_free: lesson.is_free,
        content_url: '',
        text_content: lesson.is_free === 1 ? lesson.text_content : '🔒 Premium Content Locked. Please upgrade your enrollment to access.' 
      };
      return new Response(JSON.stringify({ lesson: safeLesson, course, error: "Enrollment required for premium content" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ lesson, course }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'User.GetLesson', env);
  }
}

async function handleAdminCreateLesson(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const body = await request.json() as any;
    const lessonId = generateCustomId('YA-LSN');
    await env.DB.prepare('INSERT INTO Lessons (id, course_id, chapter_title, title, type, content_url, text_content, order_index, is_free) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(
        lessonId, 
        courseId, 
        body.chapter_title || 'General', 
        body.title ?? 'Untitled Lesson', 
        body.type ?? 'video', 
        body.content_url ?? '', 
        body.text_content ?? '', 
        body.order_index ?? 0, 
        body.is_free ?? 0
      ).run();
    return new Response(JSON.stringify({ success: true, id: lessonId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Admin.CreateLesson', env);
  }
}

async function handleAdminUpload(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    let key = '';
    let streamBody: any;
    let finalContentType = contentType;

    const sanitizeName = (name: string) => {
      const parts = name.split('.');
      const ext = parts.length > 1 ? '.' + parts.pop() : '';
      let cleanBase = parts.join('.').replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      return (cleanBase || 'media') + ext;
    };

    if (contentType.includes('multipart/form-data')) {
      // Fallback for old forms (small files)
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const courseId = formData.get('courseId') as string || 'general';
      if (!file) return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
      key = `${courseId}/${generateCustomId('YA-MED')}-${sanitizeName(file.name)}`;
      streamBody = await file.arrayBuffer(); 
      finalContentType = file.type;
    } else {
      // Direct raw stream for large files (bypasses RAM limits)
      const encodedName = request.headers.get('X-File-Name') || 'upload.bin';
      const courseId = request.headers.get('X-Course-Id') || 'general';
      const fileName = decodeURIComponent(encodedName);
      key = `${courseId}/${generateCustomId('YA-MED')}-${sanitizeName(fileName)}`;
      streamBody = request.body; 
      
      // Infer mime type from extension if missing or generic
      if (!finalContentType || finalContentType === 'application/octet-stream') {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'mp4') finalContentType = 'video/mp4';
        else if (ext === 'webm') finalContentType = 'video/webm';
        else if (ext === 'mov') finalContentType = 'video/quicktime';
        else if (ext === 'mkv') finalContentType = 'video/x-matroska';
        else if (ext === 'mp3') finalContentType = 'audio/mpeg';
        else if (ext === 'png') finalContentType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') finalContentType = 'image/jpeg';
        else if (ext === 'pdf') finalContentType = 'application/pdf';
      }
    }

    if (!streamBody) {
      return new Response(JSON.stringify({ error: "Empty request body" }), { status: 400 });
    }

    await env.STORAGE.put(key, streamBody, {
      httpMetadata: { contentType: finalContentType }
    });

    const url = `/api/media/${key}`;
    return new Response(JSON.stringify({ success: true, url }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return handleGlobalError(error, 'Admin.Upload', env);
  }
}

async function handleServeMedia(request: Request, env: Env, key: string): Promise<Response> {
  try {
    const rangeHeader = request.headers.get('Range');

    // Get metadata first using head() to avoid downloading massive bodies just for size
    const objectMeta = await env.STORAGE.head(key);

    if (!objectMeta) {
      return new Response("Not Found", { status: 404 });
    }

    const totalSize = objectMeta.size;
    const contentType = objectMeta.httpMetadata?.contentType || 'application/octet-stream';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('ETag', objectMeta.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    // Force inline for video/audio
    if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
      headers.set('Content-Disposition', 'inline');
    }

    // Handle Range request (essential for video seeking in browsers)
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        let start = 0;
        let end = totalSize - 1;

        if (match[1] && match[2]) {
          start = parseInt(match[1], 10);
          end = parseInt(match[2], 10);
        } else if (match[1] && !match[2]) {
          start = parseInt(match[1], 10);
        } else if (!match[1] && match[2]) {
          start = totalSize - parseInt(match[2], 10);
          if (start < 0) start = 0;
        }

        if (end >= totalSize) end = totalSize - 1;
        
        if (start >= totalSize || start > end) {
          headers.set('Content-Range', `bytes */${totalSize}`);
          return new Response("Range Not Satisfiable", { status: 416, headers });
        }

        const chunkSize = end - start + 1;
        headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        headers.set('Content-Length', chunkSize.toString());

        if (request.method === 'HEAD') {
          return new Response(null, { status: 206, headers });
        }

        const rangeOpts: any = { offset: start };
        if (end < totalSize - 1) {
           rangeOpts.length = chunkSize;
        }

        const rangedObject = await env.STORAGE.get(key, { range: rangeOpts });

        if (!rangedObject) {
          return new Response("Range Not Satisfiable", { status: 416, headers });
        }

        return new Response(rangedObject.body, { status: 206, headers });
      }
    }

    // Full file
    headers.set('Content-Length', totalSize.toString());
    
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers });
    }
    
    const fullObject = await env.STORAGE.get(key);
    if (!fullObject) {
      return new Response("Error fetching object", { status: 500 });
    }
    return new Response(fullObject.body, { status: 200, headers });

  } catch (error) {
    console.error("Media Serve Error:", error);
    return new Response("Error serving media", { status: 500 });
  }
}




async function handleAdminUpdateLesson(request: Request, env: Env, courseId: string, lessonId: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const body = await request.json() as any;
    await env.DB.prepare(`
      UPDATE Lessons SET 
        chapter_title = COALESCE(?, chapter_title), 
        title = COALESCE(?, title), 
        type = COALESCE(?, type), 
        content_url = COALESCE(?, content_url), 
        text_content = COALESCE(?, text_content), 
        order_index = COALESCE(?, order_index), 
        is_free = COALESCE(?, is_free) 
      WHERE id = ? AND course_id = ?
    `)
      .bind(
        body.chapter_title ?? null, 
        body.title ?? null, 
        body.type ?? null, 
        body.content_url ?? null, 
        body.text_content ?? null, 
        body.order_index ?? null, 
        body.is_free ?? null, 
        lessonId, 
        courseId
      ).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Admin.UpdateLesson', env);
  }
}

async function handleAdminDeleteLesson(request: Request, env: Env, courseId: string, lessonId: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    await env.DB.prepare('DELETE FROM Lessons WHERE id = ? AND course_id = ?').bind(lessonId, courseId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Admin.DeleteLesson', env);
  }
}

// --- Dynamic Forms Handlers ---

async function handleAdminFormTemplates(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM FormTemplates ORDER BY created_at DESC').all();
      return new Response(JSON.stringify({ templates: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'POST') {
      const { slug, title, description, fields_json, seo_json, theme_json, confirmation_email_body } = await request.json() as any;
      const id = generateCustomId('YA-FRM');
      await env.DB.prepare('INSERT INTO FormTemplates (id, slug, title, description, fields_json, seo_json, theme_json, confirmation_email_body) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, slug, title, description || '', JSON.stringify(fields_json), JSON.stringify(seo_json || {}), JSON.stringify(theme_json || {}), confirmation_email_body || null).run();
      return new Response(JSON.stringify({ message: "Form template created successfully", id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'PUT') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      const { slug, title, description, fields_json, seo_json, theme_json, confirmation_email_body } = await request.json() as any;
      await env.DB.prepare('UPDATE FormTemplates SET slug = ?, title = ?, description = ?, fields_json = ?, seo_json = ?, theme_json = ?, confirmation_email_body = ? WHERE id = ?')
        .bind(slug, title, description || '', JSON.stringify(fields_json), JSON.stringify(seo_json || {}), JSON.stringify(theme_json || {}), confirmation_email_body || null, id).run();
      return new Response(JSON.stringify({ message: "Form template updated successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM FormTemplates WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ message: "Form template deleted successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    return handleGlobalError(error, 'Admin.FormTemplates', env);
  }
}

async function handleAdminFormSubmissions(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT s.*, t.title as template_title, t.slug as template_slug 
        FROM FormSubmissions s 
        JOIN FormTemplates t ON s.template_id = t.id 
        ORDER BY s.created_at DESC
      `).all();
      return new Response(JSON.stringify({ submissions: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'PUT') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      const { status, ai_analysis } = await request.json() as any;
      await env.DB.prepare('UPDATE FormSubmissions SET status = ?, ai_analysis = ? WHERE id = ?')
        .bind(status, ai_analysis || null, id).run();
      return new Response(JSON.stringify({ message: "Submission updated successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    return handleGlobalError(error, 'Admin.FormSubmissions', env);
  }
}

async function handleGetFormTemplate(request: Request, env: Env, slug: string): Promise<Response> {
  try {
    const template = await env.DB.prepare('SELECT * FROM FormTemplates WHERE slug = ?').bind(slug).first();
    if (!template) return new Response(JSON.stringify({ error: "Form not found" }), { status: 404 });
    return new Response(JSON.stringify(template), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Form.GetTemplate', env);
  }
}

async function handleFormResponseSubmit(request: Request, env: Env, slug: string): Promise<Response> {
  try {
    const template: any = await env.DB.prepare('SELECT * FROM FormTemplates WHERE slug = ?').bind(slug).first();
    if (!template) return new Response(JSON.stringify({ error: "Form not found" }), { status: 404 });

    const submissionData = await request.json() as any;
    const submissionId = generateCustomId('YA-SUB');
    const email = submissionData.email || '';
    const fullName = submissionData.full_name || submissionData.name || submissionData.student_name || 'New Student';

    // AI Analysis (Eligibility / Admission processing)
    let aiFeedback = null;
    let isFit = false;
    let autoEnrolled = false;

    if (template.eligibility_criteria || template.auto_enroll) {
      try {
        const criteriaText = template.eligibility_criteria || "Review the application for general sincerity.";
        const systemPrompt = `You are "Ashram Admission AI". Review this application for "${template.title}". 
        Evaluate based on these rules: ${criteriaText}
        Format: {"score": 0-10, "feedback": "Short encouraging feedback in Hindi", "is_fit": boolean}
        Application: ${JSON.stringify(submissionData)}`;
        
        const aiResult = await generateAIContent([{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Review this application.' }], env, true);
        const parsedAnalysis = JSON.parse(sanitizeJson(aiResult));
        aiFeedback = JSON.stringify(parsedAnalysis);
        isFit = parsedAnalysis.is_fit === true;
      } catch (e) {
        console.error("Submission AI Analysis Error:", e);
      }
    }

    let submissionStatus = 'pending';

    // Auto Enrollment Logic
    if (template.auto_enroll && isFit && template.linked_course_id && email) {
      try {
        // Find existing user or create a new one
        let user: any = await env.DB.prepare('SELECT id FROM Users WHERE email = ?').bind(email).first();
        if (!user) {
          const salt = await generateSalt();
          const pass = Math.random().toString(36).slice(-8); // Random password
          const hash = await hashPassword(pass, salt);
          const newUserId = generateStudentId();
          await env.DB.prepare('INSERT INTO Users (id, email, password_hash, salt, role, full_name) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(newUserId, email, hash, salt, 'student', fullName).run();
          user = { id: newUserId };
          
          // Send welcome email with OTP login instructions
          const welcomeBody = `<p>Namaste ${fullName},</p><p>Welcome to Yagya Ashram! Your account has been created. You can log in securely anytime using your email (<strong>${email}</strong>) and an OTP.</p><p>Om!</p>`;
          await sendEmailViaBinding(email, "Welcome to Yagya Ashram - Account Created", welcomeBody, env, true);
        }

        // Enroll
        const enrollId = generateCustomId('YA-ENR');
        await env.DB.prepare('INSERT INTO Enrollments (id, user_id, course_id, batch_id, status) VALUES (?, ?, ?, ?, ?)')
          .bind(enrollId, user.id, template.linked_course_id, template.linked_batch_id || null, 'active').run();
        
        submissionStatus = 'approved';
        autoEnrolled = true;
      } catch (e) {
        console.error("Auto-enrollment failed:", e);
      }
    }

    await env.DB.prepare('INSERT INTO FormSubmissions (id, template_id, email, data_json, ai_analysis, status) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(submissionId, template.id, email, JSON.stringify(submissionData), aiFeedback, submissionStatus).run();

    // Send confirmation email (always send)
    if (email) {
      const subject = `Confirmation: ${template.title}`;
      const body = template.confirmation_email_body || `<p>Namaste,</p><p>आपका फॉर्म "${template.title}" सफलता पूर्वक प्राप्त हो गया है। धन्यवाद!</p><p>Om!</p>`;
      await sendEmailViaBinding(email, subject, body, env, true);
    }

    return new Response(JSON.stringify({ message: "Form submitted successfully!", id: submissionId, ai_analysis: aiFeedback }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Form.Submit', env);
  }
}

// --- Live Session Handlers (Cloudflare Real-time Kit / Calls) ---

async function handleListLiveSessions(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const list = await env.DB.prepare('SELECT * FROM LiveSessions WHERE course_id = ? ORDER BY start_time ASC').bind(courseId).all();
    return new Response(JSON.stringify({ sessions: list.results }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return handleGlobalError(error, 'Course.ListLiveSessions', env);
  }
}

async function handleAdminCreateLiveSession(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(request, env);
    const body = await request.json() as any;
    const { start_time, rtc_room_id, title } = body;

    const id = generateCustomId('YA-LIV');
    // Note: title field is added on the fly if needed, but table schema doesn't have it.
    // I'll stick to schema or update it if allowed. User asked for topic/title usually.
    // The previous grep showed no 'title' in LiveSessions. I'll stick to rtc_room_id as key.
    
    await env.DB.prepare('INSERT INTO LiveSessions (id, course_id, batch_id, teacher_id, title, start_time, rtc_room_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, courseId, body.batch_id || null, admin, title || 'Live Class', start_time, rtc_room_id, 'scheduled').run();

    return new Response(JSON.stringify({ success: true, id }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return handleGlobalError(error, 'Admin.CreateLiveSession', env);
  }
}

async function handleAdminUpdateLiveSession(request: Request, env: Env, sessionId: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const body = await request.json() as any;
    const { start_time, status, rtc_room_id } = body;

    await env.DB.prepare('UPDATE LiveSessions SET start_time = ?, status = ?, rtc_room_id = ? WHERE id = ?')
      .bind(start_time, status, rtc_room_id, sessionId).run();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Admin.UpdateLiveSession', env);
  }
}

async function handleAdminDeleteLiveSession(request: Request, env: Env, sessionId: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    await env.DB.prepare('DELETE FROM LiveSessions WHERE id = ?').bind(sessionId).run();
    await env.DB.prepare('DELETE FROM LiveSignaling WHERE session_id = ?').bind(sessionId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Admin.DeleteLiveSession', env);
  }
}

// --- Live Class Signaling Handlers ---

async function handleLiveSignaling(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) return new Response(JSON.stringify({ error: "sessionId required" }), { status: 400 });

    if (request.method === 'POST') {
      const { type, data } = await request.json() as any;
      const id = generateCustomId('YA-SIG');
      await env.DB.prepare('INSERT INTO LiveSignaling (id, session_id, user_id, type, data) VALUES (?, ?, ?, ?, ?)').bind(id, sessionId, payload.sub, type, JSON.stringify(data)).run();
      
      // Update Attendance if it's a student joining
      if (payload.role === 'student' && type === 'offer_request') {
        const attId = generateCustomId('YA-ATT');
        await env.DB.prepare('INSERT OR IGNORE INTO Attendance (id, session_id, user_id) VALUES (?, ?, ?)').bind(attId, sessionId, payload.sub).run();
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'GET') {
      const lastPoll = url.searchParams.get('lastPoll') || '1970-01-01';
      // Get signals meant for this user OR broadcasts from teacher
      // If student: get signals from Teacher (Admin/Teacher role)
      // If teacher: get signals from Students
      
      const { results } = await env.DB.prepare(`
        SELECT * FROM LiveSignaling 
        WHERE session_id = ? 
        AND created_at > ? 
        AND user_id != ?
        ORDER BY created_at ASC
      `).bind(sessionId, lastPoll, payload.sub).all();

      return new Response(JSON.stringify({ signals: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'DELETE') {
       // Clear old signals
       await env.DB.prepare('DELETE FROM LiveSignaling WHERE session_id = ? AND created_at < datetime("now", "-1 hour")').bind(sessionId).run();
       return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    return handleGlobalError(error, 'Live.Signaling', env);
  }
}

async function handleEnroll(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const token = getCookie(request, 'session');
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized. Please log in." }), { status: 401 });

    const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
    const payload = await verifyJWT(token, jwtSecret);

    if (payload.role !== 'student') {
      return new Response(JSON.stringify({ error: "Only students can enroll in courses." }), { status: 403 });
    }

    const userId = payload.sub;

    const course = await env.DB.prepare('SELECT id FROM Courses WHERE id = ?').bind(courseId).first();
    if (!course) return new Response(JSON.stringify({ error: "Course not found" }), { status: 404 });

    const existing = await env.DB.prepare('SELECT id FROM Enrollments WHERE user_id = ? AND course_id = ?').bind(userId, courseId).first();
    if (existing) return new Response(JSON.stringify({ error: "Already enrolled" }), { status: 409 });

    const enrollmentId = generateCustomId('YA-ENR');
    await env.DB.prepare('INSERT INTO Enrollments (id, user_id, course_id, payment_status, status) VALUES (?, ?, ?, ?, ?)')
      .bind(enrollmentId, userId, courseId, 'unpaid', 'active').run();

    // Trigger notification
    const c: any = await env.DB.prepare('SELECT title FROM Courses WHERE id = ?').bind(courseId).first();
    await createNotification(env, userId, 'Enrollment Successful', `You are now enrolled in "${c?.title}". Happy learning!`, 'success');

    return new Response(JSON.stringify({ message: "Enrolled successfully", enrollmentId }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleGlobalError(error, 'Course.Enroll', env);
  }
}

async function handleCompleteLesson(request: Request, env: Env, courseId: string, lessonId: string): Promise<Response> {
  try {
    const token = getCookie(request, 'session');
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });

    const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
    const payload = await verifyJWT(token, jwtSecret);

    if (payload.role !== 'student') {
      return new Response(JSON.stringify({ error: "Only students can complete lessons." }), { status: 403 });
    }

    const userId = payload.sub;

    const existingEnr = await env.DB.prepare('SELECT id FROM Enrollments WHERE user_id = ? AND course_id = ?').bind(userId, courseId).first();
    if (!existingEnr) return new Response(JSON.stringify({ error: "Not enrolled in this course." }), { status: 403 });

    // Access Check: Is the lesson free or is the user enrolled?
    const lesson: any = await env.DB.prepare('SELECT is_free FROM Lessons WHERE id = ?').bind(lessonId).first();
    const isEnrolled = await env.DB.prepare('SELECT id FROM Enrollments WHERE user_id = ? AND course_id = ? AND payment_status = "paid"').bind(userId, courseId).first();

    if (lesson && lesson.is_free === 0 && !isEnrolled) {
      return new Response(JSON.stringify({ 
        error: "Access Denied", 
        message: "This is a premium lesson. Please enroll in the course to continue.",
        requires_payment: true 
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Mark lesson as completed
    await env.DB.prepare('INSERT OR IGNORE INTO CompletedLessons (user_id, lesson_id) VALUES (?, ?)')
      .bind(userId, lessonId).run();

    // Recalculate progress
    const totalLessonsRes = await env.DB.prepare('SELECT COUNT(id) as count FROM Lessons WHERE course_id = ?').bind(courseId).first();
    const totalLessons = (totalLessonsRes?.count as number) || 0;

    const completedRes = await env.DB.prepare(`
      SELECT COUNT(CL.lesson_id) as count 
      FROM CompletedLessons CL 
      JOIN Lessons L ON CL.lesson_id = L.id 
      WHERE CL.user_id = ? AND L.course_id = ?
    `).bind(userId, courseId).first();
    const completedLessons = (completedRes?.count as number) || 0;

    let progress = 0;
    if (totalLessons > 0) {
      progress = Math.round((completedLessons / totalLessons) * 100);
    }

    let status = 'active';
    if (progress >= 100) {
      status = 'completed';
    }

    await env.DB.prepare('UPDATE Enrollments SET progress = ?, status = ? WHERE user_id = ? AND course_id = ?')
      .bind(progress, status, userId, courseId).run();

    if (progress >= 100 && existingEnr.status !== 'completed') {
       const c: any = await env.DB.prepare('SELECT title FROM Courses WHERE id = ?').bind(courseId).first();
       await createNotification(env, userId, 'Course Completed!', `Congratulations on completing "${c?.title}".`, 'success');
    }

    return new Response(JSON.stringify({ message: "Lesson marked complete.", progress }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleGlobalError(error, 'Course.CompleteLesson', env);
  }
}

async function handleUpdateProgress(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const token = getCookie(request, 'session');
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized. Please log in." }), { status: 401 });

    const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
    const payload = await verifyJWT(token, jwtSecret);

    if (payload.role !== 'student') {
      return new Response(JSON.stringify({ error: "Only students can update progress." }), { status: 403 });
    }

    const { progress } = await request.json() as any;
    
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return new Response(JSON.stringify({ error: "Invalid progress value. Must be a number between 0 and 100." }), { status: 400 });
    }

    const userId = payload.sub;

    const existing = await env.DB.prepare('SELECT id FROM Enrollments WHERE user_id = ? AND course_id = ?').bind(userId, courseId).first();
    if (!existing) return new Response(JSON.stringify({ error: "Not enrolled in this course." }), { status: 403 });

    let status = 'active';
    if (progress === 100) {
      status = 'completed';
    }

    await env.DB.prepare('UPDATE Enrollments SET progress = ?, status = ? WHERE user_id = ? AND course_id = ?')
      .bind(progress, status, userId, courseId).run();

    if (progress === 100) {
      const c: any = await env.DB.prepare('SELECT title FROM Courses WHERE id = ?').bind(courseId).first();
      await createNotification(env, userId, 'Course Completed!', `Congratulations! You have completed "${c?.title}".`, 'success');
    }

    return new Response(JSON.stringify({ message: "Progress updated successfully", progress, status }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleGlobalError(error, 'Course.UpdateProgress', env);
  }
}

// --- Razorpay Payment Handlers ---

async function handlePaymentStatus(env: Env): Promise<Response> {
  try {
    const razorpayKey = await getSecret(env, 'RAZORPAY_KEY_ID');
    const razorpaySecret = await getSecret(env, 'RAZORPAY_KEY_SECRET');
    const isConfigured = !!(razorpayKey && razorpaySecret);
    return new Response(JSON.stringify({ configured: isConfigured }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ configured: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleCreatePaymentOrder(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { courseId } = await request.json() as any;

    const course: any = await env.DB.prepare('SELECT price_inr, title FROM Courses WHERE id = ?').bind(courseId).first();
    if (!course) return new Response(JSON.stringify({ error: "Course not found" }), { status: 404 });

    const razorpayKey = await getSecret(env, 'RAZORPAY_KEY_ID');
    const razorpaySecret = await getSecret(env, 'RAZORPAY_KEY_SECRET');

    if (!razorpayKey || !razorpaySecret) {
      // Return 503 without triggering global alert — this is a config issue, not a code bug
      return new Response(JSON.stringify({
        error: "Payment gateway is not configured. Please contact the administrator.",
        code: "PAYMENT_NOT_CONFIGURED"
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const amount = (course.price_inr || 0) * 100; // In paise
    const receipt = `rcpt_${crypto.randomUUID().substring(0, 8)}`;

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${razorpayKey}:${razorpaySecret}`),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: { courseId, userId: payload.sub }
      })
    });

    const order = await response.json() as any;
    
    // Create pending enrollment
    const enrollmentId = crypto.randomUUID();
    await env.DB.prepare('INSERT OR REPLACE INTO Enrollments (id, user_id, course_id, payment_id, payment_status) VALUES (?, ?, ?, ?, ?)')
      .bind(enrollmentId, payload.sub, courseId, order.id, 'pending').run();

    return new Response(JSON.stringify({ order, key: razorpayKey }), { status: 200 });
  } catch (error) {
    return handleGlobalError(error, 'Payments.CreateOrder', env);
  }
}

async function handleVerifyPayment(request: Request, env: Env): Promise<Response> {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json() as any;
    const razorpaySecret = await getSecret(env, 'RAZORPAY_KEY_SECRET');

    if (!razorpaySecret) throw new Error("Razorpay Secret missing.");

    // Signature Verification: HMAC-SHA256(order_id + "|" + payment_id, secret)
    const encoder = new TextEncoder();
    const data = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(razorpaySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, data);
    const expectedSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Payment verification failed" }), { status: 400 });
    }

    // Update Enrollment to 'paid'
    await env.DB.prepare('UPDATE Enrollments SET payment_status = "paid", status = "active" WHERE payment_id = ?')
      .bind(razorpay_order_id).run();

    return new Response(JSON.stringify({ success: true, message: "Payment verified and enrollment active." }), { status: 200 });
  } catch (error) {
    return handleGlobalError(error, 'Payments.Verify', env);
  }
}

// =============================================
// --- Subscription & Webhook Handlers ---
// =============================================

// ==========================================================
// --- Core Access Profile & AI Credit System ---
// ==========================================================

interface UserAccessProfile {
  hasActiveSub: boolean;
  subscriptionId: string | null;
  planId: string | null;
  courseAccessType: 'none' | 'all' | 'static' | 'user_choice';
  allowedCourseIds: string[];
  batchAccessType: 'none' | 'static' | 'user_choice';
  allowedBatchIds: string[];
  aiCreditsTotal: number;
  aiCreditsUsed: number;
  aiCreditsRemaining: number;
  aiPeriod: string;
  aiRateLimitPerHour: number;
  liveSessionAccess: boolean;
}

async function getUserAccessProfile(userId: string, env: Env): Promise<UserAccessProfile> {
  const empty: UserAccessProfile = {
    hasActiveSub: false, subscriptionId: null, planId: null,
    courseAccessType: 'none', allowedCourseIds: [],
    batchAccessType: 'none', allowedBatchIds: [],
    aiCreditsTotal: 0, aiCreditsUsed: 0, aiCreditsRemaining: 0,
    aiPeriod: 'none', aiRateLimitPerHour: 0, liveSessionAccess: false
  };

  const sub: any = await env.DB.prepare(
    `SELECT s.*, p.course_access_type, p.max_course_selection, p.batch_access_type, p.max_batch_selection,
            p.ai_credits, p.ai_credits_period, p.ai_rate_limit_per_hour, p.live_session_access
     FROM Subscriptions s
     JOIN SubscriptionPlans p ON s.plan_id = p.id
     WHERE s.user_id = ? AND s.status = 'active'
       AND (s.current_period_end IS NULL OR s.current_period_end > datetime('now'))
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(userId).first();

  if (!sub) return empty;

  const profile: UserAccessProfile = {
    hasActiveSub: true,
    subscriptionId: sub.id,
    planId: sub.plan_id,
    courseAccessType: sub.course_access_type || 'none',
    allowedCourseIds: [],
    batchAccessType: sub.batch_access_type || 'none',
    allowedBatchIds: [],
    aiCreditsTotal: sub.ai_credits || 0,
    aiCreditsUsed: 0,
    aiCreditsRemaining: sub.ai_credits === -1 ? -1 : 0,
    aiPeriod: sub.ai_credits_period || 'none',
    aiRateLimitPerHour: sub.ai_rate_limit_per_hour || 0,
    liveSessionAccess: sub.live_session_access === 1
  };

  // Resolve course IDs based on access type
  if (profile.courseAccessType === 'static') {
    const { results } = await env.DB.prepare(
      `SELECT item_id FROM PlanContentPool WHERE plan_id = ? AND item_type = 'course' AND access_mode = 'static'`
    ).bind(sub.plan_id).all();
    profile.allowedCourseIds = results.map((r: any) => r.item_id);
  } else if (profile.courseAccessType === 'user_choice') {
    const { results } = await env.DB.prepare(
      `SELECT item_id FROM UserSubscriptionSelections WHERE subscription_id = ? AND item_type = 'course'`
    ).bind(sub.id).all();
    profile.allowedCourseIds = results.map((r: any) => r.item_id);
  }

  // Resolve batch IDs
  if (profile.batchAccessType === 'static') {
    const { results } = await env.DB.prepare(
      `SELECT item_id FROM PlanContentPool WHERE plan_id = ? AND item_type = 'batch' AND access_mode = 'static'`
    ).bind(sub.plan_id).all();
    profile.allowedBatchIds = results.map((r: any) => r.item_id);
  } else if (profile.batchAccessType === 'user_choice') {
    const { results } = await env.DB.prepare(
      `SELECT item_id FROM UserSubscriptionSelections WHERE subscription_id = ? AND item_type = 'batch'`
    ).bind(sub.id).all();
    profile.allowedBatchIds = results.map((r: any) => r.item_id);
  }

  // Resolve AI credits with period reset check
  if (profile.aiCreditsTotal !== 0) {
    let credits: any = await env.DB.prepare(
      'SELECT * FROM UserAICredits WHERE user_id = ?'
    ).bind(userId).first();

    if (credits) {
      // Check if period has expired → reset
      const needsReset = credits.period_end && new Date(credits.period_end) < new Date();
      if (needsReset && profile.aiPeriod !== 'plan' && profile.aiPeriod !== 'none') {
        const { start, end } = calcCreditPeriod(profile.aiPeriod);
        // Calculate bonus credits from selections
        const bonusTotal = await calcBonusCredits(sub.id, sub.plan_id, env);
        await env.DB.prepare(
          `UPDATE UserAICredits SET base_credits_used = 0, bonus_credits_used = 0,
           base_credits_total = ?, bonus_credits_total = ?,
           period_start = ?, period_end = ?, hour_window_used = 0 WHERE user_id = ?`
        ).bind(profile.aiCreditsTotal === -1 ? -1 : profile.aiCreditsTotal, bonusTotal,
               start, end, userId).run();
        credits.base_credits_used = 0;
        credits.bonus_credits_used = 0;
        credits.base_credits_total = profile.aiCreditsTotal;
        credits.bonus_credits_total = bonusTotal;
      }
      const totalAllowed = credits.base_credits_total === -1 ? -1 : (credits.base_credits_total + credits.bonus_credits_total);
      const totalUsed = (credits.base_credits_used || 0) + (credits.bonus_credits_used || 0);
      profile.aiCreditsUsed = totalUsed;
      profile.aiCreditsTotal = totalAllowed;
      profile.aiCreditsRemaining = totalAllowed === -1 ? -1 : Math.max(0, totalAllowed - totalUsed);
    }
  }

  return profile;
}

function calcCreditPeriod(period: string): { start: string; end: string } {
  const now = new Date();
  const start = now.toISOString();
  let end = new Date(now);
  switch (period) {
    case 'hourly':  end.setHours(end.getHours() + 1); break;
    case 'daily':   end.setDate(end.getDate() + 1); break;
    case 'weekly':  end.setDate(end.getDate() + 7); break;
    case 'monthly': end.setMonth(end.getMonth() + 1); break;
    case 'yearly':  end.setFullYear(end.getFullYear() + 1); break;
    default: return { start, end: '2099-01-01T00:00:00.000Z' }; // plan = no reset
  }
  return { start, end: end.toISOString() };
}

async function calcBonusCredits(subscriptionId: string, planId: string, env: Env): Promise<number> {
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(SUM(p.bonus_ai_credits), 0) as total
     FROM UserSubscriptionSelections s
     JOIN PlanContentPool p ON p.plan_id = ? AND p.item_type = s.item_type AND p.item_id = s.item_id
     WHERE s.subscription_id = ?`
  ).bind(planId, subscriptionId).first() as any;
  return (results as any)?.total || 0;
}

async function allocateAICredits(userId: string, subscriptionId: string, planId: string, plan: any, env: Env): Promise<void> {
  const bonusTotal = await calcBonusCredits(subscriptionId, planId, env);
  const { start, end } = calcCreditPeriod(plan.ai_credits_period || 'none');
  await env.DB.prepare(
    `INSERT INTO UserAICredits (user_id, subscription_id, base_credits_total, base_credits_used,
     bonus_credits_total, bonus_credits_used, credits_period, period_start, period_end,
     hour_window_start, hour_window_used, rate_limit_per_hour)
     VALUES (?, ?, ?, 0, ?, 0, ?, ?, ?, datetime('now'), 0, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       subscription_id = excluded.subscription_id,
       base_credits_total = excluded.base_credits_total,
       base_credits_used = 0,
       bonus_credits_total = excluded.bonus_credits_total,
       bonus_credits_used = 0,
       credits_period = excluded.credits_period,
       period_start = excluded.period_start,
       period_end = excluded.period_end,
       hour_window_start = datetime('now'),
       hour_window_used = 0,
       rate_limit_per_hour = excluded.rate_limit_per_hour`
  ).bind(userId, subscriptionId, plan.ai_credits || 0, bonusTotal,
         plan.ai_credits_period || 'none', start, end, plan.ai_rate_limit_per_hour || 0).run();
}

// Returns { allowed: true } or { allowed: false, reason, retryAfter? }
async function checkAndConsumeAICredit(userId: string, env: Env): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const credits: any = await env.DB.prepare('SELECT * FROM UserAICredits WHERE user_id = ?').bind(userId).first();
  if (!credits) return { allowed: false, reason: 'No AI credits. Subscribe to a plan with AI access.' };

  // Unlimited check
  if (credits.base_credits_total === -1) {
    // Still apply hourly rate limit even for unlimited
    if (credits.rate_limit_per_hour > 0) {
      const hourCheck = await checkHourlyLimit(credits, env, userId);
      if (!hourCheck.allowed) return hourCheck;
    }
    return { allowed: true, remaining: -1 };
  }

  // Period reset check
  if (credits.period_end && new Date(credits.period_end) < new Date() && credits.credits_period !== 'plan' && credits.credits_period !== 'none') {
    // Reset
    const { start, end } = calcCreditPeriod(credits.credits_period);
    await env.DB.prepare(
      `UPDATE UserAICredits SET base_credits_used = 0, bonus_credits_used = 0, period_start = ?, period_end = ?, hour_window_used = 0 WHERE user_id = ?`
    ).bind(start, end, userId).run();
    credits.base_credits_used = 0;
    credits.bonus_credits_used = 0;
  }

  const totalAllowed = (credits.base_credits_total || 0) + (credits.bonus_credits_total || 0);
  const totalUsed = (credits.base_credits_used || 0) + (credits.bonus_credits_used || 0);

  if (totalUsed >= totalAllowed) {
    const periodLabel: Record<string, string> = { hourly: 'अगले घंटे', daily: 'कल', weekly: 'अगले सप्ताह', monthly: 'अगले महीने', yearly: 'अगले वर्ष', plan: 'कभी नहीं (plan limit)' };
    return { allowed: false, reason: `AI credits समाप्त। Reset: ${periodLabel[credits.credits_period] || 'N/A'}`, remaining: 0 };
  }

  // Hourly rate limit
  if (credits.rate_limit_per_hour > 0) {
    const hourCheck = await checkHourlyLimit(credits, env, userId);
    if (!hourCheck.allowed) return hourCheck;
  }

  // Consume a credit (from base first, then bonus)
  if (credits.base_credits_used < credits.base_credits_total) {
    await env.DB.prepare('UPDATE UserAICredits SET base_credits_used = base_credits_used + 1 WHERE user_id = ?').bind(userId).run();
  } else {
    await env.DB.prepare('UPDATE UserAICredits SET bonus_credits_used = bonus_credits_used + 1 WHERE user_id = ?').bind(userId).run();
  }

  return { allowed: true, remaining: totalAllowed - totalUsed - 1 };
}

async function checkHourlyLimit(credits: any, env: Env, userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const hourWindowStart = credits.hour_window_start ? new Date(credits.hour_window_start) : new Date(0);
  const now = new Date();
  const diffMs = now.getTime() - hourWindowStart.getTime();

  if (diffMs > 3600000) {
    // New hour window — reset
    await env.DB.prepare('UPDATE UserAICredits SET hour_window_start = ?, hour_window_used = 1 WHERE user_id = ?').bind(now.toISOString(), userId).run();
    return { allowed: true };
  }

  if (credits.hour_window_used >= credits.rate_limit_per_hour) {
    const resetMs = 3600000 - diffMs;
    const resetMin = Math.ceil(resetMs / 60000);
    return { allowed: false, reason: `Rate limit exceeded (${credits.rate_limit_per_hour}/hour). ${resetMin} मिनट बाद try करें।` };
  }

  await env.DB.prepare('UPDATE UserAICredits SET hour_window_used = hour_window_used + 1 WHERE user_id = ?').bind(userId).run();
  return { allowed: true };
}

// Backward compat helper
async function userHasActiveSubscription(userId: string, env: Env): Promise<boolean> {
  const profile = await getUserAccessProfile(userId, env);
  return profile.hasActiveSub;
}

// GET /api/subscription/plans — Public list of active plans
async function handleListSubscriptionPlans(env: Env): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, name, interval, interval_count, amount_inr, razorpay_plan_id FROM SubscriptionPlans WHERE is_active = 1 ORDER BY amount_inr ASC'
    ).all();
    return new Response(JSON.stringify({ plans: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Subscription.ListPlans', env);
  }
}

// GET /api/subscription/me — User ka current subscription status
async function handleGetUserSubscription(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const sub = await env.DB.prepare(
      `SELECT s.*, p.name as plan_name, p.interval, p.amount_inr 
       FROM Subscriptions s 
       JOIN SubscriptionPlans p ON s.plan_id = p.id 
       WHERE s.user_id = ? 
       ORDER BY s.created_at DESC LIMIT 1`
    ).bind(payload.sub).first();
    return new Response(JSON.stringify({ subscription: sub || null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Token expired') {
      return new Response(JSON.stringify({ subscription: null, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return handleGlobalError(error, 'Subscription.GetMine', env);
  }
}

// POST /api/subscription/create — Create Razorpay subscription & save to DB
async function handleCreateSubscription(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { planId } = await request.json() as any;

    const plan: any = await env.DB.prepare('SELECT * FROM SubscriptionPlans WHERE id = ? AND is_active = 1').bind(planId).first();
    if (!plan) return new Response(JSON.stringify({ error: "Subscription plan not found" }), { status: 404 });
    if (!plan.razorpay_plan_id) return new Response(JSON.stringify({ error: "This plan is not yet linked to Razorpay. Contact admin." }), { status: 503 });

    const razorpayKey = await getSecret(env, 'RAZORPAY_KEY_ID');
    const razorpaySecret = await getSecret(env, 'RAZORPAY_KEY_SECRET');

    if (!razorpayKey || !razorpaySecret) {
      return new Response(JSON.stringify({ error: "Payment gateway is not configured.", code: "PAYMENT_NOT_CONFIGURED" }), { status: 503 });
    }

    // Get user email for Razorpay customer
    const user: any = await env.DB.prepare('SELECT email, full_name FROM Users WHERE id = ?').bind(payload.sub).first();

    const rzpBody: any = {
      plan_id: plan.razorpay_plan_id,
      total_count: 12, // Allow up to 12 billing cycles (auto-renews until cancelled)
      quantity: 1,
      customer_notify: 1,
      notes: { userId: payload.sub, planId }
    };

    const rzpRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${razorpayKey}:${razorpaySecret}`),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rzpBody)
    });

    const rzpData = await rzpRes.json() as any;
    if (!rzpRes.ok) {
      console.error('Razorpay subscription create error:', rzpData);
      return new Response(JSON.stringify({ error: rzpData.error?.description || "Failed to create subscription" }), { status: 502 });
    }

    // Save subscription record to D1
    const subId = generateCustomId('YA-SUB');
    await env.DB.prepare(
      'INSERT INTO Subscriptions (id, user_id, plan_id, razorpay_subscription_id, status) VALUES (?, ?, ?, ?, ?)'
    ).bind(subId, payload.sub, planId, rzpData.id, 'created').run();

    return new Response(JSON.stringify({
      subscription_id: rzpData.id,
      key: razorpayKey,
      plan: { name: plan.name, amount_inr: plan.amount_inr },
      user: { email: user?.email, name: user?.full_name }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Subscription.Create', env);
  }
}

// POST /api/subscription/cancel — Cancel active subscription
async function handleCancelSubscription(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const sub: any = await env.DB.prepare(
      `SELECT * FROM Subscriptions WHERE user_id = ? AND status IN ('active','authenticated','created') ORDER BY created_at DESC LIMIT 1`
    ).bind(payload.sub).first();

    if (!sub) return new Response(JSON.stringify({ error: "No active subscription found" }), { status: 404 });

    const razorpayKey = await getSecret(env, 'RAZORPAY_KEY_ID');
    const razorpaySecret = await getSecret(env, 'RAZORPAY_KEY_SECRET');

    if (razorpayKey && razorpaySecret && sub.razorpay_subscription_id) {
      // Cancel at Razorpay (cancel_at_cycle_end = 1 means cancel gracefully at end of period)
      await fetch(`https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${razorpayKey}:${razorpaySecret}`),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cancel_at_cycle_end: 1 })
      });
    }

    await env.DB.prepare('UPDATE Subscriptions SET status = ? WHERE id = ?').bind('cancelled', sub.id).run();
    await createNotification(env, payload.sub, 'Subscription Cancelled', 'Aapka subscription cancel ho gaya hai. Access period end tak active rahega.', 'info');

    return new Response(JSON.stringify({ success: true, message: "Subscription cancelled. Access will remain until end of current period." }), { status: 200 });
  } catch (error) {
    return handleGlobalError(error, 'Subscription.Cancel', env);
  }
}

// =============================================================
// --- Plan Content Pool Management (Admin) ---
// =============================================================

// GET/POST/DELETE /api/admin/subscription/plans/:id/pool
async function handleAdminPlanPool(request: Request, env: Env, planId: string): Promise<Response> {
  try {
    await requireAdmin(request, env);

    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT pcp.*, c.title as course_title, b.name as batch_name
         FROM PlanContentPool pcp
         LEFT JOIN Courses c ON pcp.item_type = 'course' AND pcp.item_id = c.id
         LEFT JOIN Batches b ON pcp.item_type = 'batch' AND pcp.item_id = b.id
         WHERE pcp.plan_id = ? ORDER BY pcp.item_type, pcp.access_mode`
      ).bind(planId).all();
      return new Response(JSON.stringify({ pool: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'POST') {
      const items: Array<{ item_type: string; item_id: string; access_mode: string; bonus_ai_credits?: number }> = await request.json() as any;
      if (!Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ error: 'items array required' }), { status: 400 });
      }
      const stmts = items.map(item =>
        env.DB.prepare(
          `INSERT OR REPLACE INTO PlanContentPool (id, plan_id, item_type, item_id, access_mode, bonus_ai_credits)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(generateCustomId('YA-PCP'), planId, item.item_type, item.item_id, item.access_mode, item.bonus_ai_credits || 0)
      );
      await env.DB.batch(stmts);
      return new Response(JSON.stringify({ success: true, added: items.length }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'DELETE') {
      const { item_type, item_id } = await request.json() as any;
      await env.DB.prepare('DELETE FROM PlanContentPool WHERE plan_id = ? AND item_type = ? AND item_id = ?')
        .bind(planId, item_type, item_id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    return handleGlobalError(error, 'Admin.PlanPool', env);
  }
}

// GET /api/subscription/plans/:id/pool — Student sees what they can choose from
async function handleStudentPlanPool(request: Request, env: Env, planId: string): Promise<Response> {
  try {
    const plan: any = await env.DB.prepare('SELECT * FROM SubscriptionPlans WHERE id = ? AND is_active = 1').bind(planId).first();
    if (!plan) return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404 });

    const { results: courses } = await env.DB.prepare(
      `SELECT pcp.item_id, pcp.access_mode, pcp.bonus_ai_credits, c.title, c.description, c.price_inr
       FROM PlanContentPool pcp JOIN Courses c ON pcp.item_id = c.id
       WHERE pcp.plan_id = ? AND pcp.item_type = 'course'`
    ).bind(planId).all();

    const { results: batches } = await env.DB.prepare(
      `SELECT pcp.item_id, pcp.access_mode, pcp.bonus_ai_credits, b.name, b.start_date, b.end_date, b.status
       FROM PlanContentPool pcp JOIN Batches b ON pcp.item_id = b.id
       WHERE pcp.plan_id = ? AND pcp.item_type = 'batch'`
    ).bind(planId).all();

    return new Response(JSON.stringify({
      plan: {
        id: plan.id, name: plan.name, amount_inr: plan.amount_inr,
        course_access_type: plan.course_access_type, max_course_selection: plan.max_course_selection,
        batch_access_type: plan.batch_access_type, max_batch_selection: plan.max_batch_selection,
        ai_credits: plan.ai_credits, ai_credits_period: plan.ai_credits_period,
        ai_rate_limit_per_hour: plan.ai_rate_limit_per_hour, live_session_access: plan.live_session_access
      },
      courses, batches
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Subscription.StudentPool', env);
  }
}

// POST /api/subscription/pre-select — Student saves selection before payment
async function handleStudentPreSelect(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { planId, selectedCourseIds = [], selectedBatchIds = [] } = await request.json() as any;

    const plan: any = await env.DB.prepare('SELECT * FROM SubscriptionPlans WHERE id = ? AND is_active = 1').bind(planId).first();
    if (!plan) return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404 });

    // Validate selections against pool and limits
    if (plan.course_access_type === 'user_choice') {
      if (selectedCourseIds.length > plan.max_course_selection) {
        return new Response(JSON.stringify({ error: `Maximum ${plan.max_course_selection} courses select kar sakte hain` }), { status: 400 });
      }
      if (selectedCourseIds.length < Math.min(plan.max_course_selection, 1)) {
        return new Response(JSON.stringify({ error: 'Kam se kam 1 course chunna zaroori hai' }), { status: 400 });
      }
      // Verify all courses are in pool
      for (const cId of selectedCourseIds) {
        const inPool: any = await env.DB.prepare(
          `SELECT id FROM PlanContentPool WHERE plan_id = ? AND item_type = 'course' AND item_id = ?`
        ).bind(planId, cId).first();
        if (!inPool) return new Response(JSON.stringify({ error: `Course ${cId} is not in this plan's pool` }), { status: 400 });
      }
    }

    if (plan.batch_access_type === 'user_choice') {
      if (selectedBatchIds.length > plan.max_batch_selection) {
        return new Response(JSON.stringify({ error: `Maximum ${plan.max_batch_selection} batches select kar sakte hain` }), { status: 400 });
      }
    }

    // Get or create a pending subscription record for this pre-selection
    let sub: any = await env.DB.prepare(
      `SELECT id FROM Subscriptions WHERE user_id = ? AND plan_id = ? AND status = 'created' ORDER BY created_at DESC LIMIT 1`
    ).bind(payload.sub, planId).first();

    if (!sub) {
      const subId = generateCustomId('YA-SUB');
      await env.DB.prepare('INSERT INTO Subscriptions (id, user_id, plan_id, status) VALUES (?, ?, ?, ?)').bind(subId, payload.sub, planId, 'created').run();
      sub = { id: subId };
    }

    // Clear old selections for this subscription
    await env.DB.prepare('DELETE FROM UserSubscriptionSelections WHERE subscription_id = ?').bind(sub.id).run();

    // Insert new selections
    const stmts = [
      ...selectedCourseIds.map((cId: string) =>
        env.DB.prepare('INSERT OR IGNORE INTO UserSubscriptionSelections (id, user_id, subscription_id, item_type, item_id) VALUES (?, ?, ?, ?, ?)')
          .bind(generateCustomId('YA-SEL'), payload.sub, sub.id, 'course', cId)
      ),
      ...selectedBatchIds.map((bId: string) =>
        env.DB.prepare('INSERT OR IGNORE INTO UserSubscriptionSelections (id, user_id, subscription_id, item_type, item_id) VALUES (?, ?, ?, ?, ?)')
          .bind(generateCustomId('YA-SEL'), payload.sub, sub.id, 'batch', bId)
      )
    ];
    if (stmts.length > 0) await env.DB.batch(stmts);

    // Calculate total bonus AI credits for this selection
    const bonusCredits = await calcBonusCredits(sub.id, planId, env);

    return new Response(JSON.stringify({
      success: true,
      subscription_id: sub.id,
      selected_courses: selectedCourseIds.length,
      selected_batches: selectedBatchIds.length,
      bonus_ai_credits: bonusCredits,
      total_ai_credits: (plan.ai_credits || 0) === -1 ? -1 : (plan.ai_credits || 0) + bonusCredits
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Subscription.PreSelect', env);
  }
}

// GET /api/subscription/my-selections — Get student's locked selections
async function handleGetMySelections(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const sub: any = await env.DB.prepare(
      `SELECT s.id, s.plan_id FROM Subscriptions s WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1`
    ).bind(payload.sub).first();

    if (!sub) return new Response(JSON.stringify({ selections: { courses: [], batches: [] } }), { status: 200 });

    const { results: courses } = await env.DB.prepare(
      `SELECT uss.item_id, c.title, c.description, c.price_inr
       FROM UserSubscriptionSelections uss JOIN Courses c ON uss.item_id = c.id
       WHERE uss.subscription_id = ? AND uss.item_type = 'course'`
    ).bind(sub.id).all();

    const { results: batches } = await env.DB.prepare(
      `SELECT uss.item_id, b.name, b.start_date, b.status
       FROM UserSubscriptionSelections uss JOIN Batches b ON uss.item_id = b.id
       WHERE uss.subscription_id = ? AND uss.item_type = 'batch'`
    ).bind(sub.id).all();

    return new Response(JSON.stringify({ selections: { courses, batches } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Subscription.MySelections', env);
  }
}

// GET /api/subscription/ai-credits — Get student's current AI credit balance
async function handleGetMyAICredits(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const credits: any = await env.DB.prepare('SELECT * FROM UserAICredits WHERE user_id = ?').bind(payload.sub).first();
    if (!credits) return new Response(JSON.stringify({ credits: null, message: 'No AI credits. Subscribe to a plan with AI.' }), { status: 200 });

    const totalAllowed = credits.base_credits_total === -1 ? -1 : (credits.base_credits_total + credits.bonus_credits_total);
    const totalUsed = (credits.base_credits_used || 0) + (credits.bonus_credits_used || 0);
    const remaining = totalAllowed === -1 ? -1 : Math.max(0, totalAllowed - totalUsed);
    const periodEndDate = credits.period_end ? new Date(credits.period_end) : null;
    const daysUntilReset = periodEndDate ? Math.max(0, Math.ceil((periodEndDate.getTime() - Date.now()) / 86400000)) : null;

    return new Response(JSON.stringify({
      credits: {
        base_total: credits.base_credits_total, base_used: credits.base_credits_used,
        bonus_total: credits.bonus_credits_total, bonus_used: credits.bonus_credits_used,
        total_allowed: totalAllowed, total_used: totalUsed, remaining,
        period: credits.credits_period, period_end: credits.period_end,
        days_until_reset: daysUntilReset,
        rate_limit_per_hour: credits.rate_limit_per_hour, hour_window_used: credits.hour_window_used
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Subscription.AICredits', env);
  }
}

// GET+POST+PUT+DELETE /api/admin/subscription/plans — Admin: Manage plans (with Razorpay auto-creation)
async function handleAdminSubscriptionPlans(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);

    const url = new URL(request.url);
    const planId = url.pathname.split('/').pop();
    const isSpecificPlan = planId && planId !== 'plans';

    // GET — List all plans
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM SubscriptionPlans ORDER BY amount_inr ASC').all();
      return new Response(JSON.stringify({ plans: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // POST — Create plan (auto-creates in Razorpay first, then saves to DB)
    if (request.method === 'POST') {
      const {
        name, interval, interval_count, amount_inr, description,
        course_access_type = 'none', max_course_selection = 0,
        batch_access_type = 'none', max_batch_selection = 0,
        ai_credits = 0, ai_credits_period = 'none', ai_rate_limit_per_hour = 0,
        live_session_access = 0
      } = await request.json() as any;
      if (!name || !interval || !amount_inr) {
        return new Response(JSON.stringify({ error: "name, interval, amount_inr required" }), { status: 400 });
      }

      const razorpayKey = await getSecret(env, 'RAZORPAY_KEY_ID');
      const razorpaySecret = await getSecret(env, 'RAZORPAY_KEY_SECRET');

      let razorpayPlanId: string | null = null;

      // Auto-create plan in Razorpay if credentials are available
      if (razorpayKey && razorpaySecret) {
        // Razorpay interval mapping
        const rzpPeriodMap: Record<string, string> = {
          monthly: 'monthly',
          quarterly: 'monthly', // Razorpay uses monthly with count=3
          yearly: 'yearly'
        };
        const rzpCountMap: Record<string, number> = {
          monthly: 1,
          quarterly: 3,
          yearly: 12
        };

        const rzpBody = {
          period: rzpPeriodMap[interval] || 'monthly',
          interval: interval_count || rzpCountMap[interval] || 1,
          item: {
            name: name,
            description: description || `${name} Subscription Plan`,
            amount: amount_inr, // Already in paise
            currency: 'INR'
          },
          notes: { created_by: 'Yagya LMS Admin Panel', interval_type: interval }
        };

        const rzpRes = await fetch('https://api.razorpay.com/v1/plans', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${razorpayKey}:${razorpaySecret}`),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rzpBody)
        });

        const rzpData = await rzpRes.json() as any;
        if (!rzpRes.ok) {
          console.error('[Admin Plan] Razorpay plan create error:', rzpData);
          return new Response(JSON.stringify({
            error: `Razorpay Plan creation failed: ${rzpData.error?.description || 'Unknown error'}`,
            razorpay_error: rzpData.error
          }), { status: 502, headers: { 'Content-Type': 'application/json' } });
        }

        razorpayPlanId = rzpData.id; // e.g. "plan_XXXXXXXXXX"
        console.log(`[Admin Plan] Razorpay plan created: ${razorpayPlanId}`);
      }

      // Save to D1 with all benefit fields
      const id = generateCustomId('YA-PLN');
      await env.DB.prepare(
        `INSERT INTO SubscriptionPlans (id, name, interval, interval_count, amount_inr, razorpay_plan_id,
         course_access_type, max_course_selection, batch_access_type, max_batch_selection,
         ai_credits, ai_credits_period, ai_rate_limit_per_hour, live_session_access)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, name, interval, interval_count || 1, amount_inr, razorpayPlanId,
             course_access_type, max_course_selection, batch_access_type, max_batch_selection,
             ai_credits, ai_credits_period, ai_rate_limit_per_hour, live_session_access ? 1 : 0).run();

      return new Response(JSON.stringify({
        success: true,
        id,
        razorpay_plan_id: razorpayPlanId,
        message: razorpayPlanId
          ? `Plan created successfully and linked to Razorpay (${razorpayPlanId})`
          : 'Plan saved to DB. Razorpay keys not configured — plan not created in Razorpay.'
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    // PUT — Update plan (name, active status, or manually override razorpay_plan_id)
    if (request.method === 'PUT' && isSpecificPlan) {
      const { name, is_active, razorpay_plan_id } = await request.json() as any;
      await env.DB.prepare(
        'UPDATE SubscriptionPlans SET name = COALESCE(?, name), razorpay_plan_id = COALESCE(?, razorpay_plan_id), is_active = COALESCE(?, is_active) WHERE id = ?'
      ).bind(name || null, razorpay_plan_id || null, is_active !== undefined ? is_active : null, planId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // DELETE — Deactivate plan (soft delete — keeps existing subscriptions intact)
    if (request.method === 'DELETE' && isSpecificPlan) {
      const razorpayKey = await getSecret(env, 'RAZORPAY_KEY_ID');
      const razorpaySecret = await getSecret(env, 'RAZORPAY_KEY_SECRET');

      // 1. Find all active subscriptions for this plan
      const activeSubs = await env.DB.prepare(
        `SELECT id, razorpay_subscription_id FROM Subscriptions WHERE plan_id = ? AND status IN ('active','authenticated','created')`
      ).bind(planId).all();

      const results = activeSubs.results as any[];

      // 2. If Razorpay is configured, cancel all active subscriptions there
      if (razorpayKey && razorpaySecret && results.length > 0) {
        console.log(`[Admin.DeletePlan] Cancelling ${results.length} active subscriptions in Razorpay for plan ${planId}`);
        const auth = 'Basic ' + btoa(`${razorpayKey}:${razorpaySecret}`);
        
        await Promise.all(results.map(async (sub) => {
          if (sub.razorpay_subscription_id) {
            try {
              // Cancel immediately (cancel_at_cycle_end=0)
              await fetch(`https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancel_at_cycle_end: 0 })
              });
            } catch (e) {
              console.error(`[Admin.DeletePlan] Failed to cancel sub ${sub.razorpay_subscription_id}:`, e);
            }
          }
        }));

        // Update DB status for these subs
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE plan_id = ? AND status IN ('active','authenticated','created')`
        ).bind(planId).run();
      }

      // 3. Mark plan as inactive and then try to delete it
      await env.DB.prepare('UPDATE SubscriptionPlans SET is_active = 0 WHERE id = ?').bind(planId).run();
      
      // 4. Try final cleanup (if all subs were cancelled successfully, it will delete the plan now)
      await cleanupPlanIfEmpty(planId as string, env);

      return new Response(JSON.stringify({ 
        success: true, 
        message: results.length > 0 
          ? `Plan deactivated. ${results.length} active subscription(s) were cancelled in Razorpay. Plan will be deleted permanently once all subscriptions are confirmed inactive.`
          : 'Plan deleted permanently.'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    return handleGlobalError(error, 'Admin.SubscriptionPlans', env);
  }
}


// POST /api/payment/webhook — Razorpay Webhook (server-side event processing)
async function handleRazorpayWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const webhookSecret = await getSecret(env, 'RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured in KV');
      return new Response('Webhook not configured', { status: 503 });
    }

    // 1. Verify Razorpay signature
    const razorpaySignature = request.headers.get('X-Razorpay-Signature') || '';
    const rawBody = await request.text();

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== razorpaySignature) {
      console.error('[Webhook] Signature mismatch — possible forgery attempt');
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), { status: 400 });
    }

    // 2. Parse event
    const event = JSON.parse(rawBody) as any;
    const eventType: string = event.event;
    console.log(`[Webhook] Received event: ${eventType}`);

    // 3. Handle events
    if (eventType === 'payment.captured') {
      // One-time course payment
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      if (orderId) {
        await env.DB.prepare(
          'UPDATE Enrollments SET payment_status = "paid", status = "active" WHERE payment_id = ?'
        ).bind(orderId).run();

        // Notify the student
        const enrollment: any = await env.DB.prepare(
          'SELECT e.user_id, c.title FROM Enrollments e JOIN Courses c ON e.course_id = c.id WHERE e.payment_id = ?'
        ).bind(orderId).first();
        if (enrollment) {
          await createNotification(env, enrollment.user_id, 'Payment Successful! 🎉', `"${enrollment.title}" course ka access unlock ho gaya hai.`, 'success');
        }
      }
    }

    else if (eventType === 'subscription.activated') {
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        const periodEnd = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null;
        const periodStart = sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null;
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'active', current_period_start = ?, current_period_end = ? WHERE razorpay_subscription_id = ?`
        ).bind(periodStart, periodEnd, sub.id).run();

        const dbSub: any = await env.DB.prepare(
          `SELECT s.id, s.user_id, s.plan_id, p.ai_credits, p.ai_credits_period, p.ai_rate_limit_per_hour
           FROM Subscriptions s JOIN SubscriptionPlans p ON s.plan_id = p.id
           WHERE s.razorpay_subscription_id = ?`
        ).bind(sub.id).first();

        if (dbSub) {
          // Allocate AI credits based on plan + user selections
          if ((dbSub.ai_credits || 0) !== 0) {
            await allocateAICredits(dbSub.user_id, dbSub.id, dbSub.plan_id, dbSub, env);
          }
          await createNotification(env, dbSub.user_id, 'Subscription Active! ✅', 'Aapka subscription activate ho gaya hai. Apne selected courses access karein!', 'success');
        }
      }
    }


    else if (eventType === 'subscription.charged') {
      // Renewal — update period dates
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        const periodEnd = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null;
        const periodStart = sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null;
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'active', current_period_start = ?, current_period_end = ? WHERE razorpay_subscription_id = ?`
        ).bind(periodStart, periodEnd, sub.id).run();
      }
    }

    else if (eventType === 'subscription.halted') {
      // Payment failed — halt subscription
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'halted' WHERE razorpay_subscription_id = ?`
        ).bind(sub.id).run();

        const dbSub: any = await env.DB.prepare('SELECT user_id FROM Subscriptions WHERE razorpay_subscription_id = ?').bind(sub.id).first();
        if (dbSub) {
          await createNotification(env, dbSub.user_id, 'Subscription Payment Failed ⚠️', 'Aapke subscription ka payment fail ho gaya. Kripya payment update karein.', 'alert');
        }
      }
    }

    else if (eventType === 'subscription.cancelled') {
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'cancelled' WHERE razorpay_subscription_id = ?`
        ).bind(sub.id).run();
      }
    }

    else if (eventType === 'subscription.completed') {
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'completed' WHERE razorpay_subscription_id = ?`
        ).bind(sub.id).run();
      }
    }

    // Cleanup logic: After any cancellation or completion, check if we can delete an inactive plan
    const subEntity = event.payload?.subscription?.entity;
    if (subEntity?.id && ['subscription.cancelled', 'subscription.completed', 'subscription.expired'].includes(eventType)) {
      const dbSub: any = await env.DB.prepare('SELECT plan_id FROM Subscriptions WHERE razorpay_subscription_id = ?').bind(subEntity.id).first();
      if (dbSub?.plan_id) {
        await cleanupPlanIfEmpty(dbSub.plan_id, env);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    // Return 200 to Razorpay even on internal error (prevents retries for our own bugs)
    return new Response(JSON.stringify({ received: true, warning: "Internal processing error" }), { status: 200 });
  }
}

async function cleanupPlanIfEmpty(planId: string, env: Env) {
  try {
    // Check if plan is inactive (marked for deletion/cleanup)
    const plan: any = await env.DB.prepare('SELECT is_active FROM SubscriptionPlans WHERE id = ?').bind(planId).first();
    if (!plan || plan.is_active === 1) return;

    // Check for any remaining active subscribers
    const activeSubCount: any = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM Subscriptions WHERE plan_id = ? AND status IN ('active','authenticated','created')`
    ).bind(planId).first();

    if (!activeSubCount || activeSubCount.count === 0) {
      console.log(`[Cleanup] No active subscribers left for inactive plan ${planId}. Deleting permanently.`);
      await env.DB.prepare('DELETE FROM PlanContentPool WHERE plan_id = ?').bind(planId).run();
      await env.DB.prepare('DELETE FROM SubscriptionPlans WHERE id = ?').bind(planId).run();
    }
  } catch (e) {
    console.error(`[Cleanup] Error cleaning up plan ${planId}:`, e);
  }
}

async function handleSeed(request: Request, env: Env): Promise<Response> {
  try {
    const teacherId = crypto.randomUUID();
    await env.DB.prepare('INSERT OR IGNORE INTO Users (id, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)')
      .bind(teacherId, 'teacher@example.com', 'hash', 'salt', 'teacher').run();

    const courseId = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO Courses (id, title, description, teacher_id, price) VALUES (?, ?, ?, ?, ?)')
      .bind(courseId, 'Advanced Cloudflare Workers', 'Learn how to build edge applications.', teacherId, 4900).run();

    return new Response(JSON.stringify({ message: "Database seeded with a test course." }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleGlobalError(error, 'Dev.Seed', env);
  }
}

let _dbInitialized = false;

async function initDbAndSeed(env: Env) {
  if (_dbInitialized) return;

  try {
    // 1. Auto-Create Tables (Auto Migration)
    const schemaQueries = [
      `CREATE TABLE IF NOT EXISTS OTPs (email TEXT PRIMARY KEY, otp TEXT NOT NULL, expires_at DATETIME NOT NULL);`,
      `CREATE TABLE IF NOT EXISTS Users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT CHECK(role IN ('admin', 'teacher', 'student')) NOT NULL DEFAULT 'student', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS Categories (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS Courses (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, category_id TEXT, teacher_id TEXT NOT NULL, price INTEGER NOT NULL DEFAULT 0, price_inr INTEGER DEFAULT 0, price_usd INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE SET NULL, FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Lessons (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, chapter_title TEXT DEFAULT 'General', title TEXT NOT NULL, type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording')) NOT NULL, content_url TEXT, order_index INTEGER NOT NULL, is_free INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, text_content TEXT, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Enrollments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, course_id TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, status TEXT CHECK(status IN ('active', 'revoked', 'completed')) NOT NULL DEFAULT 'active', payment_id TEXT, payment_status TEXT DEFAULT 'pending', purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS LiveSessions (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, teacher_id TEXT NOT NULL, title TEXT, start_time DATETIME NOT NULL, rtc_room_id TEXT NOT NULL UNIQUE, status TEXT CHECK(status IN ('scheduled', 'live', 'ended')) DEFAULT 'scheduled', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE, FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS LiveSignaling (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL, data TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Attendance (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, joined_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Exams (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL, passing_score INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS CompletedLessons (user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, lesson_id), FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (lesson_id) REFERENCES Lessons(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'info', is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS FormTemplates (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT, fields_json TEXT NOT NULL, seo_json TEXT, theme_json TEXT, confirmation_email_body TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS FormSubmissions (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT, email TEXT, data_json TEXT NOT NULL, status TEXT DEFAULT 'pending', ai_analysis TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (template_id) REFERENCES FormTemplates(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS EmailDrafts (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, is_html INTEGER DEFAULT 1, status TEXT CHECK(status IN ('draft', 'sent', 'cancelled')) DEFAULT 'draft', admin_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, sent_at DATETIME, FOREIGN KEY (admin_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);`,
      `CREATE INDEX IF NOT EXISTS idx_courses_teacher ON Courses(teacher_id);`,
      `CREATE INDEX IF NOT EXISTS idx_lessons_course ON Lessons(course_id);`,
      `CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON Enrollments(user_id, course_id);`,
      `CREATE INDEX IF NOT EXISTS idx_livesessions_course ON LiveSessions(course_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON FormTemplates(slug);`,
      `CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON FormSubmissions(template_id);`,
      `CREATE INDEX IF NOT EXISTS idx_email_drafts_admin ON EmailDrafts(admin_id);`,
      `CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON EmailDrafts(status);`,
      `CREATE TABLE IF NOT EXISTS Batches (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, name TEXT NOT NULL, start_date DATETIME, end_date DATETIME, status TEXT CHECK(status IN ('upcoming', 'ongoing', 'completed')) DEFAULT 'upcoming', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_batches_course ON Batches(course_id);`,
      `CREATE TABLE IF NOT EXISTS ChatHistory (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_id TEXT, role TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE INDEX IF NOT EXISTS idx_chat_history_user ON ChatHistory(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_chat_history_session ON ChatHistory(session_id);`,
      `CREATE TABLE IF NOT EXISTS SubscriptionPlans (id TEXT PRIMARY KEY, name TEXT NOT NULL, interval TEXT CHECK(interval IN ('monthly','quarterly','yearly')) NOT NULL, interval_count INTEGER DEFAULT 1, amount_inr INTEGER NOT NULL, razorpay_plan_id TEXT, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS Subscriptions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_id TEXT NOT NULL, razorpay_subscription_id TEXT UNIQUE, status TEXT CHECK(status IN ('created','authenticated','active','pending','halted','cancelled','completed','expired')) DEFAULT 'created', current_period_start DATETIME, current_period_end DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (plan_id) REFERENCES SubscriptionPlans(id));`,
      `CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON Subscriptions(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp ON Subscriptions(razorpay_subscription_id);`,
      `CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON SubscriptionPlans(is_active);`,
      `CREATE TABLE IF NOT EXISTS PlanContentPool (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, item_type TEXT CHECK(item_type IN ('course','batch')) NOT NULL, item_id TEXT NOT NULL, access_mode TEXT CHECK(access_mode IN ('static','user_choice')) NOT NULL, bonus_ai_credits INTEGER DEFAULT 0, UNIQUE(plan_id, item_type, item_id), FOREIGN KEY (plan_id) REFERENCES SubscriptionPlans(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS UserSubscriptionSelections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subscription_id TEXT NOT NULL, item_type TEXT CHECK(item_type IN ('course','batch')) NOT NULL, item_id TEXT NOT NULL, selected_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(subscription_id, item_type, item_id), FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (subscription_id) REFERENCES Subscriptions(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS UserAICredits (user_id TEXT PRIMARY KEY, subscription_id TEXT, base_credits_total INTEGER DEFAULT 0, base_credits_used INTEGER DEFAULT 0, bonus_credits_total INTEGER DEFAULT 0, bonus_credits_used INTEGER DEFAULT 0, credits_period TEXT DEFAULT 'none', period_start DATETIME, period_end DATETIME, hour_window_start DATETIME, hour_window_used INTEGER DEFAULT 0, rate_limit_per_hour INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_plan_content_pool_plan ON PlanContentPool(plan_id);`,
      `CREATE INDEX IF NOT EXISTS idx_user_sub_selections_sub ON UserSubscriptionSelections(subscription_id);`,
      `CREATE INDEX IF NOT EXISTS idx_user_sub_selections_user ON UserSubscriptionSelections(user_id);`
    ];

    // Attempt to add confirmation_email_body column to FormTemplates if it doesn't exist
    try {
      await env.DB.prepare(`ALTER TABLE FormTemplates ADD COLUMN confirmation_email_body TEXT;`).run();
    } catch (e) { /* Column already exists */ }

    // Attempt to add theme_json column to FormTemplates if it doesn't exist
    try { await env.DB.prepare(`ALTER TABLE FormTemplates ADD COLUMN theme_json TEXT;`).run(); } catch(e){}

    // Auto-enrollment columns for FormTemplates
    try { await env.DB.prepare(`ALTER TABLE FormTemplates ADD COLUMN linked_course_id TEXT;`).run(); } catch(e){}
    try { await env.DB.prepare(`ALTER TABLE FormTemplates ADD COLUMN linked_batch_id TEXT;`).run(); } catch(e){}
    try { await env.DB.prepare(`ALTER TABLE FormTemplates ADD COLUMN auto_enroll INTEGER DEFAULT 0;`).run(); } catch(e){}
    try { await env.DB.prepare(`ALTER TABLE FormTemplates ADD COLUMN eligibility_criteria TEXT;`).run(); } catch(e){}

    // Attempt to add category_id column if it didn't exist
    try {
      await env.DB.prepare(`ALTER TABLE Courses ADD COLUMN category_id TEXT;`).run();
    } catch (e) { /* Column already exists */ }

    // Attempt to add title column to LiveSessions
    try {
      await env.DB.prepare(`ALTER TABLE LiveSessions ADD COLUMN title TEXT;`).run();
    } catch (e) { /* Column already exists */ }

    // Attempt to add progress column if the table already existed but without the new column
    try {
      await env.DB.prepare(`ALTER TABLE Enrollments ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;`).run();
    } catch (e) { /* Column already exists, safe to ignore */ }

    // Attempt to add batch_id to Enrollments
    try {
      await env.DB.prepare(`ALTER TABLE Enrollments ADD COLUMN batch_id TEXT;`).run();
    } catch (e) { /* Column already exists */ }

    // Attempt to add batch_id to LiveSessions
    try {
      await env.DB.prepare(`ALTER TABLE LiveSessions ADD COLUMN batch_id TEXT;`).run();
    } catch (e) { /* Column already exists */ }

    // Attempt to add chapter_title column to Lessons if it didn't exist
    try {
      await env.DB.prepare(`ALTER TABLE Lessons ADD COLUMN chapter_title TEXT DEFAULT 'General';`).run();
    } catch (e) { /* Column already exists, safe to ignore */ }

    // Attempt to add text_content column to Lessons if it didn't exist
    try {
      await env.DB.prepare(`ALTER TABLE Lessons ADD COLUMN text_content TEXT;`).run();
    } catch (e) { /* Column already exists, safe to ignore */ }

    // Attempt to add is_free column to Lessons
    try {
      await env.DB.prepare(`ALTER TABLE Lessons ADD COLUMN is_free INTEGER DEFAULT 0;`).run();
    } catch (e) { /* Column already exists, safe to ignore */ }

    // Attempt to add session_id column to ChatHistory
    try {
      await env.DB.prepare(`ALTER TABLE ChatHistory ADD COLUMN session_id TEXT;`).run();
    } catch (e) { /* Column already exists, safe to ignore */ }

    // Attempt to add payment columns to Enrollments
    try {
      await env.DB.prepare(`ALTER TABLE Enrollments ADD COLUMN payment_id TEXT;`).run();
    } catch (e) { /* Column already exists */ }
    try {
      await env.DB.prepare(`ALTER TABLE Enrollments ADD COLUMN payment_status TEXT DEFAULT 'pending';`).run();
    } catch (e) { /* Column already exists */ }

    // New SubscriptionPlans benefit columns
    const subPlanCols = [
      `ALTER TABLE SubscriptionPlans ADD COLUMN course_access_type TEXT DEFAULT 'none';`,
      `ALTER TABLE SubscriptionPlans ADD COLUMN max_course_selection INTEGER DEFAULT 0;`,
      `ALTER TABLE SubscriptionPlans ADD COLUMN batch_access_type TEXT DEFAULT 'none';`,
      `ALTER TABLE SubscriptionPlans ADD COLUMN max_batch_selection INTEGER DEFAULT 0;`,
      `ALTER TABLE SubscriptionPlans ADD COLUMN ai_credits INTEGER DEFAULT 0;`,
      `ALTER TABLE SubscriptionPlans ADD COLUMN ai_credits_period TEXT DEFAULT 'none';`,
      `ALTER TABLE SubscriptionPlans ADD COLUMN ai_rate_limit_per_hour INTEGER DEFAULT 0;`,
      `ALTER TABLE SubscriptionPlans ADD COLUMN live_session_access INTEGER DEFAULT 0;`
    ];
    for (const q of subPlanCols) {
      try { await env.DB.prepare(q).run(); } catch (e) { /* Column already exists */ }
    }

    // Attempt to add profile columns to Users table
    const userColumns = [
      'full_name', 'phone', 'district', 'state', 'country', 
      'birth_date', 'father_name', 'mother_name', 'grand_father_name', 
      'pincode', 'gender', 'bio', 'birth_place'
    ];
    for (const col of userColumns) {
      try {
        await env.DB.prepare(`ALTER TABLE Users ADD COLUMN ${col} TEXT;`).run();
      } catch (e) { /* Column already exists */ }
    }

    // --- Powerful Auto-Migration for Courses (Multi-Currency) ---
    const courseColumns = [
      { name: 'price_inr', type: 'INTEGER DEFAULT 0' },
      { name: 'price_usd', type: 'INTEGER DEFAULT 0' },
      { name: 'category_id', type: 'TEXT' }
    ];
    for (const col of courseColumns) {
      try {
        await env.DB.prepare(`ALTER TABLE Courses ADD COLUMN ${col.name} ${col.type};`).run();
      } catch (e) { /* Column already exists */ }
    }

    // Execute schema queries
    await env.DB.batch(schemaQueries.map((q) => env.DB.prepare(q)));

    // 2. Auto-Seeding (if no users currently exist)
    const userCheck: any = await env.DB.prepare('SELECT COUNT(*) as count FROM Users').first();
    if (userCheck && userCheck.count === 0) {
      console.log("[Auto-Migration] No users found. Seeding database...");
      const salt = await generateSalt();
      const passHash = await hashPassword('password123', salt);
      
      const adminId = generateStudentId();
      const teacherId = generateStudentId();
      const studentId = generateStudentId();

      await env.DB.batch([
        env.DB.prepare('INSERT INTO Users (id, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)').bind(adminId, 'admin@edtech.com', passHash, salt, 'admin'),
        env.DB.prepare('INSERT INTO Users (id, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)').bind(teacherId, 'teacher@edtech.com', passHash, salt, 'teacher'),
        env.DB.prepare('INSERT INTO Users (id, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)').bind(studentId, 'student@edtech.com', passHash, salt, 'student')
      ]);

      const courseId = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO Courses (id, title, description, teacher_id, price) VALUES (?, ?, ?, ?, ?)')
        .bind(courseId, 'Advanced Cloudflare Workers', 'Learn edge computing fundamentals & build scalable logic.', teacherId, 4900).run();

      // Seed Admission Form
      const formId = crypto.randomUUID();
      const fields = [
        { name: 'student_name', label: 'पूरा नाम', type: 'text', required: true },
        { name: 'email', label: 'ईमेल पता', type: 'email', required: true },
        { name: 'course_choice', label: 'पाठ्यक्रम का चुनाव', type: 'select', options: ['एडवांस योग', 'वैदिक दर्शन', 'पंडित कर्मकांड'], required: true },
        { name: 'reason', label: 'प्रवेश का कारण', type: 'textarea', required: true }
      ];
      const seo = { title: "प्रवेश फॉर्म | यज्ञ आश्रम", description: "सभी पाठ्यक्रमों के लिए ऑनलाइन प्रवेश फॉर्म भरें।" };
      await env.DB.prepare('INSERT INTO FormTemplates (id, slug, title, description, fields_json, seo_json) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(formId, 'admission-form', 'पाठ्यक्रम प्रवेश फॉर्म (Course Admission)', 'सभी पाठ्यक्रमों के लिए ऑनलाइन आवेदन करें।', JSON.stringify(fields), JSON.stringify(seo)).run();
    }

    _dbInitialized = true;
  } catch (error) {
    console.error("Auto-Migration / Seed Error:", error);
  }
}

// --- AI Gateway Integration ---

export function sanitizeJson(text: string): string {
  if (!text) return "{}";
  // Replace smart/curly quotes with standard quotes
  let sanitized = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  sanitized = sanitized.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = sanitized.indexOf("{");
  const lastBrace = sanitized.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    sanitized = sanitized.substring(firstBrace, lastBrace + 1);
  }
  return sanitized;
}

export async function generateAIContent(messages: any[], env: Env, forceJson: boolean = false): Promise<string> {
  const accountId = await getSecret(env, 'CLOUDFLARE_ACCOUNT_ID');
  const cfToken = await getSecret(env, 'CLOUDFLARE_API_TOKEN');
  const aigToken = await getSecret(env, 'CF_AIG_TOKEN') || cfToken;
  const gatewayId = await getSecret(env, 'AI_GATEWAY_ID') || "vertexai";

  const model = "dynamic/r";

  if (!accountId || !aigToken || aigToken === "null") {
    throw new Error("AI Setup Incomplete: Missing Cloudflare Credentials.");
  }

  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat/chat/completions`;

  const body: any = {
    model: model,
    messages: messages,
    max_tokens: 4000
  };
  if (forceJson) body.response_format = { type: "json_object" };

  try {
    const gRes = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'cf-aig-authorization': `Bearer ${aigToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    let resText = await gRes.text();

    if (!gRes.ok) {
      // Fallback: If dynamic/r fails, try a specific stable model directly
      console.warn(`Gateway dynamic/r failed (Status: ${gRes.status}). Retrying with explicit model...`);
      body.model = "@cf/meta/llama-3-8b-instruct"; // Fallback to older Llama 3 if 3.1 fails
      const retryRes = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'cf-aig-authorization': `Bearer ${aigToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      resText = await retryRes.text();
      if (!retryRes.ok) throw new Error(`AI Gateway retry failed: ${resText}`);
    }

    if (!resText || resText.trim() === "") {
      throw new Error(`Gateway returned EMPTY response for ${model}`);
    }

    try {
      const aiResponse = JSON.parse(resText);
      // Handle standard OpenAI-like response
      if (aiResponse.choices?.[0]?.message?.content) {
        let content = aiResponse.choices[0].message.content;
        return forceJson ? sanitizeJson(content) : content;
      }
      // Handle direct string responses if gateway simplifies it
      if (typeof aiResponse === 'string') return forceJson ? sanitizeJson(aiResponse) : aiResponse;
      
      throw new Error("JSON parsed but structure unknown");
    } catch (parseError) {
      // If parsing fails but we have text, and we're not forced into JSON, return as is
      if (!forceJson && resText) return resText;
      throw new Error(`Gateway returned non-JSON structure for ${model}: ${resText.substring(0, 100)}`);
    }
  } catch (e: any) {
    throw new Error(`AI Gateway Request Failed: ${e.message}`);
  }
}

async function fetchAIStream(messages: any[], env: Env): Promise<Response> {
  const accountId = await getSecret(env, 'CLOUDFLARE_ACCOUNT_ID');
  const cfToken = await getSecret(env, 'CLOUDFLARE_API_TOKEN');
  const aigToken = await getSecret(env, 'CF_AIG_TOKEN') || cfToken;
  const gatewayId = await getSecret(env, 'AI_GATEWAY_ID') || "vertexai";

  const model = "dynamic/r";
  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat/chat/completions`;

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'cf-aig-authorization': `Bearer ${aigToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      stream: true,
      max_tokens: 4000,
      messages: messages
    })
  });

  return new Response(response.body, { headers: { 'Content-Type': 'text/event-stream' } });
}

// --- AI Assistant Helpers ---

async function getAIGlobalContext(env: Env, role: string, userId: string | null, prompt: string, lessonId?: string) {
  try {
    let context = "";
    if (role === 'admin') {
      const stats = await env.DB.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM Users) as user_count,
          (SELECT COUNT(*) FROM Courses) as course_count,
          (SELECT COUNT(*) FROM Enrollments) as enroll_count
      `).first() as any;

      const recentEnrollments = await env.DB.prepare(`
        SELECT u.email, c.title as course, e.progress, e.purchased_at
        FROM Enrollments e 
        JOIN Users u ON e.user_id = u.id 
        JOIN Courses c ON e.course_id = c.id
        ORDER BY e.purchased_at DESC LIMIT 5
      `).all();

      const courseList = await env.DB.prepare('SELECT id, title FROM Courses').all();

      context = `
[ADMIN CONTEXT]
Stats: ${stats.user_count} users, ${stats.course_count} courses, ${stats.enroll_count} enrollments.
Recent Activity: ${JSON.stringify(recentEnrollments.results)}
Courses: ${JSON.stringify(courseList.results)}

Actions:
1. create_course: { title, description, price, category_id? }
2. edit_course: { id, title?, description?, price?, category_id? }
3. delete_course: { id }
4. add_lesson: { course_id, chapter_title, title, type, content_url, text_content }
5. edit_lesson: { lesson_id, title?, chapter_title?, type?, content_url?, text_content? }
6. delete_lesson: { lesson_id }
7. add_student: { email, password, full_name? }
8. edit_student: { email, full_name?, role? }
9. delete_student: { email }
10. assign_course: { email, course_id, batch_id? }
11. delete_enrollment: { email, course_id }
12. get_student_details: { email }
13. query_users: { filter: 'all' | 'enrolled_all' | 'enrolled_course' | 'subscribers', course_id?: string }
14. bulk_draft_email: { recipients: string[], subject: string, body: string, isHtml: boolean }
15. create_form_and_draft_email: { form_title, form_description, form_fields_json, to, subject, email_body, theme?, confirmation_email_body? }
16. get_detailed_stats: {}
17. read_lesson: { lesson_id }
18. send_email: { to, subject, body, isHtml }
`;
    } else if (userId) {
      const user = await env.DB.prepare('SELECT * FROM Users WHERE id = ?').bind(userId).first() as any;
      const enrollments = await env.DB.prepare(`
        SELECT c.id as course_id, c.title, e.progress, e.status
        FROM Enrollments e 
        JOIN Courses c ON e.course_id = c.id 
        WHERE e.user_id = ?
      `).bind(userId).all();
      
      const library = await env.DB.prepare('SELECT id, title, price FROM Courses').all();
      const recentNotifications = await env.DB.prepare('SELECT title, message, created_at FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 3').bind(userId).all();
      
      const isProfileIncomplete = !user?.full_name || !user?.phone || !user?.birth_date || !user?.father_name || !user?.mother_name || !user?.grand_father_name;

      context = `[STUDENT PROFILE] 
Email: ${user?.email}
Name: ${user?.full_name || 'N/A'}
Phone: ${user?.phone || 'N/A'}
Birth Date: ${user?.birth_date || 'N/A'}
Father: ${user?.father_name || 'N/A'}
Mother: ${user?.mother_name || 'N/A'}
Grandfather: ${user?.grand_father_name || 'N/A'}
Location: ${user?.district || 'N/A'}, ${user?.state || 'N/A'}, ${user?.country || 'IN'} (${user?.pincode || 'N/A'})
Bio: ${user?.bio || 'N/A'}
Joined: ${user?.created_at}
[PROFILE STATUS] ${isProfileIncomplete ? 'INCOMPLETE - Please ask the user to fill their profile details.' : 'COMPLETE'}
[STUDENT ENROLLMENTS] ${JSON.stringify(enrollments.results)}
[PLATFORM CATALOG] ${JSON.stringify(library.results)}
[RECENT NOTIFICATIONS] ${JSON.stringify(recentNotifications.results)}`;

      // Deep lesson titles for enrolled courses
      for (const enrolled of (enrollments.results as any[] || [])) {
        const lessons = await env.DB.prepare('SELECT id, title, type FROM Lessons WHERE course_id = ?').bind(enrolled.course_id).all();
        context += `\n[LESSONS: ${enrolled.title}] ${JSON.stringify(lessons.results)}`;
      }
    }

    // Direct Lesson Context if provided
    if (lessonId) {
      const l = await env.DB.prepare('SELECT title, type, text_content FROM Lessons WHERE id = ?').bind(lessonId).first() as any;
      if (l && l.text_content) {
        context += `\n[SPECIFIC LESSON CONTENT] Lesson "${l.title}" Content: ${l.text_content.substring(0, 4000)}`;
      }
    }

    // Proactive Content Fetch: If prompt mentions a lesson title, pull its content (backup)
    if (!lessonId) {
      const mentionCheck = await env.DB.prepare('SELECT id, title, type, text_content FROM Lessons WHERE type = "article" AND text_content IS NOT NULL').all();
      for (const l of (mentionCheck.results as any[] || [])) {
        if (prompt.includes(l.title)) {
          context += `\n[CONTENT] Lesson "${l.title}" Content: ${l.text_content.substring(0, 2000)}`;
        }
      }
    }

    return context;
  } catch (e) {
    return "";
  }
}

async function sendEmailViaBinding(to: string, subject: string, body: string, env: Env, isHtml: boolean = false): Promise<boolean> {
  try {
    await env.SEND_EMAIL.send({
      from: "Yagya Ashram Family <om@yagyaashram.com>",
      to: to,
      subject: subject,
      [isHtml ? 'html' : 'text']: body,
    });
    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

async function handleAdminSendEmail(request: Request, env: Env): Promise<Response> {
  try {
    const adminId = await requireAdmin(request, env);
    const { to, subject, body, isHtml } = await request.json() as any;
    
    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "To, Subject, and Body are required" }), { status: 400 });
    }

    const success = await sendEmailViaBinding(to, subject, body, env, isHtml);
    if (success) {
      return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
    }
  } catch (error) {
    return handleGlobalError(error, 'Admin.SendEmail', env);
  }
}

async function handleGetEmailDrafts(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const drafts = await env.DB.prepare('SELECT * FROM EmailDrafts ORDER BY created_at DESC').all();
    return new Response(JSON.stringify(drafts.results), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Admin.GetEmailDrafts', env);
  }
}

async function handleSaveEmailDraft(request: Request, env: Env): Promise<Response> {
  try {
    const adminId = await requireAdmin(request, env);
    const { recipient, subject, body, is_html } = await request.json() as any;
    
    if (!recipient || !subject || !body) {
      return new Response(JSON.stringify({ error: "Recipient, Subject, and Body are required" }), { status: 400 });
    }

    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO EmailDrafts (id, recipient, subject, body, is_html, admin_id) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, recipient, subject, body, is_html !== undefined ? (is_html ? 1 : 0) : 1, adminId).run();

    return new Response(JSON.stringify({ success: true, id }), { status: 201 });
  } catch (error) {
    return handleGlobalError(error, 'Admin.SaveEmailDraft', env);
  }
}

async function handleUpdateEmailDraft(request: Request, env: Env, id: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const bodyArgs = await request.json() as any;
    
    // Convert undefined to null for D1 binding
    const recipient = bodyArgs.recipient !== undefined ? bodyArgs.recipient : null;
    const subject = bodyArgs.subject !== undefined ? bodyArgs.subject : null;
    const body = bodyArgs.body !== undefined ? bodyArgs.body : null;
    const is_html = bodyArgs.is_html !== undefined ? (bodyArgs.is_html ? 1 : 0) : null;
    const status = bodyArgs.status !== undefined ? bodyArgs.status : null;
    
    await env.DB.prepare('UPDATE EmailDrafts SET recipient = COALESCE(?, recipient), subject = COALESCE(?, subject), body = COALESCE(?, body), is_html = COALESCE(?, is_html), status = COALESCE(?, status) WHERE id = ?')
      .bind(recipient, subject, body, is_html, status, id).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return handleGlobalError(error, 'Admin.UpdateEmailDraft', env);
  }
}

async function handleDeleteEmailDraft(request: Request, env: Env, id: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    await env.DB.prepare('DELETE FROM EmailDrafts WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return handleGlobalError(error, 'Admin.DeleteEmailDraft', env);
  }
}

async function replaceDynamicVariables(text: string, recipientEmail: string, env: Env): Promise<string> {
  if (!text) return text;
  
  const user = await env.DB.prepare('SELECT * FROM Users WHERE email = ?').bind(recipientEmail).first() as any;
  if (!user) return text;

  const enrollment = await env.DB.prepare(`
    SELECT e.*, c.title as course_title, c.price as course_price
    FROM Enrollments e
    JOIN Courses c ON e.course_id = c.id
    WHERE e.user_id = ?
    ORDER BY e.purchased_at DESC LIMIT 1
  `).bind(user.id).first() as any;

  let result = text;

  const variables: Record<string, string> = {
    '{{Users.name}}': user.full_name || user.name || 'Student',
    '{{Users.email}}': user.email || '',
    '{{Users.role}}': user.role || 'student',
    '{{Courses.title}}': enrollment ? enrollment.course_title : 'Our Course',
    '{{Courses.price}}': enrollment ? enrollment.course_price?.toString() : '',
    '{{Enrollments.progress}}': enrollment ? enrollment.progress?.toString() : '0'
  };

  for (const [key, value] of Object.entries(variables)) {
    // Escape specific regex characters in key
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    result = result.replace(new RegExp(escapedKey, 'gi'), value);
  }

  const conditionMap: Record<string, boolean> = {
    'Users.isAdmin': user.role === 'admin',
    'Enrollments.isComplete': enrollment ? enrollment.progress >= 100 : false,
    'Enrollments.hasStarted': enrollment ? enrollment.progress > 0 : false,
    'Enrollments.exists': !!enrollment
  };

  for (const [cond, isTrue] of Object.entries(conditionMap)) {
    const escapedCond = cond.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\{\\{#if\\s+${escapedCond}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, 'gi');
    result = result.replace(regex, (match, innerText) => {
      return isTrue ? innerText : '';
    });
  }

  return result;
}

async function handleSendDraftedEmail(request: Request, env: Env, id: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const draft = await env.DB.prepare('SELECT * FROM EmailDrafts WHERE id = ?').bind(id).first() as any;
    
    if (!draft) return new Response(JSON.stringify({ error: "Draft not found" }), { status: 404 });
    if (draft.status === 'sent') return new Response(JSON.stringify({ error: "Draft already sent" }), { status: 400 });

    // Split recipients by comma and trim whitespace
    const recipientList = draft.recipient.split(',').map((r: string) => r.trim()).filter(Boolean);
    
    let allSuccessful = true;
    for (const recipient of recipientList) {
      const pSubject = await replaceDynamicVariables(draft.subject, recipient, env);
      const pBody = await replaceDynamicVariables(draft.body, recipient, env);
      
      const success = await sendEmailViaBinding(recipient, pSubject, pBody, env, draft.is_html === 1);
      if (!success) {
        allSuccessful = false;
        console.error(`Failed to send email to ${recipient}`);
      }
    }
    
    if (allSuccessful) {
      await env.DB.prepare('UPDATE EmailDrafts SET status = "sent", sent_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: "One or more email deliveries failed" }), { status: 500 });
    }
  } catch (error) {
    return handleGlobalError(error, 'Admin.SendDraftedEmail', env);
  }
}

async function executeAIAction(action: any, env: Env, adminId: string, reqUrl: string) {
  const { type, params } = action;
  try {
    switch (type) {
      case 'create_course': {
        if (!params.title) return { success: false, message: "Missing required parameter: title" };
        const id = generateCustomId('YA-CRS');
        await env.DB.prepare('INSERT INTO Courses (id, title, description, teacher_id, price, price_inr, price_usd, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, params.title, params.description ?? '', adminId, params.price_inr ?? 0, params.price_inr ?? 0, params.price_usd ?? 0, params.category_id ?? null).run();
        return { success: true, message: `Course "${params.title}" created successfully with ID ${id}. Prices: ₹${params.price_inr}, $${params.price_usd}.` };
      }
      case 'edit_course': {
        if (!params.id) return { success: false, message: "Missing required parameter: id" };
        await env.DB.prepare('UPDATE Courses SET title = COALESCE(?, title), description = COALESCE(?, description), price = COALESCE(?, price), price_inr = COALESCE(?, price_inr), price_usd = COALESCE(?, price_usd), category_id = COALESCE(?, category_id) WHERE id = ?')
          .bind(params.title ?? null, params.description ?? null, params.price_inr ?? null, params.price_inr ?? null, params.price_usd ?? null, params.category_id ?? null, params.id).run();
        return { success: true, message: `Course ${params.id} updated successfully.` };
      }
      case 'delete_course': {
        if (!params.id) return { success: false, message: "Missing required parameter: id" };
        await env.DB.prepare('DELETE FROM Courses WHERE id = ?').bind(params.id).run();
        return { success: true, message: `Course ${params.id} deleted successfully.` };
      }
      case 'add_lesson': {
        if (!params.course_id || !params.title || !params.type) return { success: false, message: "Missing required parameters for lesson." };
        const id = generateCustomId('YA-LSN');
        await env.DB.prepare('INSERT INTO Lessons (id, course_id, chapter_title, title, type, content_url, text_content, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, params.course_id, params.chapter_title ?? 'General', params.title, params.type, params.content_url ?? '', params.text_content ?? '', 0).run();
        return { success: true, message: `Lesson "${params.title}" added to course ${params.course_id} successfully.` };
      }
      case 'edit_lesson': {
        if (!params.lesson_id) return { success: false, message: "Missing required parameter: lesson_id" };
        await env.DB.prepare('UPDATE Lessons SET title = COALESCE(?, title), chapter_title = COALESCE(?, chapter_title), type = COALESCE(?, type), content_url = COALESCE(?, content_url), text_content = COALESCE(?, text_content) WHERE id = ?')
          .bind(params.title ?? null, params.chapter_title ?? null, params.type ?? null, params.content_url ?? null, params.text_content ?? null, params.lesson_id).run();
        return { success: true, message: `Lesson ${params.lesson_id} updated successfully.` };
      }
      case 'delete_lesson': {
        if (!params.lesson_id) return { success: false, message: "Missing required parameter: lesson_id" };
        await env.DB.prepare('DELETE FROM Lessons WHERE id = ?').bind(params.lesson_id).run();
        return { success: true, message: `Lesson ${params.lesson_id} deleted successfully.` };
      }
      case 'add_student': {
        if (!params.email) return { success: false, message: "Missing required parameter: email" };
        const salt = await generateSalt();
        const hash = await hashPassword(params.password ?? 'password123', salt);
        const id = generateStudentId();
        await env.DB.prepare('INSERT INTO Users (id, email, password_hash, salt, role, full_name) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, params.email, hash, salt, 'student', params.full_name ?? 'New Student').run();
        return { success: true, message: `Student ${params.email} added successfully with ID ${id}.` };
      }
      case 'edit_student': {
        if (!params.email) return { success: false, message: "Missing required parameter: email" };
        await env.DB.prepare('UPDATE Users SET full_name = COALESCE(?, full_name), role = COALESCE(?, role) WHERE email = ?')
          .bind(params.full_name ?? null, params.role ?? null, params.email).run();
        return { success: true, message: `Student ${params.email} updated successfully.` };
      }
      case 'delete_student': {
        if (!params.email) return { success: false, message: "Missing required parameter: email" };
        await env.DB.prepare('DELETE FROM Users WHERE email = ?').bind(params.email).run();
        return { success: true, message: `Student ${params.email} deleted successfully.` };
      }
      case 'assign_course': {
        if (!params.email || !params.course_id) return { success: false, message: "Missing required parameters: email or course_id" };
        const user = await env.DB.prepare('SELECT id FROM Users WHERE email = ?').bind(params.email).first() as any;
        if (!user) return { success: false, message: "User not found." };
        const id = generateCustomId('YA-ENR');
        await env.DB.prepare('INSERT INTO Enrollments (id, user_id, course_id, batch_id) VALUES (?, ?, ?, ?)')
          .bind(id, user.id, params.course_id, params.batch_id ?? null).run();
        return { success: true, message: `Student ${params.email} enrolled in course ${params.course_id}.` };
      }
      case 'delete_enrollment': {
        if (!params.email || !params.course_id) return { success: false, message: "Missing required parameters: email or course_id" };
        const user = await env.DB.prepare('SELECT id FROM Users WHERE email = ?').bind(params.email).first() as any;
        if (!user) return { success: false, message: "User not found." };
        await env.DB.prepare('DELETE FROM Enrollments WHERE user_id = ? AND course_id = ?').bind(user.id, params.course_id).run();
        return { success: true, message: `Enrollment for ${params.email} in course ${params.course_id} deleted.` };
      }
      case 'get_detailed_stats': {
        const users = await env.DB.prepare('SELECT role, COUNT(*) as count FROM Users GROUP BY role').all();
        const enrollments = await env.DB.prepare('SELECT c.title, COUNT(e.id) as enrolls FROM Courses c LEFT JOIN Enrollments e ON c.id = e.course_id GROUP BY c.id').all();
        return { success: true, data: { user_distribution: users.results, course_popularity: enrollments.results } };
      }
      case 'get_student_details': {
        if (!params.email) return { success: false, message: "Missing required parameter: email" };
        const user = await env.DB.prepare('SELECT id, email, full_name, created_at FROM Users WHERE email = ?').bind(params.email).first() as any;
        if (!user) return { success: false, message: "Student not found." };
        const progress = await env.DB.prepare(`
          SELECT c.title, e.progress, e.status, e.purchased_at
          FROM Enrollments e 
          JOIN Courses c ON e.course_id = c.id 
          WHERE e.user_id = ?
        `).bind(user.id).all();
        return { success: true, data: { profile: user, enrollments: progress.results } };
      }
      case 'read_lesson': {
        if (!params.lesson_id) return { success: false, message: "Missing required parameter: lesson_id" };
        const lesson = await env.DB.prepare('SELECT title, text_content, type FROM Lessons WHERE id = ?').bind(params.lesson_id).first() as any;
        if (!lesson) return { success: false, message: "Lesson not found." };
        return { success: true, data: { title: lesson.title, content: lesson.text_content ?? `[${lesson.type} content]`, type: lesson.type } };
      }
      case 'draft_email': {
        const id = generateCustomId('YA-EML');
        const recipientList = Array.isArray(params.to) ? params.to.join(', ') : (params.to ?? '');
        await env.DB.prepare('INSERT INTO EmailDrafts (id, recipient, subject, body, is_html, admin_id) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, recipientList, params.subject ?? '', params.body ?? '', params.isHtml ? 1 : 0, adminId).run();
        return { success: true, message: "डैशबोर्ड पर ईमेल ड्राफ्ट सहेज लिया गया है।", draft_id: id };
      }
      case 'create_form_and_draft_email': {
        if (!params.form_title || !params.to) return { success: false, message: "Missing required parameters for form/email." };
        const formId = generateCustomId('YA-FRM');
        let slugBase = params.form_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!slugBase || slugBase.length < 2) slugBase = 'admission-form';
        const slug = `${slugBase}-${Math.random().toString(36).substring(2, 7)}`;
        const fieldsJsonStr = typeof params.form_fields_json === 'string' ? params.form_fields_json : JSON.stringify(params.form_fields_json ?? []);
        await env.DB.prepare('INSERT INTO FormTemplates (id, slug, title, description, fields_json, theme_json, confirmation_email_body, linked_course_id, linked_batch_id, auto_enroll, eligibility_criteria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(formId, slug, params.form_title, params.form_description ?? '', fieldsJsonStr, JSON.stringify(params.theme ?? {}), params.confirmation_email_body ?? null, params.linked_course_id ?? null, params.linked_batch_id ?? null, params.auto_enroll ?? 0, params.eligibility_criteria ?? null).run();
        const currentOrigin = new URL(reqUrl).origin;
        const formLink = `${currentOrigin}/form?slug=${slug}`;
        const finalBody = `${params.email_body ?? ''}<br/><br/><p style="text-align:center;"><a href="${formLink}" class="btn" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Fill out the Form</a></p>`;
        const draftId = generateCustomId('YA-EML');
        const recipientList = Array.isArray(params.to) ? params.to.join(', ') : (params.to ?? '');
        await env.DB.prepare('INSERT INTO EmailDrafts (id, recipient, subject, body, is_html, admin_id) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(draftId, recipientList, params.subject ?? '', finalBody, 1, adminId).run();
        return { success: true, message: `फॉर्म और ईमेल ड्राफ्ट सफलतापूर्वक बनाए गए। (Form Link: ${formLink})` };
      }
      case 'bulk_draft_email': {
        const { recipients, subject, body, isHtml } = params;
        if (!Array.isArray(recipients)) return { success: false, message: "Recipients must be an array." };
        const queries = recipients.map(email => {
          const id = generateCustomId('YA-EML');
          return env.DB.prepare('INSERT INTO EmailDrafts (id, recipient, subject, body, is_html, admin_id) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, email ?? '', subject ?? '', body ?? '', isHtml ? 1 : 0, adminId);
        });
        await env.DB.batch(queries);
        return { success: true, message: `${recipients.length} छात्रों के लिए ईमेल ड्राफ्ट्स सफलतापूर्वक तैयार किए गए हैं।` };
      }
      case 'query_users': {
        const { filter, course_id } = params;
        let results;
        if (filter === 'enrolled_all') {
          results = await env.DB.prepare("SELECT DISTINCT u.email, u.full_name FROM Users u JOIN Enrollments e ON u.id = e.user_id").all();
        } else if (filter === 'enrolled_course' && course_id) {
          results = await env.DB.prepare("SELECT u.email, u.full_name FROM Users u JOIN Enrollments e ON u.id = e.user_id WHERE e.course_id = ?").bind(course_id).all();
        } else if (filter === 'subscribers') {
          results = await env.DB.prepare("SELECT email, 'Subscriber' as full_name FROM Subscribers").all();
        } else {
          results = await env.DB.prepare("SELECT email, full_name FROM Users WHERE role = 'student'").all();
        }
        return { success: true, data: results.results, message: `Found ${results.results.length} users.` };
      }
      case 'send_email': {
        if (!params.to || !params.subject || !params.body) return { success: false, message: "Missing email parameters." };
        const success = await sendEmailViaBinding(params.to, params.subject, params.body, env, params.isHtml);
        return success ? { success: true, message: `Email sent to ${params.to}.` } : { success: false, message: `Failed to send email to ${params.to}.` };
      }
      default:
        return { success: false, message: "Unknown action." };
    }
  } catch (e: any) {
    return { success: false, message: `Action failed: ${e.message}` };
  }
}

async function handleGetChatHistory(request: Request, env: Env): Promise<Response> {
  try {
    const token = getCookie(request, 'session');
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    
    const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
    const payload = await verifyJWT(token, jwtSecret);
    const userId = payload.sub;

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    let records;
    if (sessionId) {
      records = await env.DB.prepare('SELECT role, content, created_at FROM ChatHistory WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC LIMIT 50')
        .bind(userId, sessionId).all();
    } else {
      records = await env.DB.prepare('SELECT role, content, created_at FROM ChatHistory WHERE user_id = ? ORDER BY created_at ASC LIMIT 50')
        .bind(userId).all();
    }
    
    return new Response(JSON.stringify(records.results), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return handleGlobalError(error, 'AI.GetHistory', env);
  }
}

async function handleDeleteChatHistory(request: Request, env: Env): Promise<Response> {
  try {
    const token = getCookie(request, 'session');
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    
    const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
    const payload = await verifyJWT(token, jwtSecret);
    const userId = payload.sub;

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (sessionId) {
      await env.DB.prepare('DELETE FROM ChatHistory WHERE user_id = ? AND session_id = ?').bind(userId, sessionId).run();
    } else {
      await env.DB.prepare('DELETE FROM ChatHistory WHERE user_id = ?').bind(userId).run();
    }
    
    return new Response(JSON.stringify({ success: true, message: 'Chat history deleted.' }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return handleGlobalError(error, 'AI.DeleteHistory', env);
  }
}

async function handleAIChat(request: Request, env: Env): Promise<Response> {
  try {
    const token = getCookie(request, 'session');
    let role = 'student';
    let userId = null;
    
    if (token) {
      const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
      try {
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub;
        role = payload.role;
        console.log(`[AI Chat] Authenticated User: ${userId} (Role: ${role})`);
      } catch (e) {
        console.warn(`[AI Chat] Token validation failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      console.warn(`[AI Chat] No session token found in cookies`);
    }

    const body = await request.json() as any;
    const userPrompt = body.prompt;
    const isTutor = body.isTutor || false;
    const lessonId = body.lessonId;

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
    }

    // Save User Prompt to History
    if (userId) {
      try {
        await env.DB.prepare('INSERT INTO ChatHistory (id, user_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)')
          .bind(generateCustomId('YA-CHT'), userId, body.sessionId || null, 'user', userPrompt).run();
      } catch(historyError) {
        console.error("[AI Chat] Failed to save user prompt:", historyError);
      }
    }

    // Credit check for students (admin/teacher bypass)
    let creditRemaining: number | undefined;
    if (userId && role === 'student') {
      const creditCheck = await checkAndConsumeAICredit(userId, env);
      if (!creditCheck.allowed) {
        return new Response(JSON.stringify({ error: creditCheck.reason, remaining: 0 }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'X-AI-Credits-Remaining': '0' }
        });
      }
      creditRemaining = creditCheck.remaining;
    }

    const context = await getAIGlobalContext(env, role, userId, userPrompt, lessonId);

    let systemContext = "";
    if (role === 'admin') {
      systemContext = `You are "Admin Intelligence OS", the elite system assistant for Yagya Ashram. 
ROLE: You are helping the System Administrator manage the platform, generate reports, send emails, and manage content.

CONVERSATIONAL PROTOCOL (LIKE CHATGPT):
1. Speak naturally and conversationally, like a highly intelligent human assistant.
2. Be proactive. If a request is unclear or missing details (e.g., asked to draft an email but no recipient or topic given, or asked to create a form without specifics), ASK clarifying questions before proceeding. Do not assume.
3. If you perform an action, briefly explain what you did conversationally and ask if the admin needs anything else.
4. Keep your tone professional yet helpful and engaging.

ELECTRONIC MAIL PROTOCOL:
If requested to send an email, you MUST first draft it as HTML.
1. Draft the email for the user's review. Use clean, modern HTML with inline CSS for buttons and layout.
2. For multiple users (Bulk):
   - First call "query_users" to identify the list of recipients.
   - Then call "draft_email" to create a SINGLE draft, but set the "to" parameter to a comma-separated string of ALL recipient emails. Example: "user1@abc.com, user2@abc.com"
3. Return an action of type "draft_email" with params { to, subject, body, isHtml: true }.
4. IMPORTANT: Use the EXACT recipient email(s) provided. NEVER use placeholders. If querying users, extract their emails and compile them into a comma-separated string for the "to" field.
5. IF REQUESTED to create a form for an invitation or enrollment and send it via email, use the action "create_form_and_draft_email" which generates the form and automatically appends the form link inside the drafted email body.
   - params: { form_title, form_description, form_fields_json, to, subject, email_body, confirmation_email_body, theme, linked_course_id, linked_batch_id, auto_enroll, eligibility_criteria }
   - "form_fields_json" SCHEMA (MANDATORY): [ { "name": "slug_style_id", "label": "Display Label", "type": "text|email|tel|select|textarea", "required": true, "options": ["Option1"] } ]
   - **CRITICAL**: EVERY form MUST include these fields by default unless strictly asked not to: Full Name (text), Email (email), Phone Number (tel), and Gender (select). 
   - "confirmation_email_body" (OPTIONAL): HTML content for the automatic email sent to the user after they fill out the form. Use this if the user asks for a confirmation/thank you email.
   - ENROLLMENT / ELIGIBILITY (OPTIONAL): If the admin wants to attach a course or batch to the form for auto-enrollment, set "linked_course_id" or "linked_batch_id" (use the ID if known, otherwise ask the admin), set "auto_enroll": 1, and set "eligibility_criteria" explaining how the AI should evaluate submissions (e.g., "Must be female, age 18+, interested in yoga"). If the AI evaluates them as eligible, they will be auto-enrolled. If not, they are marked pending for admin review.
6. The UI will show a rich "Real-time" preview of this HTML draft.
7. Do NOT attempt to send it immediately. The drafting process handles it.
8. For students, use a professional tonality. (Sender: Yagya Ashram, om@yagyaashram.com)

STRICT OUTPUT REQUIREMENT:
You MUST output ONLY valid JSON. Absolutely NO conversational text before or after the JSON. Even if you are conversing, that conversation must be inside the "reply" field of the JSON.
FAILURE TO OUTPUT JSON WILL BREAK THE SYSTEM.

Example JSON structure:
{
  "reply": "System response in Hindi or English, conversing with the admin, explaining the draft or action, or asking clarifying questions.",
  "action": { "type": "action_name", "params": { ... } }
}

VERIFICATION STEP:
If the user asks to "create", "delete", "edit", or "add" something AND provided enough details, you MUST include the corresponding "action" in your JSON. Do not just say you did it; actually include the action. If details are missing, ask for them in the "reply" field and omit the "action".
9. SLUG RULE: When creating forms, ensure the "form_title" used for slug generation is English-friendly.
10. DYNAMIC FORM DESIGN: When calling "create_form_and_draft_email", you can specify a "theme" object to customize the form's appearance. 
    - "theme" properties: { primaryColor (hex), backgroundColor (hex), font (string), animations (boolean), glassmorphism (boolean), borderRadius (px) }.
    - Adjust the design based on the form's intent (e.g., professional for admission, vibrant for workshops, spiritual for ashram events). Use modern aesthetics (gradients, subtle 3D-like shadows).

ABOUT YAGYA ASHRAM:
- Name: Yagya Ashram (यज्ञ आश्रम)
- Mission: A traditional yet modern Vedic educational institution focused on preserving Vedic wisdom, character building, and teaching modern skills like Yoga, Sanskrit, and technology.
- Values: Sanatana Dharma, discipline, selfless service (Seva), and pursuit of absolute truth (Satya).
- Location: Spiritual heart of India.
- Head/Guru: Acharya Navasanganakah.
- You should use this knowledge to answer students' queries about the ashram's philosophy and rules.
`;
    } else {
      systemContext = `You are "Yagya Mitra" (यज्ञ मित्र), an enlightened and friendly academic guide for students of Yagya Ashram. 
ROLE: You are a "Mitra" (friend) who provides personalized academic guidance and moral support.
MISSION: Analyze the student's progress, answer doubts, and suggest "What to do next" (Next Steps).
POWERS: You can view their enrollments, progress, and catalog. You CANNOT add, update, or delete records.
ADVICE: If a student is stuck, look at their context and give them a structured path (e.g., "First complete Lesson X, then watch Video Y").
TONE: Wise, patient, encouraging, and authoritative in knowledge.
    Language: Hindi (primary).
    About Yagya Ashram: Yagya Ashram is a Vedic center for learning and spiritual growth under Acharya Navasanganakah. It blends ancient Vedic traditions with modern education.
    Context: ${context}
    Output your response as plain, helpful text.`;
    }

    const sessionId = body.sessionId;

    // Load History
    let history: any[] = [];
    if (userId && sessionId) {
      const records = await env.DB.prepare('SELECT role, content FROM ChatHistory WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 10')
        .bind(userId, sessionId).all();
      // Reverse to get chronological order
      history = (records.results as any[]).reverse().map(r => ({ role: r.role === 'ai' ? 'assistant' : 'user', content: r.content }));
      console.log(`[Chat Debug] Loaded ${history.length} messages for user ${userId} in session ${sessionId}`);
    } else if (userId) {
      // Fallback for older chats without session id
      const records = await env.DB.prepare('SELECT role, content FROM ChatHistory WHERE user_id = ? AND session_id IS NULL ORDER BY created_at DESC LIMIT 10')
        .bind(userId).all();
      history = (records.results as any[]).reverse().map(r => ({ role: r.role === 'ai' ? 'assistant' : 'user', content: r.content }));
    }

    const messages = [
      { role: "system", content: systemContext },
      ...history,
      { role: "user", content: userPrompt }
    ];
    console.log(`[Chat Debug] Total messages sent to AI: ${messages.length}`);

    const isStreamRequested = request.headers.get('X-Stream') === 'true';
    if (isStreamRequested) {
      return await fetchAIStream(messages, env);
    }

    // Try AI generation
    let aiContent = "";
    try {
      aiContent = await generateAIContent(messages, env, role === 'admin');
    } catch(aiError: any) {
      console.error("AI Gen Error:", aiError);
      return new Response(JSON.stringify({ 
         reply: role === 'admin' 
           ? `❌ AI Error: ${aiError.message}` 
           : "माफ़ करें, अभी मेरा सिस्टम अद्यतन हो रहा है। (AI Setup Incomplete or Error)" 
      }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    }
    
    let parsed: any = { reply: "Technical error parsing AI response." };
    try {
        const cleanedContent = sanitizeJson(aiContent);
        parsed = JSON.parse(cleanedContent);
    } catch(e) {
        parsed = { reply: aiContent };
    }

    // Process Actions if any and user is Admin
    console.log(`[AI Chat] Parsed Result:`, JSON.stringify(parsed).substring(0, 500));
    
    if (parsed.action && role === 'admin' && userId) {
      console.log(`[AI Chat] Executing Action: ${parsed.action.type}`);
      const actionResult = await executeAIAction(parsed.action, env, userId, request.url);
      console.log(`[AI Chat] Action Result:`, JSON.stringify(actionResult));
      if (actionResult.success) {
        // If it was a data fetch action, we might want to re-ask AI with data, 
        // but for now, we just append the success info to the reply or modify it.
        if (actionResult.data) {
          parsed.reply += `\n\n[सिस्टम डेटा]: ${Array.isArray(actionResult.data) ? actionResult.data.length : 1} रिकॉर्ड मिले।`;
        } else {
          parsed.reply += `\n\n✅ [सिस्टम]: ${actionResult.message}`;
        }
      } else {
        parsed.reply += `\n\n❌ [System Error]: ${actionResult.message}`;
      }
    }

    // Save AI Reply to History
    if (userId) {
      try {
        await env.DB.prepare('INSERT INTO ChatHistory (id, user_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)')
          .bind(generateCustomId('YA-CHT'), userId, sessionId || null, 'ai', parsed.reply).run();
      } catch(historyError) {
        console.error("[AI Chat] Failed to save AI reply:", historyError);
      }
    }

    return new Response(JSON.stringify({ reply: parsed.reply, action: parsed.action }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return handleGlobalError(error, 'AI.Chat', env);
  }
}

// --- Main Worker Entrypoint ---

export default {
  async email(message: any, env: Env, ctx: ExecutionContext) {
    try {
      // Forward the incoming email to a destination address
      await message.forward("destination@example.com");

      // Send a new email notification using the send_email binding
      await env.SEND_EMAIL.send({
        from: message.to,
        to: "acharypdt@gmail.com",
        subject: "New email received",
        text: `New email from ${message.from}`,
      });
    } catch (e) {
      console.error("Email routing failed", e);
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Run Auto-Migration & Seed check continuously on the first request for this isolate instance
    await initDbAndSeed(env);

    const url = new URL(request.url);

    // Handle CORS preflight for all routes
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // API Routing
    if (url.pathname.startsWith('/api/')) {
      let response: Response;

      if (url.pathname === '/api/user/profile') {
        if (request.method === 'GET') response = await handleGetProfile(request, env);
        else if (request.method === 'POST') response = await handleUpdateProfile(request, env);
        else response = new Response('Method not allowed', { status: 405 });
      }
      else if (url.pathname === '/api/user/my-courses' && request.method === 'GET') response = await handleGetMyCourses(request, env);
      else if (url.pathname === '/api/admin/stats') response = await handleAdminStats(request, env);
      else if (url.pathname === '/api/admin/users' || url.pathname.startsWith('/api/admin/users/')) response = await handleAdminUsers(request, env);
      else if (url.pathname === '/api/admin/categories' || url.pathname.startsWith('/api/admin/categories/')) response = await handleAdminCategories(request, env);
      else if (url.pathname === '/api/admin/enrollments' || url.pathname.startsWith('/api/admin/enrollments/')) response = await handleAdminEnrollments(request, env);
      else if (url.pathname === '/api/admin/batches' || url.pathname.startsWith('/api/admin/batches/')) response = await handleAdminBatches(request, env);
      else if (url.pathname === '/api/admin/form-templates' || url.pathname.startsWith('/api/admin/form-templates/')) response = await handleAdminFormTemplates(request, env);
      else if (url.pathname === '/api/admin/form-submissions' || url.pathname.startsWith('/api/admin/form-submissions/')) response = await handleAdminFormSubmissions(request, env);
      
      // Specific Course Sub-routes (Lessons, Live) - Check BEFORE general course routes
      else if (url.pathname.match(/^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons(\/([a-zA-Z0-9-]+))?$/)) {
        const match = url.pathname.match(/^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons(\/([a-zA-Z0-9-]+))?$/);
        const courseId = match![1];
        const lessonId = match![3];
        
        if (request.method === 'POST') response = await handleAdminCreateLesson(request, env, courseId);
        else if (request.method === 'PUT' && lessonId) response = await handleAdminUpdateLesson(request, env, courseId, lessonId);
        else if (request.method === 'DELETE' && lessonId) response = await handleAdminDeleteLesson(request, env, courseId, lessonId);
        else response = new Response(JSON.stringify({ error: "Method not allowed or missing lesson ID" }), { status: 405 });
      }
      
      else if (url.pathname === '/api/admin/courses' || url.pathname.match(/^\/api\/admin\/courses\/[a-zA-Z0-9-]+$/)) {
        response = await handleAdminCourses(request, env);
      }
      else if (url.pathname === '/api/payments/create-order' && request.method === 'POST') response = await handleCreatePaymentOrder(request, env);
      else if (url.pathname === '/api/payments/verify' && request.method === 'POST') response = await handleVerifyPayment(request, env);
      else if (url.pathname === '/api/payment/webhook' && request.method === 'POST') response = await handleRazorpayWebhook(request, env);
      else if (url.pathname.match(/^\/api\/admin\/subscription\/plans\/([a-zA-Z0-9-]+)\/pool$/)) {
        const poolPlanMatch = url.pathname.match(/^\/api\/admin\/subscription\/plans\/([a-zA-Z0-9-]+)\/pool$/);
        response = await handleAdminPlanPool(request, env, poolPlanMatch![1]);
      }
      else if (url.pathname === '/api/admin/subscription/plans' || url.pathname.startsWith('/api/admin/subscription/plans/')) response = await handleAdminSubscriptionPlans(request, env);
      
      else if (url.pathname === '/api/admin/emails/drafts') {
        if (request.method === 'GET') response = await handleGetEmailDrafts(request, env);
        else if (request.method === 'POST') response = await handleSaveEmailDraft(request, env);
        else response = new Response('Method not allowed', { status: 405 });
      }
      else if (url.pathname.startsWith('/api/admin/emails/drafts/')) {
        const draftIdMatch = url.pathname.match(/^\/api\/admin\/emails\/drafts\/([a-zA-Z0-9-]+)$/);
        const draftSendMatch = url.pathname.match(/^\/api\/admin\/emails\/drafts\/([a-zA-Z0-9-]+)\/send$/);
        
        if (draftSendMatch && request.method === 'POST') response = await handleSendDraftedEmail(request, env, draftSendMatch[1]);
        else if (draftIdMatch) {
            if (request.method === 'PATCH') response = await handleUpdateEmailDraft(request, env, draftIdMatch[1]);
            else if (request.method === 'DELETE') response = await handleDeleteEmailDraft(request, env, draftIdMatch[1]);
            else response = new Response('Method not allowed', { status: 405 });
        } else response = new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });
      }
      
      else if (url.pathname.startsWith('/api/forms/')) {
        const slugMatch = url.pathname.match(/^\/api\/forms\/([a-zA-Z0-9-]+)$/);
        if (slugMatch) {
            if (request.method === 'GET') response = await handleGetFormTemplate(request, env, slugMatch[1]);
            else if (request.method === 'POST') response = await handleFormResponseSubmit(request, env, slugMatch[1]);
            else response = new Response('Method not allowed', { status: 405 });
        } else response = new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });
      }

      else if (url.pathname === '/api/live/signaling') response = await handleLiveSignaling(request, env);
      else if (url.pathname === '/api/auth/me' && request.method === 'GET') response = await handleGetProfile(request, env);
      else if (url.pathname === '/api/auth/logout') response = await handleLogout(request, env);
      else if (url.pathname === '/api/auth/refresh' && request.method === 'POST') response = await handleRefreshSession(request, env);
      else if (url.pathname === '/api/ai/history' && request.method === 'GET') response = await handleGetChatHistory(request, env);
      else if (url.pathname === '/api/ai/history' && request.method === 'DELETE') response = await handleDeleteChatHistory(request, env);
      else if (url.pathname === '/api/subscribe' && request.method === 'POST') {
        try {
          const body = await request.json() as { email: string };
          if (!body.email) response = new Response(JSON.stringify({ error: "Email is required" }), { status: 400 });
          else {
            await env.DB.prepare('INSERT OR IGNORE INTO Subscribers (email) VALUES (?)').bind(body.email).run();
            response = new Response(JSON.stringify({ success: true, message: "Subscribed successfully" }), { status: 200, headers: { 'Content-Type': 'application/json' }});
          }
        } catch (error) {
          response = await handleGlobalError(error, 'Subscribe', env);
        }
      }
      else if (request.method === 'POST') {
        if (url.pathname === '/api/auth/send-otp') response = await handleSendOTP(request, env);
        else if (url.pathname === '/api/auth/verify-otp') response = await handleVerifyOTP(request, env);
        else if (url.pathname === '/api/auth/register') response = await handleRegister(request, env);
        else if (url.pathname === '/api/notifications/read') response = await handleMarkNotificationRead(request, env);
        else if (url.pathname === '/api/dev/seed') response = await handleSeed(request, env);
        else if (url.pathname === '/api/admin/upload') response = await handleAdminUpload(request, env);
        else if (url.pathname === '/api/admin/generate-pdf') response = await handleGeneratePdf(request, env);
        else if (url.pathname === '/api/admin/send-email') response = await handleAdminSendEmail(request, env);
        else if (url.pathname === '/api/ai/chat') response = await handleAIChat(request, env);
        else if (url.pathname === '/api/subscription/create') response = await handleCreateSubscription(request, env);
        else if (url.pathname === '/api/subscription/cancel') response = await handleCancelSubscription(request, env);
        else if (url.pathname === '/api/subscription/pre-select') response = await handleStudentPreSelect(request, env);
        else {
          const enrollMatch = url.pathname.match(/^\/api\/courses\/([a-zA-Z0-9-]+)\/enroll$/);
          if (enrollMatch) response = await handleEnroll(request, env, enrollMatch[1]);
          else {
            const progressMatch = url.pathname.match(/^\/api\/courses\/([a-zA-Z0-9-]+)\/progress$/);
            if (progressMatch) response = await handleUpdateProgress(request, env, progressMatch[1]);
            else {
              const lessonCompleteMatch = url.pathname.match(/^\/api\/courses\/([a-zA-Z0-9-]+)\/lessons\/([a-zA-Z0-9-]+)\/complete$/);
              if (lessonCompleteMatch) response = await handleCompleteLesson(request, env, lessonCompleteMatch[1], lessonCompleteMatch[2]);
              else {
                const adminLessonsMatch = url.pathname.match(/^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons$/);
                const adminLiveMatch = url.pathname.match(/^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/live$/);
                
                if (adminLessonsMatch) response = await handleAdminCreateLesson(request, env, adminLessonsMatch[1]);
                else if (adminLiveMatch) response = await handleAdminCreateLiveSession(request, env, adminLiveMatch[1]);
                else response = new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });
              }
            }
          }
        }
      }
      
      else if (request.method === 'PUT') {
        const adminLessonPutMatch = url.pathname.match(/^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons\/([a-zA-Z0-9-]+)$/);
        const adminLivePutMatch = url.pathname.match(/^\/api\/admin\/live\/([a-zA-Z0-9-]+)$/);
        
        if (adminLessonPutMatch) response = await handleAdminUpdateLesson(request, env, adminLessonPutMatch[1], adminLessonPutMatch[2]);
        else if (adminLivePutMatch) response = await handleAdminUpdateLiveSession(request, env, adminLivePutMatch[1]);
        else response = new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });
      }

      else if (request.method === 'DELETE') {
        const adminLessonDelMatch = url.pathname.match(/^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons\/([a-zA-Z0-9-]+)$/);
        const adminLiveDelMatch = url.pathname.match(/^\/api\/admin\/live\/([a-zA-Z0-9-]+)$/);
        
        if (adminLessonDelMatch) response = await handleAdminDeleteLesson(request, env, adminLessonDelMatch[1], adminLessonDelMatch[2]);
        else if (adminLiveDelMatch) response = await handleAdminDeleteLiveSession(request, env, adminLiveDelMatch[1]);
        else response = new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });
      }
      
      else if (request.method === 'GET' || request.method === 'HEAD') {
        if (url.pathname === '/api/courses') response = await handleListCourses(request, env);
        else if (url.pathname === '/api/notifications') response = await handleGetNotifications(request, env);
        else if (url.pathname === '/api/payment/status') response = await handlePaymentStatus(env);
        else if (url.pathname === '/api/subscription/plans') response = await handleListSubscriptionPlans(env);
        else if (url.pathname === '/api/subscription/me') response = await handleGetUserSubscription(request, env);
        else if (url.pathname === '/api/subscription/my-selections') response = await handleGetMySelections(request, env);
        else if (url.pathname === '/api/subscription/ai-credits') response = await handleGetMyAICredits(request, env);
        else {
          const mediaMatch = url.pathname.match(/^\/api\/media\/(.+)$/);
          const lessonMatch = url.pathname.match(/^\/api\/lessons\/([a-zA-Z0-9-]+)$/);
          if (mediaMatch) response = await handleServeMedia(request, env, mediaMatch[1]);
          else if (lessonMatch) response = await handleGetLesson(request, env, lessonMatch[1]);
          else {
            const poolMatch = url.pathname.match(/^\/api\/subscription\/plans\/([a-zA-Z0-9-]+)\/pool$/);
            if (poolMatch) response = await handleStudentPlanPool(request, env, poolMatch[1]);
            else {
            const courseMatch = url.pathname.match(/^\/api\/courses\/([a-zA-Z0-9-]+)$/);
            if (courseMatch) {
              const courseId = courseMatch[1];
              const token = getCookie(request, 'session');
              let enrollment: any = null;
              if (token) {
                try {
                  const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
                  const payload = await verifyJWT(token, jwtSecret);
                  enrollment = await env.DB.prepare('SELECT payment_status FROM Enrollments WHERE user_id = ? AND course_id = ?').bind(payload.sub, courseId).first();
                } catch(e) {}
              }
              const course = await env.DB.prepare('SELECT * FROM Courses WHERE id = ?').bind(courseId).first();
              if (!course) return new Response(JSON.stringify({ error: "Course not found" }), { status: 404 });
              
              return new Response(JSON.stringify({ 
                course, 
                isEnrolled: !!enrollment,
                paymentStatus: enrollment ? enrollment.payment_status : null
              }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            else {
              const lessonsMatch = url.pathname.match(/^\/api\/courses\/([a-zA-Z0-9-]+)\/lessons$/);
              const liveSessionsMatch = url.pathname.match(/^\/api\/courses\/([a-zA-Z0-9-]+)\/live$/);
                
              if (lessonsMatch) response = await handleListLessons(request, env, lessonsMatch[1]);
              else if (liveSessionsMatch) response = await handleListLiveSessions(request, env, liveSessionsMatch[1]);
              else response = new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });
            }
          }
        }
        }
        }

      else {
        response = new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
      }

      // Final Response Security Headers
      const secureResponse = new Response(response.body, response);
      secureResponse.headers.set('X-Content-Type-Options', 'nosniff');
      
      // Only set X-Frame-Options: DENY for HTML/main app responses, not media or iframes
      const isHtml = response.headers.get('Content-Type')?.includes('text/html');
      if (isHtml) {
        secureResponse.headers.set('X-Frame-Options', 'DENY');
      }
      
      secureResponse.headers.set('X-XSS-Protection', '1; mode=block');
      if (env.ENVIRONMENT === 'production') {
        secureResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      
      return secureResponse;
    }

    // Default: Asset serving happens automatically if we don't return here 
    // This allows Cloudflare Workers with Assets to serve the static frontend.
    return undefined as any;
  }
};
