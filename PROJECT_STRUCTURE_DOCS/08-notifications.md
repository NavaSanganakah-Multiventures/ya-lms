# सूचना प्रणाली (Notification System)

## अवलोकन
YA-LMS में एक बहु-चैनल सूचना प्रणाली है जो **Firebase Cloud Messaging (FCM)**, **Web Push (VAPID)**, **ईमेल**, और **सोशल मीडिया** का समर्थन करती है।

---

## 1. पुश नोटिफिकेशन

### FCM (Firebase Cloud Messaging)
- **FCM HTTP v1 API** का उपयोग (कोई SDK नहीं)
- वेब और Flutter दोनों के लिए एकीकृत
- OAuth2 JWT के साथ सेवा खाता प्रमाणीकरण

### Web Push (VAPID)
- `@pushforge/builder` लाइब्रेरी
- ब्राउज़र सूचनाएं
- पुश सब्सक्रिप्शन प्रबंधन

---

## 2. डेटाबेस टेबल

### PushSubscriptions
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी |
| `user_id` | उपयोगकर्ता आईडी |
| `endpoint` | पुश एंडपॉइंट |
| `p256dh` / `auth` | वेब पुश कुंजियां |
| `fcm_token` | FCM टोकन |
| `device_id` | डिवाइस आईडी |
| `platform` | `web` / `android` |
| `active` | सक्रिय/निष्क्रिय |

### Notifications
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी |
| `user_id` | प्राप्तकर्ता |
| `title` / `body` | शीर्षक/सामग्री |
| `type` | `course` / `live_class` / `admin` / `system` |
| `read` | पढ़ा/नहीं पढ़ा |
| `created_at` | तिथि |

### ScheduledNotifications
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी |
| `title` / `body` | सामग्री |
| `frequency` | `once` / `daily` / `weekly` / `monthly` |
| `scheduled_time` | निर्धारित समय |
| `audience` | लक्षित दर्शक (JSON) |
| `status` | `active` / `paused` |
| `timezone` | समय क्षेत्र |

---

## 3. फ्रंटएंड कंपोनेंट्स

### NotificationBell (`components/NotificationBell.tsx`)
- बिना पढ़ी सूचनाओं की संख्या (बैज)
- सूची के साथ ड्रॉपडाउन
- पढ़ी गई चिह्नित करें
- अनंत स्क्रॉल

### NotificationPrompt (`components/NotificationPrompt.tsx`)
- पुश अनुमति के लिए संकेत
- पुश सब्सक्रिप्शन पंजीकरण

### FirebaseInit (`components/FirebaseInit.tsx`)
- Firebase Messaging आरंभीकरण
- FCM टोकन प्राप्त करना

---

## 4. एडमिन ब्रॉडकास्ट

### `app/admin/broadcast/page.tsx`
- दर्शक लक्ष्यीकरण (कोर्स/बैच/कस्टम)
- शेड्यूलिंग
- पुश नोटिफिकेशन ब्रॉडकास्ट

### `app/admin/emails/page.tsx`
- WYSIWYG ईमेल संपादक
- ड्रैग-ड्रॉप वेरिएबल्स
- टेम्पलेट + ड्राफ्ट सेव

### `app/admin/scheduled-notifications/page.tsx`
- आवर्ती सूचनाएं (दैनिक/साप्ताहिक/मासिक)
- समय क्षेत्र-जागरूक

---

## 5. बैकएंड हैंडलर (`src/index.ts`)

| फ़ंक्शन | विवरण |
|----------|--------|
| `sendWebPush()` | वेब पुश भेजें (VAPID) |
| `sendFCM()` | FCM पुश भेजें |
| `executePushBroadcast()` | सामूहिक ब्रॉडकास्ट |
| `handleNotificationSubscribe()` | सब्सक्रिप्शन पंजीकरण |
| `handleNotificationUnsubscribe()` | सब्सक्रिप्शन रद्द करें |
| `handleRegisterDevice()` | FCM डिवाइस पंजीकरण |
| `handleSendPush()` | एडमिन पुश भेजें |

---

## 6. क्रॉन जॉब (Cron Jobs)

- `handleCleanupAnonymous()` - 90 दिनों के निष्क्रिय अज्ञात उपयोगकर्ताओं को साफ़ करें
- `handleLiveClassReminders()` - लाइव क्लास से 15 मिनट पहले रिमाइंडर
- `handleNewCourseAnnouncement()` - नए कोर्स की घोषणा

---

## 7. ईमेल सिस्टम

### सुविधाएं:
- HTML ईमेल टेम्पलेट
- Cloudflare Email Workers (SEND_EMAIL बाइंडिंग)
- MIME संदेश (`mimetext` लाइब्रेरी)

### मुख्य फ़ंक्शन:
- `safeSendEmail()` - ईमेल भेजना
- `generateEmailHTML()` - HTML ईमेल जनरेशन
- `sendRedAlert()` - आपातकालीन ईमेल + WhatsApp (Infobip)

---

## 8. सोशल मीडिया पोस्टिंग

`src/index.ts` में सोशल ऑटो-पोस्टिंग:
- Facebook
- Instagram
- LinkedIn
- Telegram
- Twitter/X

`postToSocialChannels()` - कोर्स/बैच घोषणाओं का स्वचालित पोस्ट

---

यह दस्तावेज़ सूचना प्रणाली का विस्तृत विवरण प्रदान करता है।
