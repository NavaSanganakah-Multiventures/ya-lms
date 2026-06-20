# फायरबेस और FCM एकीकरण (Firebase & FCM Integration)

## अवलोकन
YA-LMS **Firebase Cloud Messaging (FCM)** का उपयोग करके वेब और मोबाइल दोनों प्लेटफ़ॉर्म पर पुश सूचनाएं भेजता है।

---

## 1. फायरबेस कॉन्फ़िगरेशन

### लाइब्रेरी: `lib/firebase-config.ts` (27 लाइनें)

**कार्य:**
```typescript
async function initializeFirebase() {
  // /api/firebase/config से कॉन्फ़िग फ़ेच करें
  const response = await fetch('/api/firebase/config');
  const firebaseConfig = await response.json();
  
  // Firebase App initialize करें
  const app = initializeApp(firebaseConfig);
  return app;
}
```

**मुख्य विशेषताएं:**
- कॉन्फ़िग सर्वर-साइड से डायनामिक रूप से फ़ेच होता है
- क्लाइंट कोड में कोई API कुंजी हार्डकोड नहीं

---

## 2. FirebaseInit कंपोनेंट

### फ़ाइल: `components/FirebaseInit.tsx` (124 लाइनें)

**उद्देश्य:** Firebase Messaging को आरंभ करना और FCM टोकन प्राप्त करना

**कार्यप्रवाह:**
1. Firebase ऐप को आरंभ करें
2. Firebase Messaging प्राप्त करें
3. FCM टोकन के लिए अनुरोध करें
4. foreground `onMessage` हैंडलर सेट करें → टोस्ट दिखाएं
5. टोकन को डिवाइस पंजीकरण API पर भेजें

---

## 3. NotificationPrompt कंपोनेंट

### फ़ाइल: `components/NotificationPrompt.tsx` (195 लाइनें)

**उद्देश्य:** पुश सूचना अनुमति के लिए उपयोगकर्ता से पूछना

**कार्यप्रवाह:**
1. अनुमति बैनर दिखाएं ("हां, अनुमति दें" / "बाद में")
2. FCM सब्सक्रिप्शन फ़्लो शुरू करें
3. एरर हैंडलिंग
4. VAPID की फ़ेच करें

**UI:**
- "हां, अनुमति दें" बटन
- "बाद में" बटन
- एरर स्टेट

---

## 4. डिवाइस पंजीकरण

### API एंडपॉइंट्स:

| एंडपॉइंट | विधि | विवरण |
|-----------|------|--------|
| `/api/notifications/register-device` | POST | नया FCM डिवाइस पंजीकृत करें |
| `/api/notifications/unregister-device` | POST | डिवाइस हटाएं |
| `/api/notifications/subscribe` | POST | वेब पुश सब्सक्राइब करें |
| `/api/notifications/unsubscribe` | POST | वेब पुश अनसब्सक्राइब करें |
| `/api/notifications/associate-user` | POST | अज्ञात डिवाइस को उपयोगकर्ता से जोड़ें |
| `/api/notifications/my-devices` | GET | मेरे डिवाइस की सूची |

### डेटाबेस टेबल: `PushSubscriptions`
- `fcm_token` - FCM टोकन
- `device_id` - अद्वितीय डिवाइस आईडी
- `platform` - `web` / `android`
- `active` - सक्रिय/निष्क्रिय

---

## 5. FCM वी संस्करण HTTP API

### बैकएंड हैंडलिंग (`src/index.ts`):

**`sendFCM()` फ़ंक्शन:**
- FCM HTTP v1 API का उपयोग करता है (कोई SDK नहीं)
- OAuth2 JWT के साथ सेवा खाता प्रमाणीकरण
- वेब और Flutter दोनों के लिए एकीकृत

**FCM पेलोड प्रारूप:**
```json
{
  "message": {
    "token": "device_fcm_token",
    "notification": {
      "title": "सूचना शीर्षक",
      "body": "सूचना सामग्री"
    },
    "webpush": {
      "fcm_options": {
        "link": "/dashboard"
      }
    }
  }
}
```

---

## 6. सेवा खाता प्रबंधन

- FCM सेवा खाता क्रेडेंशियल्स KV में संग्रहीत
- `getSecret()` फ़ंक्शन के माध्यम से पुनर्प्राप्त
- OAuth2 JWT स्वचालित रूप से जनरेट और रिफ्रेश

---

## 7. संपूर्ण पुश नोटिफिकेशन फ़्लो

```
1. FCM टोकन जनरेशन (FirebaseInit कंपोनेंट)
2. डिवाइस पंजीकरण → /api/notifications/register-device
3. बैकएंड FCM v1 HTTP API कॉल (sendFCM)
4. Service Worker receive + display (firebase-messaging-sw.js)
5. notificationclick → URL नेविगेशन
```

---

यह दस्तावेज़ फायरबेस और FCM एकीकरण का विस्तृत विवरण प्रदान करता है।
