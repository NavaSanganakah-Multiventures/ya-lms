# प्रशासनिक सुविधाएं (Admin Features)

## अवलोकन
YA-LMS का एडमिन पैनल एक पूर्ण प्रबंधन इंटरफ़ेस प्रदान करता है जिसमें कोर्स, उपयोगकर्ता, बैच, भुगतान, सूचनाएं, और अधिक का CRUD शामिल है।

---

## 1. एडमिन लेआउट

### `app/admin/layout.tsx`
- साइडबार नेविगेशन (सभी एडमिन सेक्शन के लिंक)
- `AdminAI` फ्लोटिंग बटन
- `BackgroundUploadProvider`
- सत्र गार्ड

---

## 2. एडमिन पेजेस

### डैशबोर्ड
| पेज | विवरण |
|-----|--------|
| `app/admin/page.tsx` | मुख्य डैशबोर्ड: उपयोगकर्ता, कोर्सेज, एनरोलमेंट, राजस्व आंकड़े |

### कोर्सेज और श्रेणियां
| पेज | विवरण |
|-----|--------|
| `app/admin/courses/page.tsx` | कोर्स CRUD + AI सामग्री निर्माण + SEO + Google Merchant |
| `app/admin/course/page.tsx` | एकल कोर्स प्रबंधन (पाठ, लाइव सत्र) |
| `app/admin/categories/page.tsx` | कोर्स श्रेणियां CRUD |
| `app/admin/books/page.tsx` | पुस्तक CRUD |
| `app/admin/books/bookid/page.tsx` | पुस्तक पाठ प्रबंधन |

### बैचेज
| पेज | विवरण |
|-----|--------|
| `app/admin/batches/page.tsx` | बैच CRUD + कोर्स/बुक लिंकिंग + घोषणाएं + Google Calendar |

### उपयोगकर्ता और एनरोलमेंट
| पेज | विवरण |
|-----|--------|
| `app/admin/users/page.tsx` | उपयोगकर्ता प्रबंधन: सूची, संपादित, हटाएं (OTP), क्रेडिट, बैच असाइनमेंट |
| `app/admin/enrollments/page.tsx` | मैन्युअल एनरोलमेंट + OTP + प्रमाणपत्र जारी |
| `app/admin/subscribers/page.tsx` | ईमेल सब्सक्राइबर सूची |

### परीक्षाएं और फॉर्म
| पेज | विवरण |
|-----|--------|
| `app/admin/exams/page.tsx` | परीक्षा निर्माण + प्रश्न प्रबंधन + विश्लेषण |
| `app/admin/forms/page.tsx` | फॉर्म टेम्पलेट बिल्डर |
| `app/admin/form-responses/page.tsx` | फॉर्म सबमिशन देखें |

### भुगतान और लेखा
| पेज | विवरण |
|-----|--------|
| `app/admin/coupons/page.tsx` | डिस्काउंट कूपन प्रबंधन |
| `app/admin/subscription/page.tsx` | सब्सक्रिप्शन योजनाएं |
| `app/admin/accounting/page.tsx` | लेन-देन सूची + राजस्व आंकड़े |

### सूचनाएं और संचार
| पेज | विवरण |
|-----|--------|
| `app/admin/broadcast/page.tsx` | पुश ब्रॉडकास्ट (दर्शक लक्ष्यीकरण) |
| `app/admin/emails/page.tsx` | WYSIWYG ईमेल संपादक |
| `app/admin/scheduled-notifications/page.tsx` | निर्धारित सूचनाएं |
| `app/admin/leave-requests/page.tsx` | छुट्टी अनुरोध प्रबंधन |

### क्रेडिट और गेमिफिकेशन
| पेज | विवरण |
|-----|--------|
| `app/admin/credits/page.tsx` | क्रेडिट वॉलेट प्रबंधन |
| `app/admin/trophies/page.tsx` | बैज/ट्रॉफी CRUD |
| `app/admin/gamification/page.tsx` | XP, स्तर, पुरस्कार सेटिंग्स |

### एकीकरण (Integrations)
| पेज | विवरण |
|-----|--------|
| `app/admin/integrations/page.tsx` | Google Calendar + JWT टोकन |
| `app/admin/social-integrations/page.tsx` | Facebook, Instagram, LinkedIn, Telegram, Twitter |
| `app/admin/merchant/page.tsx` | Google Merchant Center सिंक |

### त्रुटि और ऑटोमेशन
| पेज | विवरण |
|-----|--------|
| `app/admin/error-sessions/page.tsx` | त्रुटि सत्र + Jules AI फिक्स |
| `app/admin/release-automation/page.tsx` | रिलीज़ अभियान + ईमेल + सोशल + लेख |

### सेटिंग्स और डेटाबेस
| पेज | विवरण |
|-----|--------|
| `app/admin/settings/page.tsx` | साइट सेटिंग्स |
| `app/admin/database/page.tsx` | मैन्युअल DB क्वेरी/माइग्रेशन |
| `app/admin/analytics/page.tsx` | प्लेटफ़ॉर्म विश्लेषण |

---

## 3. एडमिन API एंडपॉइंट्स (`src/index.ts`)

| एंडपॉइंट | विवरण |
|-----------|--------|
| `GET /api/admin/stats` | डैशबोर्ड आंकड़े |
| `GET/POST/PUT/DELETE /api/admin/users` | उपयोगकर्ता CRUD |
| `GET/POST/PUT/DELETE /api/admin/courses` | कोर्स CRUD |
| `GET/POST/PUT/DELETE /api/admin/categories` | श्रेणी CRUD |
| `GET/POST/PUT/DELETE /api/admin/batches` | बैच CRUD |
| `GET/POST/PUT/DELETE /api/admin/books` | पुस्तक CRUD |
| `POST /api/admin/enrollments` | एनरोलमेंट |
| `POST /api/admin/issue-certificate` | प्रमाणपत्र जारी |
| `GET/POST /api/admin/leaves` | छुट्टी प्रबंधन |
| `POST /api/admin/credits` | क्रेडिट प्रबंधन |
| `POST /api/admin/settings` | साइट सेटिंग्स |
| `POST /api/admin/broadcast` | पुश ब्रॉडकास्ट |
| `POST /api/admin/emails` | ईमेल भेजें |
| `GET /api/admin/accounting` | लेखा/राजस्व |
| `GET/POST /api/admin/coupons` | कूपन |
| `GET/POST /api/admin/subscriptions` | सब्सक्रिप्शन |
| `GET/POST /api/admin/integrations` | एकीकरण |
| `GET/POST /api/admin/social` | सोशल मीडिया |
| `POST /api/admin/merchant` | Google Merchant |
| `POST /api/admin/gamification` | गेमिफिकेशन |
| `GET/POST /api/admin/database` | DB प्रबंधन |

---

## 4. एडमिन एक्शन OTP

खतरनाक कार्यों के लिए अतिरिक्त OTP सुरक्षा:
- उपयोगकर्ता हटाना
- क्रेडिट प्रबंधन
- प्रमाणपत्र जारी करना
- भुगतान एनरोलमेंट

### फ़ंक्शन:
- `handleAdminSendActionOTP()` - एक्शन OTP भेजें
- `verifyAdminActionOTP()` - एक्शन OTP सत्यापित करें

---

## 5. एडमिन AI

### `components/AdminAI.tsx`
- एडमिन पैनल के लिए फ्लोटिंग AI सहायक
- सभी एडमिन पेजों पर उपलब्ध
- एडमिन कार्यों में सहायता

---

यह दस्तावेज़ सभी प्रशासनिक सुविधाओं का विस्तृत विवरण प्रदान करता है।
