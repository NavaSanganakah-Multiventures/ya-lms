# उपयोगिता स्क्रिप्ट्स (Utility Scripts)

## अवलोकन
YA-LMS प्रोजेक्ट में कई छोटी उपयोगिता स्क्रिप्ट्स और टाइप डिक्लेरेशन फ़ाइलें हैं।

---

## 1. getSecretCode.js

### फ़ाइल: `getSecretCode.js`

**उद्देश्य:** `src/index.ts` से `getSecret` फ़ंक्शन को एक्सट्रैक्ट करना

**कार्य:**
- `getSecret()` फ़ंक्शन को regex से खोजता है
- डेवलपर उपयोगिता

**उपयोग:**
```bash
node getSecretCode.js
```

---

## 2. replace_schema_sql.py

### फ़ाइल: `replace_schema_sql.py`

**उद्देश्य:** `schema.sql` में `Lessons` टेबल को अपडेट करना

**कार्य:**
- `Lessons` CREATE TABLE को नए वर्ज़न से बदलता है
- नए कॉलम जोड़ता है: `batch_id`, `article`/`recording` types, `text_content`, `is_free`
- एक-बार माइग्रेशन हेल्पर

**उपयोग:**
```bash
python replace_schema_sql.py
```

---

## 3. test_get_vapid_public_key.ts

### फ़ाइल: `test_get_vapid_public_key.ts`

**उद्देश्य:** VAPID पब्लिक की एंडपॉइंट का परीक्षण

**कार्य:**
- Bun रनटाइम का उपयोग करता है
- की सेट न होने पर 404 का परीक्षण करता है
- की सेट होने पर 200 का परीक्षण करता है

**उपयोग:**
```bash
bun run test_get_vapid_public_key.ts
```

---

## 4. test_webhook.js

### फ़ाइल: `test_webhook.js`

**उद्देश्य:** Cloudflare RealtimeKit वेबहुक API डॉक्स URL फ़ेच करना

**कार्य:**
- Cloudflare RealtimeKit API URL फ़ेच करता है
- सरल डेवलपर उपयोगिता

**उपयोग:**
```bash
node test_webhook.js
```

---

## 5. ग्लोबल टाइप डिक्लेरेशन्स

### फ़ाइल: `global.d.ts`
```typescript
declare module '*.sql' {
  const content: string;
  export default content;
}
```
- `.sql` फ़ाइलों के लिए TypeScript मॉड्यूल डिक्लेरेशन
- `schema.sql` को इम्पोर्ट करने की अनुमति देता है

### फ़ाइल: `types.d.ts`
```typescript
declare module 'cloudflare:email' {
  // EmailWorker एंडपॉइंट टाइप्स
}
```
- `cloudflare:email` मॉड्यूल के लिए डिक्लेरेशन
- ईमेल भेजने के लिए आवश्यक

---

## 6. SEO मेटाडेटा

### फ़ाइल: `metadata.json`
```json
{
  "name": "Advanced YA LMS Platform",
  "description": "...",
  "requestFramePermissions": []
}
```
- डिफ़ॉल्ट SEO मेटाडेटा
- `app/layout.tsx` में `generateMetadata()` द्वारा उपयोग
- साइट का नाम, विवरण

---

## 7. फ्लटर बिल्ड/डेवलपमेंट दस्तावेज़

### `flutter/student_app/BUILD_APK.md`
- GitHub Actions के माध्यम से APK बिल्ड निर्देश
- Debug/release मोड
- आउटपुट: `flutter/student_app/apk/`

### `flutter/student_app/DEVELOPMENT.md`
- Flutter डेवलपमेंट गाइड
- सेटअप निर्देश

### `flutter/student_app/test_login_flow.sh`
- OTP लॉगिन फ्लो का Bash परीक्षण
- API कॉल्स: send OTP → verify OTP → profile
- कुकी हैंडलिंग

---

यह दस्तावेज़ सभी उपयोगिता स्क्रिप्ट्स और टाइप डिक्लेरेशन का विवरण प्रदान करता है।
