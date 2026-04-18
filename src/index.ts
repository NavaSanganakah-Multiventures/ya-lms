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

async function getSecret(env: Env, key: string): Promise<string | null> {
  return await env.PLATFORM_SECRETS.get(key);
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

async function handleGlobalError(error: any, context: string, env: Env): Promise<Response> {
  console.error(`[${context}] Error:`, error);
  
  // Trigger Real-time Alerts
  await Promise.allSettled([
    (async () => {
      try {
        const adminEmail = await getSecret(env, 'ADMIN_CONTACT_EMAIL') || 'navasanganakah@gmail.com';
        const errorDetails = error instanceof Error ? error.stack : String(error);
        const subject = `[URGENT LMS ALERT] Error in ${context}`;
        const textContent = `Namaste Admin,\n\nA critical system error has been caught.\n\nContext: ${context}\nTime: ${new Date().toISOString()}\n\nError Details:\n${errorDetails}\n\nPlease review immediately.\n\nOm!`;
        await sendEmailNative(env, adminEmail, subject, textContent);
      } catch (e) {}
    })(),
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

async function sendEmailNative(env: Env, toEmail: string, subject: string, textContent: string): Promise<boolean> {
  try {
    await env.SEND_EMAIL.send({
      from: "om@yagyaashram.com",
      to: toEmail,
      subject: subject,
      text: textContent,
    });
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
    let user: any = await env.DB.prepare('SELECT id, role FROM Users WHERE email = ?').bind(email).first();
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
    const token = await signJWT({
      sub: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }, jwtSecret);

    const response = new Response(JSON.stringify({ 
      message: "Login successful", 
      role: user.role, 
      isNew,
      profileComplete: !!(user.full_name && user.phone && user.birth_date && user.father_name && user.mother_name && user.grand_father_name)
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

    response.headers.append('Set-Cookie', `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`);
    return response;
  } catch (error) {
    return handleGlobalError(error, 'Auth.VerifyOTP', env);
  }
}

// --- JWT & Cookie Utilities ---

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
      const { results } = await env.DB.prepare('SELECT id, email, role, created_at FROM Users ORDER BY created_at DESC').all();
      return new Response(JSON.stringify({ users: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
      const { title, description, price, teacher_id, category_id } = await request.json() as any;
      const courseId = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO Courses (id, title, description, teacher_id, price, category_id) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(courseId, title, description, teacher_id, price, category_id || null).run();
      return new Response(JSON.stringify({ message: "Course created successfully", id: courseId }), { status: 201, headers: { 'Content-Type': 'application/json' } });
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
      const id = crypto.randomUUID();
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

// --- Notifications Handlers ---

export async function createNotification(env: Env, userId: string, title: string, message: string, type: 'info' | 'alert' | 'success' | 'warning' = 'info') {
  try {
    await env.DB.prepare('INSERT INTO Notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, title, message, type).run();
  } catch (error) {
    console.error("Failed to create notification:", error);
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
      SELECT c.id, c.title, c.description, c.price, c.teacher_id, cat.name as category_name 
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
    let userId = null;
    
    if (token) {
      try {
        const jwtSecret = await getSecret(env, 'JWT_SECRET') || 'fallback_dev_secret_do_not_use_in_prod';
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub;
        if (payload.role === 'admin' || payload.role === 'teacher') allowed = true;
        else {
          const existing = await env.DB.prepare('SELECT id FROM Enrollments WHERE user_id = ? AND course_id = ?').bind(userId, courseId).first();
          if (existing) allowed = true;
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
      // Return only titles and types if not allowed to view content
      const safeResults = results.map(r => ({ id: r.id, chapter_title: r.chapter_title, title: r.title, type: r.type, order_index: r.order_index }));
      return new Response(JSON.stringify({ lessons: safeResults, locked: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ lessons: results, locked: false, completedLessonIds }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Course.Lessons', env);
  }
}

async function handleAdminCreateLesson(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const body = await request.json() as any;
    const lessonId = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO Lessons (id, course_id, chapter_title, title, type, content_url, text_content, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(lessonId, courseId, body.chapter_title || 'General', body.title, body.type, body.content_url || '', body.text_content || '', body.order_index || 0).run();
    return new Response(JSON.stringify({ success: true, id: lessonId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return handleGlobalError(error, 'Admin.CreateLesson', env);
  }
}

async function handleAdminUpload(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    const key = `${crypto.randomUUID()}-${file.name.replace(/\s+/g, '_')}`;
    await env.STORAGE.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
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
    const object = await env.STORAGE.get(key);
    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    return new Response(object.body, { headers });
  } catch (error) {
    return new Response("Error", { status: 500 });
  }
}

async function handleAdminUpdateLesson(request: Request, env: Env, courseId: string, lessonId: string): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const body = await request.json() as any;
    await env.DB.prepare('UPDATE Lessons SET chapter_title = ?, title = ?, type = ?, content_url = ?, text_content = ?, order_index = ? WHERE id = ? AND course_id = ?')
      .bind(body.chapter_title || 'General', body.title, body.type, body.content_url || '', body.text_content || '', body.order_index || 0, lessonId, courseId).run();
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
      const { slug, title, description, fields_json, seo_json } = await request.json() as any;
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO FormTemplates (id, slug, title, description, fields_json, seo_json) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, slug, title, description || '', JSON.stringify(fields_json), JSON.stringify(seo_json || {})).run();
      return new Response(JSON.stringify({ message: "Form template created successfully", id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'PUT') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      const { slug, title, description, fields_json, seo_json } = await request.json() as any;
      await env.DB.prepare('UPDATE FormTemplates SET slug = ?, title = ?, description = ?, fields_json = ?, seo_json = ? WHERE id = ?')
        .bind(slug, title, description || '', JSON.stringify(fields_json), JSON.stringify(seo_json || {}), id).run();
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
    const template: any = await env.DB.prepare('SELECT id, title FROM FormTemplates WHERE slug = ?').bind(slug).first();
    if (!template) return new Response(JSON.stringify({ error: "Form not found" }), { status: 404 });

    const submissionData = await request.json() as any;
    const submissionId = crypto.randomUUID();
    const email = submissionData.email || '';

    // AI Analysis (Admission processing)
    let aiFeedback = null;
    try {
      const systemPrompt = `You are "Ashram Admission AI". Review this application for "${template.title}". Analyze if the candidate seems sincere and fits the ashram tradition. 
      Format: {"score": 0-10, "feedback": "Short encouraging feedback in Hindi", "is_fit": boolean}
      Application: ${JSON.stringify(submissionData)}`;
      const aiResult = await generateAIContent("Review this application.", env, systemPrompt);
      aiFeedback = sanitizeJson(aiResult);
    } catch (e) {
      console.error("Submission AI Analysis Error:", e);
    }

    await env.DB.prepare('INSERT INTO FormSubmissions (id, template_id, email, data_json, ai_analysis) VALUES (?, ?, ?, ?, ?)')
      .bind(submissionId, template.id, email, JSON.stringify(submissionData), aiFeedback).run();

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

    const id = crypto.randomUUID();
    // Note: title field is added on the fly if needed, but table schema doesn't have it.
    // I'll stick to schema or update it if allowed. User asked for topic/title usually.
    // The previous grep showed no 'title' in LiveSessions. I'll stick to rtc_room_id as key.
    
    await env.DB.prepare('INSERT INTO LiveSessions (id, course_id, teacher_id, start_time, rtc_room_id, status) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, courseId, admin, start_time, rtc_room_id, 'scheduled').run();

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
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO LiveSignaling (id, session_id, user_id, type, data) VALUES (?, ?, ?, ?, ?)').bind(id, sessionId, payload.sub, type, JSON.stringify(data)).run();
      
      // Update Attendance if it's a student joining
      if (payload.role === 'student' && type === 'offer_request') {
        const attId = crypto.randomUUID();
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

    const enrollmentId = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO Enrollments (id, user_id, course_id) VALUES (?, ?, ?)')
      .bind(enrollmentId, userId, courseId).run();

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
      `CREATE TABLE IF NOT EXISTS Courses (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, category_id TEXT, teacher_id TEXT NOT NULL, price INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE SET NULL, FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Lessons (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, chapter_title TEXT DEFAULT 'General', title TEXT NOT NULL, type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording')) NOT NULL, content_url TEXT, order_index INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, text_content TEXT, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Enrollments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, course_id TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, status TEXT CHECK(status IN ('active', 'revoked', 'completed')) NOT NULL DEFAULT 'active', purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS LiveSessions (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, teacher_id TEXT NOT NULL, start_time DATETIME NOT NULL, rtc_room_id TEXT NOT NULL UNIQUE, status TEXT CHECK(status IN ('scheduled', 'live', 'ended')) DEFAULT 'scheduled', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE, FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS LiveSignaling (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL, data TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Attendance (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, joined_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Exams (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL, passing_score INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS CompletedLessons (user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, lesson_id), FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (lesson_id) REFERENCES Lessons(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'info', is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS FormTemplates (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT, fields_json TEXT NOT NULL, seo_json TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS FormSubmissions (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT, email TEXT, data_json TEXT NOT NULL, status TEXT DEFAULT 'pending', ai_analysis TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (template_id) REFERENCES FormTemplates(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);`,
      `CREATE INDEX IF NOT EXISTS idx_courses_teacher ON Courses(teacher_id);`,
      `CREATE INDEX IF NOT EXISTS idx_lessons_course ON Lessons(course_id);`,
      `CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON Enrollments(user_id, course_id);`,
      `CREATE INDEX IF NOT EXISTS idx_livesessions_course ON LiveSessions(course_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON FormTemplates(slug);`,
      `CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON FormSubmissions(template_id);`
    ];

    // Attempt to add category_id column if it didn't exist
    try {
      await env.DB.prepare(`ALTER TABLE Courses ADD COLUMN category_id TEXT;`).run();
    } catch (e) { /* Column already exists */ }

    // Attempt to add progress column if the table already existed but without the new column
    try {
      await env.DB.prepare(`ALTER TABLE Enrollments ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;`).run();
    } catch (e) { /* Column already exists, safe to ignore */ }

    // Attempt to add chapter_title column to Lessons if it didn't exist
    try {
      await env.DB.prepare(`ALTER TABLE Lessons ADD COLUMN chapter_title TEXT DEFAULT 'General';`).run();
    } catch (e) { /* Column already exists, safe to ignore */ }

    // Attempt to add text_content column to Lessons if it didn't exist
    try {
      await env.DB.prepare(`ALTER TABLE Lessons ADD COLUMN text_content TEXT;`).run();
    } catch (e) { /* Column already exists, safe to ignore */ }

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
  let sanitized = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = sanitized.indexOf("{");
  const lastBrace = sanitized.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    sanitized = sanitized.substring(firstBrace, lastBrace + 1);
  }
  return sanitized;
}

export async function generateAIContent(prompt: string, env: Env, systemContext: string): Promise<string> {
  const accountId = await getSecret(env, 'CLOUDFLARE_ACCOUNT_ID');
  const cfToken = await getSecret(env, 'CLOUDFLARE_API_TOKEN');
  const aigToken = await getSecret(env, 'CF_AIG_TOKEN') || cfToken;
  const gatewayId = await getSecret(env, 'AI_GATEWAY_ID') || "vertexai";

  const model = "dynamic/r";

  if (!accountId || !aigToken || aigToken === "null") {
    throw new Error("AI Setup Incomplete: Missing Cloudflare Credentials.");
  }

  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat/chat/completions`;

  try {
    const gRes = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'cf-aig-authorization': `Bearer ${aigToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const resText = await gRes.text();

    if (gRes.ok) {
      if (!resText || resText.trim() === "") {
        throw new Error(`Gateway returned 200 OK but EMPTY response for ${model}`);
      }
      const aiResponse = JSON.parse(resText);
      if (aiResponse.choices && aiResponse.choices[0] && aiResponse.choices[0].message) {
        return sanitizeJson(aiResponse.choices[0].message.content);
      }
      throw new Error(`Gateway returned invalid JSON structure for ${model}: ${resText.substring(0, 200)}`);
    } else {
      throw new Error(`Gateway Fetch failed for ${model} (Status: ${gRes.status}): ${resText}`);
    }
  } catch (e: any) {
    throw new Error(`AI Gateway Request Failed: ${e.message}`);
  }
}

async function fetchAIStream(prompt: string, env: Env, systemContext: string): Promise<Response> {
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
      messages: [{ role: "system", content: systemContext }, { role: "user", content: prompt }]
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
1. create_course: { title, description, price }
2. add_lesson: { course_id, chapter_title, title, type, content_url, text_content }
3. add_student: { email, password }
4. get_student_details: { email }
5. read_lesson: { lesson_id }
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

async function sendEmailViaBinding(to: string, subject: string, body: string, env: Env): Promise<boolean> {
  try {
    const msg = createMimeMessage();
    msg.setSender({ name: "Yagya Ashram", addr: "om@yagyaashram.com" });
    msg.setRecipient(to);
    msg.setSubject(subject);
    msg.addMessage({
      contentType: 'text/plain',
      data: body
    });

    await env.SEND_EMAIL.send(msg);
    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

async function handleAdminSendEmail(request: Request, env: Env): Promise<Response> {
  try {
    const adminId = await requireAdmin(request, env);
    const { to, subject, body } = await request.json() as any;
    
    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "To, Subject, and Body are required" }), { status: 400 });
    }

    const success = await sendEmailViaBinding(to, subject, body, env);
    if (success) {
      return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
    }
  } catch (error) {
    return handleGlobalError(error, 'Admin.SendEmail', env);
  }
}

async function executeAIAction(action: any, env: Env, adminId: string) {
  const { type, params } = action;
  try {
    switch (type) {
      case 'create_course': {
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO Courses (id, title, description, teacher_id, price) VALUES (?, ?, ?, ?, ?)')
          .bind(id, params.title, params.description || '', adminId, params.price || 0).run();
        return { success: true, message: `Course "${params.title}" created successfully.` };
      }
      case 'add_lesson': {
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO Lessons (id, course_id, chapter_title, title, type, content_url, text_content, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, params.course_id, params.chapter_title || 'General', params.title, params.type, params.content_url || '', params.text_content || '', 0).run();
        return { success: true, message: `Lesson "${params.title}" added successfully.` };
      }
      case 'add_student': {
        const salt = await generateSalt();
        const hash = await hashPassword(params.password, salt);
        const id = generateStudentId();
        await env.DB.prepare('INSERT INTO Users (id, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)')
          .bind(id, params.email, hash, salt, 'student').run();
        return { success: true, message: `Student ${params.email} added successfully.` };
      }
      case 'get_student_details': {
        const user = await env.DB.prepare('SELECT id, email FROM Users WHERE email = ? AND role = "student"').bind(params.email).first() as any;
        if (!user) return { success: false, message: "Student not found." };
        const progress = await env.DB.prepare(`
          SELECT c.title, e.progress 
          FROM Enrollments e 
          JOIN Courses c ON e.course_id = c.id 
          WHERE e.user_id = ?
        `).bind(user.id).all();
        return { success: true, data: progress.results };
      }
      case 'read_lesson': {
        const lesson = await env.DB.prepare('SELECT title, text_content FROM Lessons WHERE id = ?').bind(params.lesson_id).first() as any;
        if (!lesson) return { success: false, message: "Lesson not found." };
        return { success: true, data: { title: lesson.title, content: lesson.text_content } };
      }
      case 'draft_email': {
        // This action just confirms to the AI that it should show the draft UI
        return { success: true, message: "Draft prepared for approval." };
      }
      case 'send_email': {
        const success = await sendEmailViaBinding(params.to, params.subject, params.body, env);
        if (success) return { success: true, message: `Email sent to ${params.to}.` };
        else return { success: false, message: `Failed to send email to ${params.to}.` };
      }
      default:
        return { success: false, message: "Unknown action." };
    }
  } catch (e: any) {
    return { success: false, message: `Action failed: ${e.message}` };
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
      } catch (e) {}
    }

    const body = await request.json() as any;
    const userPrompt = body.prompt;
    const isTutor = body.isTutor || false;
    const lessonId = body.lessonId;

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
    }

    const context = await getAIGlobalContext(env, role, userId, userPrompt, lessonId);

    let systemContext = "";
    if (role === 'admin') {
      systemContext = `You are "Admin Intelligence OS", the elite system assistant for Yagya Ashram. 
ROLE: You are helping the System Administrator manage the platform, generate reports, send emails, and manage content.

ELECTRONIC MAIL PROTOCOL:
If requested to send an email, you MUST first draft it.
1. Draft the email for the user's review.
2. Return an action of type "draft_email" with params { "to": "...", "subject": "...", "body": "..." }.
3. The UI will show this draft to the Admin for approval.
4. Do NOT attempt to send it immediately unless the admin explicitly says "Yes, send it" or "Approved" after the draft.

Output ONLY clean JSON in this format: 
{
  "reply": "System response in Hindi explaining the draft or action",
  "action": { "type": "action_name_here", "params": { ... } } (optional)
}`;
    } else {
      systemContext = `You are "Yagya AI Guru", an enlightened academic guide for students. 
ROLE: You provide personalized academic guidance based on the student's current progress and profile.
MISSION: Analyze the student's progress, answer doubts, and suggest "What to do next" (Next Steps).
POWERS: You can view their enrollments, progress, and catalog. You CANNOT add, update, or delete records.
ADVICE: If a student is stuck, look at their context and give them a structured path (e.g., "First complete Lesson X, then watch Video Y").
TONE: Wise, patient, encouraging, and authoritative in knowledge.
Language: Hindi (primary).
Context: ${context}
Output ONLY clean JSON in this format: 
{
  "reply": "Wise guidance/instruction in Hindi based on their data"
}`;
    }

    const isStreamRequested = request.headers.get('X-Stream') === 'true';
    if (isStreamRequested) {
      return await fetchAIStream(userPrompt, env, systemContext);
    }

    // Try AI generation
    let aiContent = "";
    try {
      aiContent = await generateAIContent(userPrompt, env, systemContext);
    } catch(aiError: any) {
      console.error("AI Gen Error:", aiError);
      return new Response(JSON.stringify({ reply: "माफ़ करें, अभी मेरा सिस्टम अद्यतन हो रहा है। (AI Setup Incomplete or Error)" }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    }
    
    let parsed: any = { reply: "Technical error parsing AI response." };
    try {
        parsed = JSON.parse(aiContent);
    } catch(e) {
        parsed = { reply: aiContent };
    }

    // Process Actions if any and user is Admin
    if (parsed.action && role === 'admin' && userId) {
      const actionResult = await executeAIAction(parsed.action, env, userId);
      if (actionResult.success) {
        // If it was a data fetch action, we might want to re-ask AI with data, 
        // but for now, we just append the success info to the reply or modify it.
        if (parsed.action.type === 'get_student_details') {
          // Re-ask or just format result
          parsed.reply += `\n\n[System Result]: ${JSON.stringify(actionResult.data)}`;
        } else {
          parsed.reply += `\n\n✅ [System Notification]: ${actionResult.message}`;
        }
      } else {
        parsed.reply += `\n\n❌ [System Error]: ${actionResult.message}`;
      }
    }

    return new Response(JSON.stringify({ reply: parsed.reply }), { 
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

    // API Routing
    if (url.pathname.startsWith('/api/')) {
      let response: Response;

      if (url.pathname === '/api/user/profile') {
        if (request.method === 'GET') response = await handleGetProfile(request, env);
        else if (request.method === 'POST') response = await handleUpdateProfile(request, env);
        else response = new Response('Method not allowed', { status: 405 });
      }
      else if (url.pathname === '/api/admin/stats') response = await handleAdminStats(request, env);
      else if (url.pathname === '/api/admin/users') response = await handleAdminUsers(request, env);
      else if (url.pathname === '/api/admin/courses') response = await handleAdminCourses(request, env);
      else if (url.pathname === '/api/admin/categories' || url.pathname.startsWith('/api/admin/categories/')) response = await handleAdminCategories(request, env);
      else if (url.pathname === '/api/admin/form-templates' || url.pathname.startsWith('/api/admin/form-templates/')) response = await handleAdminFormTemplates(request, env);
      else if (url.pathname === '/api/admin/form-submissions' || url.pathname.startsWith('/api/admin/form-submissions/')) response = await handleAdminFormSubmissions(request, env);
      
      else if (url.pathname.startsWith('/api/forms/')) {
        const slugMatch = url.pathname.match(/^\/api\/forms\/([a-zA-Z0-9-]+)$/);
        if (slugMatch) {
            if (request.method === 'GET') response = await handleGetFormTemplate(request, env, slugMatch[1]);
            else if (request.method === 'POST') response = await handleFormResponseSubmit(request, env, slugMatch[1]);
            else response = new Response('Method not allowed', { status: 405 });
        } else response = new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });
      }

      else if (url.pathname === '/api/live/signaling') response = await handleLiveSignaling(request, env);
      else if (request.method === 'POST') {
        if (url.pathname === '/api/auth/send-otp') response = await handleSendOTP(request, env);
        else if (url.pathname === '/api/auth/verify-otp') response = await handleVerifyOTP(request, env);
        else if (url.pathname === '/api/notifications/read') response = await handleMarkNotificationRead(request, env);
        else if (url.pathname === '/api/dev/seed') response = await handleSeed(request, env);
        else if (url.pathname === '/api/admin/upload') response = await handleAdminUpload(request, env);
        else if (url.pathname === '/api/admin/generate-pdf') response = await handleGeneratePdf(request, env);
        else if (url.pathname === '/api/admin/send-email') response = await handleAdminSendEmail(request, env);
        else if (url.pathname === '/api/ai/chat') response = await handleAIChat(request, env);
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
      
      else if (request.method === 'GET') {
        if (url.pathname === '/api/courses') response = await handleListCourses(request, env);
        else if (url.pathname === '/api/notifications') response = await handleGetNotifications(request, env);
        else {
          const mediaMatch = url.pathname.match(/^\/api\/media\/(.+)$/);
          if (mediaMatch) response = await handleServeMedia(request, env, mediaMatch[1]);
          else {
            const courseMatch = url.pathname.match(/^\/api\/courses\/([a-zA-Z0-9-]+)$/);
            if (courseMatch) response = await handleGetCourse(request, env, courseMatch[1]);
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

      else {
        response = new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
      }

      // Final Response Security Headers
      const secureResponse = new Response(response.body, response);
      secureResponse.headers.set('X-Content-Type-Options', 'nosniff');
      secureResponse.headers.set('X-Frame-Options', 'DENY');
      secureResponse.headers.set('X-XSS-Protection', '1; mode=block');
      if (env.ENVIRONMENT === 'production') {
        secureResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      return secureResponse;
    }

    // Default: Asset serving happens automatically if we don't return here 
    // but in case of worker interception, returning nothing or letting it fall through
    // works for some configurations.
    return new Response("Not Found", { status: 404 });
  }
};
