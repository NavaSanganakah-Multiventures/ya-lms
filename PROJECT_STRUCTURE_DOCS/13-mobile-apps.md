# मोबाइल एप्लिकेशन (Mobile Apps - Flutter)

## अवलोकन
YA-LMS में दो **Flutter** मोबाइल एप्लिकेशन हैं: एक छात्रों के लिए और एक एडमिन के लिए। दोनों ऐप Cloudflare Worker API के साथ HMAC-हस्ताक्षरित अनुरोधों के माध्यम से संचार करते हैं।

---

## 1. स्टूडेंट ऐप (Student App)

### स्थान: `flutter/student_app/`

### मुख्य फ़ाइलें:

| फ़ाइल | विवरण |
|-------|--------|
| `lib/main.dart` | ऐप एंट्री, Firebase init, AuthProvider, डार्क थीम |
| `lib/providers/auth_provider.dart` | प्रमाणीकरण स्थिति प्रबंधन |
| `lib/services/api_service.dart` | HTTP क्लाइंट, HMAC सिग्नेचर, कुकी प्रबंधन |
| `lib/services/notification_service.dart` | FCM पुश सूचनाएं |
| `lib/services/notification_background.dart` | पृष्ठभूमि FCM हैंडलर |
| `lib/services/picture_in_picture_service.dart` | PiP समर्थन |
| `lib/theme/app_theme.dart` | डार्क थीम, auroraGradient, sacredGradient |

### स्क्रीन्स (Screens):

| स्क्रीन | फ़ाइल | विवरण |
|---------|-------|--------|
| **लॉगिन** | `login_screen.dart` | OTP-आधारित लॉगिन (ईमेल → OTP → सत्यापन) |
| **डैशबोर्ड** | `dashboard_screen.dart` | कोर्सेज, लाइव क्लासेज, पुल-टू-रिफ्रेश |
| **कोर्स विवरण** | `course_detail_screen.dart` | पाठ सूची, लाइव सत्र, वीडियो प्लेयर |
| **लाइव क्लास** | `live_class_realtimekit_screen.dart` | RealtimeKit UI + PiP |
| **प्रोफ़ाइल** | `profile_screen.dart` | नाम, ईमेल, फोन, लॉगआउट |
| **पुस्तकें** | `books_screen.dart` | पुस्तक सूची (शीर्षक, लेखक, मूल्य) |
| **चेकआउट** | `checkout_screen.dart` | Razorpay भुगतान |

### निर्भरताएं:
- `firebase_core`, `firebase_messaging` - FCM
- `http` - API कॉल
- `shared_preferences` - कुकी भंडारण
- `provider` - स्थिति प्रबंधन
- `razorpay_flutter` - भुगतान
- `chewie`, `video_player` - वीडियो
- `realtimekit_ui` - लाइव क्लास
- `flutter_local_notifications` - स्थानीय सूचनाएं

---

## 2. एडमिन ऐप (Admin App)

### स्थान: `flutter/admin_app/`

### मुख्य फ़ाइलें:

| फ़ाइल | विवरण |
|-------|--------|
| `lib/main.dart` | ऐप एंट्री, bottom nav (4 टैब), WebView |
| `lib/providers/admin_provider.dart` | एडमिन प्रमाणीकरण + डैशबोर्ड आंकड़े |
| `lib/services/admin_api_service.dart` | HTTP क्लाइंट + कुकी प्रबंधन |
| `lib/services/admin_routes.dart` | URL स्थिरांक (prod/localhost) |
| `lib/services/notification_service.dart` | FCM सूचनाएं |
| `lib/services/notification_background.dart` | पृष्ठभूमि FCM हैंडलर |
| `lib/theme/app_theme.dart` | डार्क थीम |

### स्क्रीन्स:

| स्क्रीन | फ़ाइल | विवरण |
|---------|-------|--------|
| **डैशबोर्ड** | `admin_dashboard_screen.dart` | स्टैट्स कार्ड, त्वरित कार्रवाइयां, राजस्व चार्ट |
| **कोर्स प्रबंधन** | `manage_courses_screen.dart` | WebView के माध्यम से वेब एडमिन |
| **उपयोगकर्ता प्रबंधन** | `manage_users_screen.dart` | WebView के माध्यम से वेब एडमिन |
| **लाइव क्लास** | `live_classes_admin_screen.dart` | WebView के माध्यम से वेब एडमिन |

### निर्भरताएं:
- flutter, firebase_core, firebase_messaging
- http, shared_preferences, provider
- webview_flutter

---

## 3. ऐप सिग्नेचर (App Signature)

Flutter ऐप्स API अनुरोधों को HMAC-SHA256 से हस्ताक्षरित करते हैं:

```
X-App-Signature: HMAC-SHA256(secret, method + path + timestamp + body)
X-App-Timestamp: <current_unix_timestamp>
```

बैकएंड `verifyAppSignature()` फ़ंक्शन से इसे सत्यापित करता है:
- टाइमस्टैम्प रीप्ले अटैक से बचाता है
- गुप्त कुंजी KV में संग्रहीत
- Flutter और बैकएंड के बीच सुरक्षित संचार

---

## 4. API सेवाएं

### स्टूडेंट API सेवा (`api_service.dart`):
- `sendOtp()`, `verifyOtp()`, `logout()` - प्रमाणीकरण
- `getDashboardData()`, `getBooks()`, `getCourses()` - डेटा प्राप्ति
- `getCourseLessons()`, `getLiveSessions()` - कोर्स/लाइव
- `createRazorpayOrder()`, `verifyRazorpayPayment()` - भुगतान
- `getLiveClassToken()`, `leaveLiveClass()` - लाइव क्लास

### एडमिन API सेवा (`admin_api_service.dart`):
- `login()` - लॉगिन
- `getDashboardStats()` - डैशबोर्ड
- `getCourses()`, `getUsers()`, `getLiveClasses()` - प्रबंधन

---

## 5. सूचनाएं (Notifications)

दोनों ऐप्स FCM के माध्यम से पुश सूचनाएं प्राप्त करते हैं:
- अग्रभूमि हैंडलर → स्थानीय सूचना दिखाएं
- पृष्ठभूमि हैंडलर → स्वचालित सूचना
- डिवाइस पंजीकरण → `/api/notifications/register-device`

---

## 6. बिल्ड और डिप्लॉयमेंट

- `BUILD_APK.md` - APK बिल्ड निर्देश
- `DEVELOPMENT.md` - डेवलपमेंट गाइड
- `test_login_flow.sh` - लॉगिन फ्लो टेस्ट

---

यह दस्तावेज़ Flutter मोबाइल एप्लिकेशन की पूरी जानकारी प्रदान करता है।
