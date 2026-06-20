# फ्रंटएंड UI (Frontend UI)

## अवलोकन
YA-LMS का फ्रंटएंड **Next.js 15 App Router** का उपयोग करके बनाया गया है और यह **React 19**, **Tailwind CSS 4**, और **Framer Motion** का उपयोग करता है। सभी पेजेस **डायनामिक SSR** (सर्वर-साइड रेंडरिंग) हैं।

---

## 1. पेज संरचना (Page Structure)

### सार्वजनिक पेजेस (Public Pages)

| रूट | पेज | विवरण |
|------|------|--------|
| `/` | `app/page.tsx` | लैंडिंग पेज (हीरो, फीचर्स, कोर्सेज, स्टैट्स, CTA) |
| `/about` | `app/about/page.tsx` | Yagya Ashram के बारे में |
| `/contact` | `app/contact/page.tsx` | संपर्क फॉर्म |
| `/courses` | `app/courses/page.tsx` | कोर्स कैटलॉग |
| `/course/:id` | `app/course/CourseClient.tsx` | कोर्स विवरण |
| `/course/lesson/:id` | `app/course/lesson/page.tsx` | सार्वजनिक पाठ पूर्वावलोकन |
| `/book/:id` | `app/book/BookClient.tsx` | पुस्तक विवरण |
| `/live` | `app/live/page.tsx` | लाइव क्लासेज |
| `/recordings` | `app/recordings/page.tsx` | रिकॉर्डिंग्स |
| `/form/:id` | `app/form/page.tsx` | डायनामिक फॉर्म |
| `/trial/:id` | `app/trial/[id]/page.tsx` | निःशुल्क ट्रायल |
| `/legal-docs` | `app/legal-docs/page.tsx` | गोपनीयता/नियम/रिफंड नीति |

### प्रमाणीकरण पेजेस

| रूट | पेज | विवरण |
|------|------|--------|
| `/auth/login` | `app/auth/login/page.tsx` | ईमेल → OTP लॉगिन |
| `/auth/register` | `app/auth/register/page.tsx` | बहु-चरणीय पंजीकरण |

### डैशबोर्ड पेजेस (Dashboard)

| रूट | पेज | विवरण |
|------|------|--------|
| `/dashboard` | `app/dashboard/page.tsx` | मुख्य डैशबोर्ड (स्टैट्स, लाइव, गतिविधि) |
| `/dashboard/my-courses` | `app/dashboard/my-courses/page.tsx` | एनरोल्ड कोर्सेज |
| `/dashboard/course/:id` | `app/dashboard/course/page.tsx` | कोर्स विवरण |
| `/dashboard/course/:id/learn` | `app/dashboard/course/learn/page.tsx` | पाठ प्लेयर |
| `/dashboard/book/:id` | `app/dashboard/book/page.tsx` | पुस्तक विवरण |
| `/dashboard/book/:id/learn` | `app/dashboard/book/learn/page.tsx` | पुस्तक पाठक |
| `/dashboard/profile` | `app/dashboard/profile/page.tsx` | प्रोफ़ाइल |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | सेटिंग्स |
| `/dashboard/subscription` | `app/dashboard/subscription/page.tsx` | सब्सक्रिप्शन |
| `/dashboard/analytics` | `app/dashboard/analytics/page.tsx` | सीखने का विश्लेषण |
| `/dashboard/exams/:id` | `app/dashboard/exams/page.tsx` | परीक्षा (प्रॉक्टरिंग के साथ) |
| `/dashboard/forms` | `app/dashboard/forms/page.tsx` | फॉर्म सबमिशन |
| `/dashboard/leave` | `app/dashboard/leave/page.tsx` | छुट्टी प्रबंधन |
| `/dashboard/trophies` | `app/dashboard/trophies/page.tsx` | उपलब्धियां |
| `/dashboard/individual-bookings` | `app/dashboard/individual-bookings/page.tsx` | 1-ऑन-1 बुकिंग |

### एडमिन पेजेस (Admin)

| रूट | पेज |
|------|------|
| `/admin` | मुख्य डैशबोर्ड |
| `/admin/courses` | कोर्स CRUD |
| `/admin/course/:id` | कोर्स विवरण |
| `/admin/books` | पुस्तक CRUD |
| `/admin/books/:id` | पुस्तक पाठ |
| `/admin/categories` | श्रेणियां |
| `/admin/batches` | बैच प्रबंधन |
| `/admin/users` | उपयोगकर्ता प्रबंधन |
| `/admin/enrollments` | एनरोलमेंट |
| `/admin/exams` | परीक्षाएं |
| `/admin/forms` | फॉर्म बिल्डर |
| `/admin/form-responses` | फॉर्म उत्तर |
| `/admin/leave-requests` | छुट्टी अनुरोध |
| `/admin/settings` | साइट सेटिंग्स |
| `/admin/teachers` | शिक्षक प्रबंधन |
| `/admin/trophies` | बैज/ट्रॉफी |
| `/admin/individual-classes` | व्यक्तिगत बुकिंग |
| `/admin/credits` | क्रेडिट प्रबंधन |
| `/admin/broadcast` | ब्रॉडकास्ट |
| `/admin/emails` | ईमेल संपादक |
| `/admin/accounting` | लेखा |
| `/admin/coupons` | कूपन |
| `/admin/subscription` | सब्सक्रिप्शन योजनाएं |
| `/admin/notifications` | सूचनाएं |
| `/admin/scheduled-notifications` | निर्धारित सूचनाएं |
| `/admin/database` | DB क्वेरी |
| `/admin/analytics` | विश्लेषण |
| `/admin/integrations` | एकीकरण |
| `/admin/social-integrations` | सोशल मीडिया |
| `/admin/merchant` | Google Merchant |
| `/admin/gamification` | गेमिफिकेशन सेटिंग्स |
| `/admin/release-automation` | Jules रिलीज़ ऑटोमेशन |
| `/admin/error-sessions` | त्रुटि सत्र |
| `/admin/subscribers` | सब्सक्राइबर्स |

