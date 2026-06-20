# बैकएंड API (Backend API)

## अवलोकन
YA-LMS का संपूर्ण बैकएंड एक **Cloudflare Worker** (`src/index.ts`) में ~21,000 लाइनों में लिखा गया है। इसमें कोई Next.js रूट हैंडलर नहीं है - सभी API अनुरोध `next.config.ts` में परिभाषित रीराइट के माध्यम से वर्कर को भेजे जाते हैं।

---

## 1. आर्किटेक्चर

```
क्लाइंट (ब्राउज़र/Flutter)
    │
    ▼
Next.js (next.config.ts रीराइट)
    │  /api/* → http://127.0.0.1:8787/api/*
    ▼
Cloudflare Worker (src/index.ts)
    │
    ├── राउटर → हैंडलर फ़ंक्शन
    ├── मिडलवेयर (auth, CORS, app-signature)
    ├── डेटाबेस क्वेरी (D1)
    ├── फ़ाइल स्टोरेज (R2)
    ├── ईमेल (SEND_EMAIL)
    ├── AI (Gemini + Whisper)
    ├── पुश (FCM + Web Push)
    └── बाहरी API (Razorpay, सोशल, Google)
```

---

## 2. मुख्य फ़ंक्शन और उनके कार्य

### प्रमाणीकरण (Auth)

| फ़ंक्शन | एंडपॉइंट | विवरण |
|----------|-----------|--------|
| `handleSendOTP()` | POST /api/auth/send-otp | OTP भेजें (रेट लिमिटेड, 1/min) |
| `handleVerifyOTP()` | POST /api/auth/verify-otp | OTP सत्यापित करें + JWT जारी करें |
| `handleRegister()` | POST /api/auth/register | नया उपयोगकर्ता पंजीकरण |
| `handleLogout()` | POST /api/auth/logout | कुकी + DB सत्र साफ़ करें |
| `handleRefreshSession()` | POST /api/auth/refresh-session | गतिविधि पिंग + टोकन नवीनीकरण |

### कोर्सेज (Courses)

| फ़ंक्शन | एंडपॉइंट | विवरण |
|----------|-----------|--------|
| Courses list | GET /api/courses | सार्वजनिक कोर्स सूची |
| Course detail | GET /api/courses/:id | कोर्स विवरण |
| Enroll | POST /api/enroll | कोर्स/बुक में एनरोल |
| Complete lesson | POST /api/courses/:id/complete-lesson | पाठ पूर्णता |
| Certificate | GET /api/courses/:id/certificate | प्रमाणपत्र PDF |

### एडमिन (Admin)

| फ़ंक्शन | एंडपॉइंट | विवरण |
|----------|-----------|--------|
| `handleAdminStats()` | GET /api/admin/stats | डैशबोर्ड आंकड़े |
| `handleAdminUsers()` | GET/POST/PUT/DELETE /api/admin/users | उपयोगकर्ता CRUD |
| `handleAdminCourses()` | GET/POST/PUT/DELETE /api/admin/courses | कोर्स CRUD |
| `handleAdminBatches()` | GET/POST/PUT/DELETE /api/admin/batches | बैच CRUD |
| `handleAdminCategories()` | GET/POST/PUT/DELETE /api/admin/categories | श्रेणी CRUD |
| `handleAdminEnrollments()` | POST /api/admin/enrollments | एनरोलमेंट प्रबंधन |
| `handleAdminGiveCredits()` | POST /api/admin/credits | क्रेडिट प्रबंधन |
| `handleAdminAccounting()` | GET /api/admin/accounting | लेखा/राजस्व |

### परीक्षाएं (Exams)

| फ़ंक्शन | एंडपॉइंट | विवरण |
|----------|-----------|--------|
| Exam detail | GET /api/exams/:id | परीक्षा विवरण |
| Submit answer | POST /api/exams/:id | उत्तर सबमिट |
| Log violation | POST /api/exams/:id/violation | प्रॉक्टरिंग उल्लंघन |

### सूचनाएं (Notifications)

