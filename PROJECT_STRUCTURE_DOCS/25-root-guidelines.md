# मूल दिशानिर्देश दस्तावेज़ (Root Guidelines)

## अवलोकन
YA-LMS प्रोजेक्ट के रूट में दो महत्वपूर्ण दस्तावेज़ हैं: `AI_CORE_RULES.md` और `DEVELOPER_MANUAL.md`। ये AI एजेंट और डेवलपर दोनों के लिए मार्गदर्शिका हैं।

---

## 1. AI_CORE_RULES.md (298 लाइनें)

### फ़ाइल: `AI_CORE_RULES.md`

यह फ़ाइल AI एजेंट (जैसे कि Kilo) के लिए मास्टर नियम निर्धारित करती है:

**भूमिका परिभाषा:**
- AI एजेंट की भूमिका और जिम्मेदारियां
- कोडिंग मानक और दिशानिर्देश

**प्रमुख निर्देश:**

| नियम | विवरण |
|------|--------|
| **पॉलीग्लॉट** | एकाधिक प्रोग्रामिंग भाषाओं में कोड लिखें |
| **प्राइम डायरेक्टिव** | केवल Cloudflare Workers, `output: export` सख्त वर्जित |
| **सीक्रेट्स** | KV के माध्यम से प्रबंधित, कोड में हार्डकोड न करें |
| **कस्टम ऑथ** | पासवर्डलेस OTP-आधारित प्रमाणीकरण |
| **एरर हैंडलिंग** | सम्पूर्ण try-catch, Jules ऑटोमेशन |
| **DB माइग्रेशन** | `db-migrate.ts` ऑटो-माइग्रेशन का उपयोग करें |
| **Git वर्कफ़्लो** | कोई rebase नहीं, `dev` ब्रांच का उपयोग करें |

---

## 2. DEVELOPER_MANUAL.md (339 लाइनें)

### फ़ाइल: `DEVELOPER_MANUAL.md`

यह फ़ाइल AI एजेंट और डेवलपर के लिए एक संपूर्ण मार्गदर्शिका है:

**तकनीकी स्टैक:**
- Next.js 15 + React 19 फ्रंटएंड
- Cloudflare Workers बैकएंड
- D1 (SQLite) डेटाबेस
- R2 स्टोरेज
- Razorpay भुगतान
- Firebase Cloud Messaging

**त्वरित कमांड्स:**
```
npm run dev     → डेवलपमेंट सर्वर
npm run build   → प्रोडक्शन बिल्ड
npm run deploy  → Cloudflare डिप्लॉय
```

**आर्किटेक्चर नियम:**
- कोई Next.js API रूट्स नहीं (सब कुछ Worker में)
- `next.config.ts` /api/* को Worker पर रीराइट करता है
- कोई `output: export` नहीं (सभी SSR डायनामिक)

**FCM सेटअप (प्लेटफ़ॉर्म-वाइज़):**

| प्लेटफ़ॉर्म | सेटअप निर्देश |
|-------------|---------------|
| **वेब** | Firebase कॉन्फ़िग → FCM v1 API → Service Worker |
| **Flutter Android** | google-services.json, Firebaseプロजेक्ट सेटअप |
| **Flutter iOS** | GoogleService-Info.plist, APNs सेटअप |

**FlutterFire CLI कमांड्स:**
```bash
flutterfire configure --project=your-project-id
```

**एंड-टू-एंड नोटिफिकेशन फ़्लो:**
1. FCM टोकन जनरेशन (क्लाइंट)
2. डिवाइस पंजीकरण → `/api/notifications/register-device`
3. बैकएंड से FCM v1 HTTP API कॉल
4. Service Worker receive + display

**टोकन लाइफसाइकिल:**
- JWT: छात्र 1.5h, एडमिन 2.5h
- रिफ्रेश: एक्टिविटी पिंग के माध्यम से
- निष्क्रियता: 1h (स्वचालित लॉगआउट)

**समस्या समाधान तालिका:**
| समस्या | समाधान |
|---------|---------|
| FCM टोकन नहीं मिल रहा | Firebase कॉन्फ़िग जांचें |
| पुश नहीं जा रहा | VAPID की / FCM क्रेडेंशियल्स जांचें |
| JWT एक्सपायर | `/api/auth/refresh-session` कॉल करें |
| CORS एरर | `APP_URL` env वेरिएबल जांचें |

**RBAC (Role-Based Access Control):**
- `requireAuth()` - बेसिक ऑथ
- `requireAdmin()` - एडमिन ओनली
- `requireAdminOrTeacher()` - एडमिन + टीचर

**प्रोजेक्ट संरचना:**
- `app/` - Next.js पेजेस
- `components/` - शेयर्ड कंपोनेंट्स
- `src/` - Cloudflare Worker
- `translations/` - i18n फ़ाइलें

**व्यावसायिक नियम:**
- 10 क्रेडिट = ₹1 (डिफ़ॉल्ट)
- AI कॉल: 2 क्रेडिट प्रति क्वेरी
- छात्र सत्र: 1.5h, एडमिन: 2.5h
- निष्क्रियता: 1h के बाद लॉगआउट

---

यह दस्तावेज़ मूल दिशानिर्देश दस्तावेज़ों का सारांश प्रदान करता है।