---

## 2. शेयर्ड कंपोनेंट्स

### `components/ui/` - बेस UI प्रिमिटिव्स
- `button.tsx` - बटन (variants: default, destructive, outline, ghost)
- `card.tsx` - कार्ड (Card, CardHeader, CardContent, CardFooter)
- `skeleton.tsx` - लोडिंग स्केलेटन

### `components/` - एप्लिकेशन कंपोनेंट्स
- `ClientLayout.tsx` - रूट प्रोवाइडर रैपर
- `DashboardNav/` - नेविगेशन (DesktopNav, MobileMenu, NavDropdown)
- `AITutor.tsx` - पाठ स्तर पर AI सहायता
- `AIAssistant.tsx` - डैशबोर्ड AI सहायक
- `AdminAI.tsx` - एडमिन AI सहायक
- `ContentAI.tsx` - सामग्री निर्माण AI
- `EnhancedVideoPlayer.tsx` - वीडियो प्लेयर
- `CheckoutPanel.tsx` - Razorpay चेकआउट
- `BuyCreditsModal.tsx` - क्रेडिट खरीद
- `NotificationBell.tsx` - सूचना बैल
- `LanguageSwitcher.tsx` - भाषा टॉगल
- `BackgroundUploadManager.tsx` - फ़ाइल अपलोड

### `app/components/` - ऐप-स्तरीय कंपोनेंट्स
- `LiveClassWindow.tsx` - लाइव क्लास विंडो
- `WhiteboardPanel.tsx` - व्हाइटबोर्ड
- `AITeacher.tsx` - AI शिक्षक

---

## 3. कॉन्टेक्स्ट्स (Contexts)

| कॉन्टेक्स्ट | विवरण |
|-------------|--------|
| `LanguageContext` | द्विभाषी (EN/HI), `t()` फ़ंक्शन, नेस्टेड की लुकअप, इंटरपोलेशन, स्थानीय भंडारण |
| `CreditsContext` | क्रेडिट बैलेंस, `refreshCredits()` |
| `ToastContext` | टोस्ट सूचनाएं (success/error/warning/info), 4s ऑटो-डिसमिस |
| `LiveSessionContext` | लाइव सत्र प्रबंधन |

---

## 4. हुक्स (Hooks)

| हुक | विवरण |
|-----|--------|
| `useSessionGuard` | सत्र समाप्ति + निष्क्रियता लॉगआउट |
| `useProctoring` | परीक्षा प्रॉक्टरिंग |
| `useCurrency` | मुद्रा स्वरूपण |
| `useTimezone` | समय क्षेत्र का पता लगाना |
| `use-mobile` | मोबाइल डिवाइस का पता लगाना |
| `useCreditWallet` | क्रेडिट वॉलेट संचालन |

---

## 5. लेआउट्स (Layouts)

- **`app/layout.tsx`** - रूट लेआउट (सर्वर कंपोनेंट)
- **`app/auth/layout.tsx`** - केंद्रित कार्ड लेआउट
- **`app/dashboard/layout.tsx`** - साइडबार, नोटिफिकेशन, क्रेडिट, सेशन गार्ड
- **`app/admin/layout.tsx`** - एडमिन साइडबार, AdminAI, नोटिफिकेशन

---

## 6. स्टाइलिंग

- **Tailwind CSS 4** - `@tailwindcss/postcss`
- **Framer Motion** - एनिमेशन (`motion` पैकेज)
- **lucide-react** - आइकन
- **`lib/utils.ts`** - `cn()` Tailwind क्लास मर्ज

---

## 7. अंतर्राष्ट्रीयकरण (i18n)

- **दो भाषाएं**: English (`en.json`) और हिंदी (`hi.json`)
- **नेस्टेड की संरचना**: `common.save`, `course.enroll`, आदि
- **इंटरपोलेशन**: `{var}` सिंटैक्स
- **बहुवचन**: `s?` सिंटैक्स
- **भंडारण**: `localStorage` में `language` कुंजी

---

यह दस्तावेज़ फ्रंटएंड UI की पूरी संरचना का विवरण प्रदान करता है।
