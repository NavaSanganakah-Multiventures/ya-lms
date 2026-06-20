# सर्विस वर्कर (Service Workers)

## अवलोकन
YA-LMS में दो सर्विस वर्कर हैं: एक **Firebase Cloud Messaging (FCM)** के लिए और एक **Web Push** के लिए।

---

## 1. FCM सर्विस वर्कर

### फ़ाइल: `public/firebase-messaging-sw.js` (111 लाइनें)

**उद्देश्य:** Firebase Cloud Messaging से पुश सूचनाएं प्राप्त करना

**कार्यप्रणाली:**

1. **आरंभीकरण:**
   - `/api/firebase/config` से Firebase कॉन्फ़िग फ़ेच करता है
   - Firebase कॉम्पैट SDK से initialize करता है
   - `onBackgroundMessage` हैंडलर सेट करता है

2. **push ईवेंट हैंडलिंग:**
   ```javascript
   self.addEventListener('push', function(event) {
     // FCM पेलोड पार्स करें
     // आइकन, बैज, एक्शन के साथ सूचना दिखाएं
   });
   ```

3. **notificationclick ईवेंट हैंडलिंग:**
   ```javascript
   self.addEventListener('notificationclick', function(event) {
     // सूचना बंद करें
     // क्लिक URL को सत्यापित करें (same-origin)
     // विंडो खोलें/फ़ोकस करें
   });
   ```

**मुख्य विशेषताएं:**
- FCM पेलोड पार्सिंग
- आइकन, बैज, और एक्शन बटन के साथ सूचना
- सुरक्षित URL नेविगेशन (same-origin सत्यापन)

---

## 2. वेब पुश सर्विस वर्कर

### फ़ाइल: `public/sw.js` (47 लाइनें)

**उद्देश्य:** मूल Web Push API से पुश सूचनाएं प्राप्त करना

**कार्यप्रणाली:**

1. **push ईवेंट:**
   ```javascript
   self.addEventListener('push', (event) => {
     // JSON पेलोड पार्स करें
     // सूचना दिखाएं
   });
   ```

2. **notificationclick ईवेंट:**
   ```javascript
   self.addEventListener('notificationclick', (event) => {
     // सूचना बंद करें
     // URL पर नेविगेट करें
   });
   ```

---

## 3. दोनों सर्विस वर्कर की तुलना

| विशेषता | FCM (`firebase-messaging-sw.js`) | Web Push (`sw.js`) |
|----------|----------------------------------|---------------------|
| **प्रोटोकॉल** | Firebase Cloud Messaging | Web Push API (VAPID) |
| **पेलोड प्रारूप** | FCM पेलोड | JSON |
| **आकार** | 111 लाइनें | 47 लाइनें |
| **जटिलता** | अधिक (Firebase SDK + FCM) | सरल |
| **एक्शन बटन** | हां | नहीं |
| **URL सत्यापन** | Same-origin | कोई सत्यापन नहीं |

---

## 4. सर्विस वर्कर पंजीकरण

सर्विस वर्कर `FirebaseInit` कंपोनेंट के माध्यम से पंजीकृत होता है:

1. `NotificationPrompt` अनुमति मांगता है
2. `FirebaseInit` FCM टोकन प्राप्त करता है
3. टोकन `/api/notifications/register-device` पर पंजीकृत होता है

---

## 5. फ़ॉन्ट फ़ाइल

### `public/fonts/NotoSansDevanagari-Regular.ttf`
- देवनागरी फ़ॉन्ट (Google Noto Sans Devanagari)
- उपयोग: `lib/pdfGenerator.ts` में प्रमाणपत्र PDF के लिए
- हिंदी टेक्स्ट को PDF में रेंडर करने के लिए आवश्यक

---

## 6. ऐप आइकन

### `public/icon.png`
- एप्लिकेशन आइकन
- पुश सूचनाओं और PWA में उपयोग

---

यह दस्तावेज़ सर्विस वर्कर और स्थैतिक संसाधनों का विवरण प्रदान करता है।