| फ़ंक्शन | एंडपॉइंट | विवरण |
|----------|-----------|--------|
| Subscribe | POST /api/notifications/subscribe | पुश सब्सक्राइब |
| Unsubscribe | POST /api/notifications/unsubscribe | पुश अनसब्सक्राइब |
| Register device | POST /api/notifications/register-device | FCM डिवाइस पंजीकरण |
| Send push | POST /api/admin/broadcast | एडमिन ब्रॉडकास्ट |

---

## 3. सहायक फ़ंक्शन (Utility Functions)

| फ़ंक्शन | विवरण |
|----------|--------|
| `signJWT()` / `verifyJWT()` | HMAC-SHA256 JWT हस्ताक्षर/सत्यापन |
| `generateSecureOTP()` | 6-अंकीय क्रिप्टोग्राफिक OTP |
| `generateStudentId()` | छात्र आईडी जनरेशन |
| `generateCustomId()` | सामान्य कस्टम आईडी (`YA-{PREFIX}-{...}`) |
| `getCORSHeaders()` | गतिशील CORS हेडर |
| `safeSendEmail()` | HTML ईमेल भेजें |
| `sendRedAlert()` | आपातकालीन अलर्ट (ईमेल + WhatsApp) |
| `createErrorSessionFromPayload()` | त्रुटि सत्र निर्माण |
| `postToSocialChannels()` | सोशल मीडिया पोस्ट |
| `syncEventToGoogle()` | Google Calendar सिंक |

---

## 4. मिडलवेयर

| मिडलवेयर | विवरण |
|-----------|--------|
| `requireAuth()` | JWT + सत्र आईडी सत्यापन |
| `requireAdmin()` | JWT + एडमिन भूमिका + सत्र |
| `requireAdminOrTeacher()` | JWT + एडमिन/शिक्षक भूमिका + सत्र |
| `verifyAppSignature()` | Flutter ऐप HMAC सिग्नेचर सत्यापन |

---

## 5. क्रॉन जॉब्स (Cron Triggers)

`wrangler.jsonc` में परिभाषित:
| क्रॉन | कार्य |
|-------|-------|
| दैनिक | `handleCleanupAnonymous()` - 90 दिनों के निष्क्रिय उपयोगकर्ता साफ़ करें |
| प्रति 15 मिनट | `handleLiveClassReminders()` - लाइव क्लास अनुस्मारक |
| नए कोर्स पर | `handleNewCourseAnnouncement()` - कोर्स घोषणा |

---

## 6. ड्यूरेबल ऑब्जेक्ट्स (Durable Objects)

- `NotificationManager` - सूचना प्रबंधन के लिए ड्यूरेबल ऑब्जेक्ट

---

## 7. कतारें (Queues)

- `ya-lms-lesson-processing` - पाठ प्रसंस्करण कतार
- `ya-lms-push-notifications` - पुश सूचना कतार

---

## 8. वर्कफ़्लो (Workflows)

### `src/workflows.ts`
- `LessonTranscriptionWorkflow` - Whisper AI के साथ ऑडियो/वीडियो ट्रांसक्रिप्शन

---

## 9. मॉड्यूलर रूट्स

### `src/routes/auth.ts`
- `registerSchema` - Zod सत्यापन स्कीमा
- `handleRegisterModular()` - मॉड्यूलर पंजीकरण (भविष्य के लिए)

---

## 10. API एंडपॉइंट सारांश

```
/api/auth/*           → प्रमाणीकरण
/api/courses/*        → कोर्सेज (सार्वजनिक)
/api/books/*          → पुस्तकें (सार्वजनिक)
/api/enroll           → एनरोलमेंट
/api/exams/*          → परीक्षाएं
/api/credits/*        → क्रेडिट
/api/notifications/*  → सूचनाएं
/api/user/*           → उपयोगकर्ता डेटा
/api/admin/*          → एडमिन कार्य
/api/settings         → साइट सेटिंग्स
/api/contact          → संपर्क फॉर्म
/api/report-error     → त्रुटि रिपोर्ट
/api/firebase/config  → फायरबेस कॉन्फ़िग
```

---

यह दस्तावेज़ बैकएंड API की पूरी संरचना का विवरण प्रदान करता है।
