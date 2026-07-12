# अन्य सुविधाएं (Other Features)

## अवलोकन
यह दस्तावेज़ उन सुविधाओं का वर्णन करता है जो अन्य श्रेणियों में कवर नहीं की गई हैं।

---

## 1. पुस्तकें (Books)

### डेटाबेस टेबल: `Books`
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | पुस्तक आईडी |
| `title` | शीर्षक |
| `author` | लेखक |
| `description` | विवरण |
| `price_rupees` | मूल्य |
| `cover_image_url` | कवर छवि |
| `status` | `active` / `inactive` |

### UI पेजेस:
- `app/book/BookClient.tsx` - सार्वजनिक पुस्तक विवरण
- `app/dashboard/book/page.tsx` - डैशबोर्ड पुस्तक विवरण
- `app/dashboard/book/learn/page.tsx` - पुस्तक पाठक (अध्याय-दर-अध्याय)
- `app/admin/books/page.tsx` - एडमिन पुस्तक CRUD
- `app/admin/books/bookid/page.tsx` - पुस्तक पाठ प्रबंधन

### Flutter:
- `flutter/student_app/lib/screens/books_screen.dart` - पुस्तक सूची

---

## 2. छुट्टी प्रबंधन (Leave Management)

### डेटाबेस टेबल: `LeaveRequests`
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अनुरोध आईडी |
| `user_id` | छात्र आईडी |
| `course_id` | कोर्स आईडी |
| `start_date` / `end_date` | तिथि सीमा |
| `reason` | कारण |
| `status` | `pending` / `approved` / `rejected` |
| `admin_notes` | एडमिन नोट्स |

### UI:
- `app/dashboard/leave/page.tsx` - छुट्टी आवेदन + इतिहास + आंकड़े
- `app/admin/leave-requests/page.tsx` - अनुमोदन/अस्वीकृति + फ़िल्टर

### API:
- `POST /api/leave/apply` - छुट्टी आवेदन
- `GET /api/leave/my-leaves` - मेरी छुट्टियां
- `GET /api/leave/stats` - छुट्टी आंकड़े
- `POST /api/admin/leaves` - एडमिन प्रबंधन

### Google Calendar सिंक:
लीव अनुरोध स्वचालित रूप से Google Calendar से सिंक होते हैं।

---

## 3. व्यक्तिगत बुकिंग (Individual Bookings)

### डेटाबेस टेबल: `IndividualBookings`
- 1-ऑन-1 क्लास बुकिंग
- शिक्षकों के साथ व्यक्तिगत सत्र

### UI:
- `app/dashboard/individual-bookings/page.tsx` - छात्र बुकिंग
- `app/admin/individual-classes/page.tsx` - एडमिन प्रबंधन

---

## 4. साइट सेटिंग्स (Site Settings)

### डेटाबेस टेबल: `SiteSettings`
Key-value स्टोर:
- साइट शीर्षक
- लोगो URL
- सोशल मीडिया लिंक
- संपर्क जानकारी
- SEO सेटिंग्स

### UI:
- `app/admin/settings/page.tsx` - सेटिंग्स प्रबंधन
- `GET /api/settings` - सार्वजनिक सेटिंग्स एंडपॉइंट

---

## 5. SEO और मेटाडेटा

### फ़ाइलें:
- `metadata.json` - डिफ़ॉल्ट SEO मेटाडेटा
- `app/sitemap.ts` - डायनामिक साइटमैप जनरेशन
- `app/robots.ts` - robots.txt कॉन्फ़िगरेशन
- `app/layout.tsx` - `generateMetadata()` से मेटाडेटा

### कोर्स SEO:
- प्रति कोर्स `seo_title` और `seo_description` फ़ील्ड्स

---

## 6. Google Merchant Center

### `app/admin/merchant/page.tsx`
- कोर्स को Google Merchant Center उत्पादों के रूप में सिंक करें

### डेटाबेस टेबल: `MerchantProducts`
- उत्पाद आईडी
- कोर्स आईडी
- सिंक स्थिति

---

## 7. ईमेल सब्सक्राइबर्स

### डेटाबेस टेबल: `Subscribers`
- ईमेल पता
- सब्सक्रिप्शन तिथि
- स्थिति

### UI:
- `app/admin/subscribers/page.tsx` - सब्सक्राइबर सूची

---

## 8. प्रमाणपत्र (Certificates)

### PDF जनरेशन: `lib/pdfGenerator.ts`
- A4 लैंडस्केप PDF
- देवनागरी फ़ॉन्ट (NotoSansDevanagari)
- केसरिया/सुनहरा बॉर्डर
- छात्र का नाम, कोर्स, तिथि

### ट्रिगर:
- 100% पाठ्यक्रम पूर्णता + `certificate_eligible = true`
- `POST /api/courses/:id/complete-lesson` → प्रगति जांच
- `GET /api/courses/:id/certificate` → PDF डाउनलोड

### एडमिन जारी:
- `POST /api/admin/issue-certificate` (OTP-सुरक्षित)
