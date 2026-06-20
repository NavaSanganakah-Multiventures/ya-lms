# त्रुटि निगरानी (Error Monitoring)

## अवलोकन
YA-LMS में एक पूर्ण त्रुटि निगरानी प्रणाली है जो क्लाइंट-साइड और सर्वर-साइड त्रुटियों को कैप्चर, लॉग और ऑटोमेटेड रूप से ठीक करती है।

---

## 1. डेटाबेस टेबल

### ErrorSessions
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी |
| `fingerprint` | SHA-256 त्रुटि फ़िंगरप्रिंट (डिडप्लिकेशन के लिए) |
| `error_type` | त्रुटि प्रकार |
| `error_message` | त्रुटि संदेश |
| `stack_trace` | स्टैक ट्रेस |
| `url` | त्रुटि का URL |
| `user_id` | उपयोगकर्ता (यदि लॉग इन हो) |
| `user_agent` | ब्राउज़र जानकारी |
| `status` | `open` / `in_progress` / `resolved` / `ignored` |
| `severity` | `low` / `medium` / `high` / `critical` |
| `created_at` | तिथि |

### ErrorSessionEvents
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | ईवेंट आईडी |
| `error_session_id` | सत्र आईडी |
| `event_type` | `prompt_generated` / `sent_to_jules` / `jules_completed` |
| `event_data` | डेटा (JSON) |
| `created_at` | तिथि |

---

## 2. फ्रंटएंड त्रुटि हैंडलिंग

### GlobalErrorBoundary (`components/GlobalErrorBoundary.tsx`)
React त्रुटि सीमा:
- रेंडर त्रुटियों को कैप्चर करता है
- "क्षमा करें" फ़ॉलबैक UI दिखाता है
- `/api/report-error` पर स्वचालित रिपोर्ट
- पुनः प्रयास बटन

### GlobalErrorListener (`components/GlobalErrorListener.tsx`)
वैश्विक त्रुटि श्रोता:
- `window.onerror` + `window.onunhandledrejection` को सुनता है
- ऑफ़लाइन कतार (localStorage, अधिकतम 3 पुनर्प्रयास)
- ResizeObserver / Load failed नॉइज़ फ़िल्टर करता है
- सभी त्रुटियों को `/api/report-error` पर भेजता है

---

## 3. बैकएंड त्रुटि हैंडलिंग (`src/index.ts`)

### `handleGlobalError()`
ग्लोबल एरर हैंडलर:
1. ErrorSession बनाता है (SHA-256 फ़िंगरप्रिंट)
2. गंभीर त्रुटियों के लिए अलर्ट भेजता है (ईमेल + WhatsApp)
3. Jules ऑटोमेशन चलाता है

### `handleReportError()`
क्लाइंट से त्रुटि रिपोर्ट एंडपॉइंट:
- POST `/api/report-error`
- फ़्रंटएंड से सभी त्रुटियां यहां आती हैं

### `createErrorSessionFromPayload()`
- SHA-256 फ़िंगरप्रिंट से डिडप्लिकेशन (30 मिनट विंडो)
- ErrorSessions टेबल में स्टोर

### `runErrorAutomation()`
- Gemini के माध्यम से AI प्रॉम्प्ट जनरेट करता है
- Jules API को भेजता है
- जॉब एक्टिविटी ट्रैक करता है

---

## 4. एडमिन त्रुटि प्रबंधन

### `app/admin/error-sessions/page.tsx`
त्रुटि सत्र प्रबंधन इंटरफ़ेस:
- सभी त्रुटियों की सूची
- Jules AI फिक्स ऑटोमेशन
- प्रॉम्प्ट जनरेट करें / भेजें / अनदेखा करें / हल करें

### API एंडपॉइंट्स:
| एंडपॉइंट | विवरण |
|-----------|--------|
| `GET /api/admin/error-sessions` | सूची |
| `GET /api/admin/error-sessions/:id` | विवरण |
| `POST /api/admin/error-sessions/:id/generate-prompt` | AI प्रॉम्प्ट जनरेशन |
| `POST /api/admin/error-sessions/:id/send-to-jules` | Jules को भेजें |
| `POST /api/admin/error-sessions/:id/ignore` | अनदेखा करें |
| `POST /api/admin/error-sessions/:id/resolve` | हल करें |

---

## 5. त्रुटि प्रवाह

```
GlobalErrorBoundary / GlobalErrorListener
    │ (क्लाइंट त्रुटि कैप्चर)
    ▼
POST /api/report-error (src/index.ts)
    │
    ├── createErrorSessionFromPayload()
    │   ├── SHA-256 फ़िंगरप्रिंट
    │   ├── डिडप्लिकेशन (30 मिनट)
    │   └── DB में सेव
    │
    ├── sendRedAlert() [गंभीर त्रुटियों के लिए]
    │   ├── ईमेल (Cloudflare Email)
    │   └── WhatsApp (Infobip)
    │
    └── runErrorAutomation()
        ├── Gemini प्रॉम्प्ट जनरेशन
        └── Jules AI को भेजें
```

---

## 6. एडमिन अलर्ट

### `sendRedAlert()`
गंभीर त्रुटियों के लिए आपातकालीन अलर्ट:
- ईमेल (HTML टेम्पलेट)
- WhatsApp (Infobip API)

### `logAdminActivity()`
एडमिन कार्यों के लिए ईमेल अलर्ट:
- जब एडमिन कोई महत्वपूर्ण कार्रवाई करता है

---

यह दस्तावेज़ त्रुटि निगरानी प्रणाली का विस्तृत विवरण प्रदान करता है।
