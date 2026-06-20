# कक्षाएं और पाठ्यक्रम (Classes & Courses)

## अवलोकन
यह प्रोजेक्ट **पाठ्यक्रमों (Courses)** और **कक्षाओं (Classes)** के प्रबंधन के लिए एक पूर्ण प्रणाली प्रदान करता है। इसमें कोर्स निर्माण, पाठ योजना, बैच प्रबंधन, एनरोलमेंट, और प्रगति ट्रैकिंग शामिल है।

---

## 1. कोर्सेज (Courses)

### डेटाबेस टेबल: `Courses`

कोर्स की मुख्य संरचना:
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी (प्रारूप: `YA-CRS-XXXXXXXX`) |
| `title` | कोर्स का शीर्षक |
| `description` | कोर्स का विवरण |
| `teacher_name` | शिक्षक का नाम |
| `price_inr` | मूल्य (₹ में) / निःशुल्क के लिए 0 |
| `subscription_price_inr` | सब्सक्रिप्शन मूल्य |
| `self_study_price_inr` | स्व-अध्ययन मूल्य |
| `has_trial` | ट्रायल की सुविधा |
| `image_url` | कोर्स छवि (R2 में संग्रहीत) |
| `category_id` | श्रेणी से जुड़ाव |
| `seo_title`, `seo_description` | SEO फ़ील्ड्स |
| `certificate_eligible` | प्रमाणपत्र पात्रता |
| `status` | `active` / `inactive` |
| `merchant_product_id` | Google Merchant से जुड़ाव |

### API एंडपॉइंट्स:
- `GET /api/courses` - सार्वजनिक कोर्स सूची
- `GET /api/courses/:id` - कोर्स विवरण
- `POST /api/admin/courses` - एडमिन कोर्स निर्माण
- `PUT /api/admin/courses/:id` - कोर्स अपडेट
- `DELETE /api/admin/courses/:id` - कोर्स हटाना

### UI पेजेस:
- `app/courses/page.tsx` - कोर्स कैटलॉग (ग्रिड + फ़िल्टर)
- `app/course/CourseClient.tsx` - कोर्स विवरण + एनरोलमेंट
- `app/dashboard/my-courses/page.tsx` - मेरे कोर्सेज (प्रगति सहित)
- `app/dashboard/course/learn/page.tsx` - कोर्स प्लेयर
- `app/admin/courses/page.tsx` - एडमिन कोर्स CRUD

---

## 2. पाठ (Lessons)

### डेटाबेस टेबल: `Lessons`

पाठ के प्रकार:
| प्रकार | विवरण |
|--------|--------|
| `video` | वीडियो पाठ (R2 या YouTube) |
| `pdf` | पीडीएफ दस्तावेज़ |
| `article` | लेख/टेक्स्ट पाठ |
| `live` | लाइव क्लास सेशन |
| `image` | छवि-आधारित पाठ |
| `recording` | रिकॉर्ड की गई कक्षा |

मुख्य फ़ील्ड्स:
- `course_id` / `book_id` - कोर्स या बुक से जुड़ाव
- `chapter_title` - अध्याय का शीर्षक
- `order_index` - क्रम संख्या
- `content_url` - वीडियो/पीडीएफ का URL
- `content_body` - लेख की सामग्री
- `duration_seconds` - अवधि
- `is_free_preview` - निःशुल्क पूर्वावलोकन

### ट्रांसक्रिप्शन:
पाठ की वीडियो/ऑडियो फ़ाइलों को `LessonTranscriptionWorkflow` के माध्यम से स्वचालित रूप से ट्रांसक्राइब किया जाता है:
1. R2 से मीडिया पढ़ना
2. Whisper AI से ट्रांसक्रिप्शन (24MB चंक्स में)
3. हिंदी भाषा का पता लगाना
4. DB और R2 में ट्रांसक्रिप्ट सहेजना
5. AI Search में इंडेक्स करना

---

## 3. बैचेज (Batches)

### डेटाबेस टेबल: `Batches`

बैच कोर्स या बुक का एक शेड्यूल्ड ग्रुप है।

| फ़ील्ड | विवरण |
|--------|--------|
| `id` | बैच आईडी (`YA-BTC-XXX-YYMM-RRR`) |
| `course_id` / `book_id` | कोर्स/बुक से जुड़ाव |
| `name` | बैच का नाम |
| `start_date`, `end_date` | प्रारंभ/समाप्ति तिथि |
| `start_time`, `end_time` | कक्षा का समय |
| `days_of_week` | सप्ताह के दिन (बिटमास्क) |
| `status` | `upcoming` / `ongoing` / `completed` |
| `credit_cost` | क्रेडिट लागत |
| `max_students` | अधिकतम छात्र संख्या |
| `whatsapp_group_link` | व्हाट्सएप ग्रुप लिंक |

### विशेषताएं:
- बैच घोषणाएं (ईमेल + सोशल + पुश)
- Google Calendar सिंक
- छात्र प्रबंधन (जोड़ें/हटाएं)

### API:
- `GET/POST/PUT/DELETE /api/admin/batches`

---

## 4. एनरोलमेंट (Enrollments)

### डेटाबेस टेबल: `Enrollments`

| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी |
| `user_id` | छात्र आईडी |
| `course_id` / `book_id` | कोर्स/बुक |
| `progress` | प्रगति (0-100%) |
| `completed_lessons` | पूर्ण किए गए पाठ (JSON सरणी) |
| `enrolled_at` | एनरोलमेंट तिथि |
| `certificate_eligible` | प्रमाणपत्र पात्रता |
| `source` | स्रोत (`trial` / `self` / `admin` / `payment` / `credits`) |

### व्यावसायिक नियम:
- डुप्लिकेट एनरोलमेंट रोका जाता है (409 त्रुटि)
- प्रगति 100% + `certificate_eligible` = प्रमाणपत्र जारी
- पाठ पूरा करने पर प्रगति स्वचालित अपडेट

### API:
- `POST /api/enroll` - एनरोलमेंट
- `POST /api/courses/:id/complete-lesson` - पाठ पूर्णता
- `GET /api/courses/:id/certificate` - प्रमाणपत्र डाउनलोड

---

## 5. पाठ्यक्रम प्रगति (Course Progress)

`app/dashboard/course/learn/page.tsx` में प्रगति ट्रैकिंग:
- साइडबार में अध्याय-वार पाठ सूची
- पूर्ण/अपूर्ण पाठ चिह्न
- प्रगति प्रतिशत (गोलाकार प्रगति संकेतक)
- स्वचालित रूप से अगला पाठ लोड
- AI ट्यूटर एक्सेस
- लाइव क्लास जॉइन
- प्रमाणपत्र डाउनलोड बटन

---

## 6. UI कंपोनेंट्स

- **`EnhancedVideoPlayer`** - अध्याय मार्कर, गति नियंत्रण, PiP, HLS समर्थन
- **`ContentAI`** - कोर्स सामग्री एआई जनरेशन (Gemini)
- **`CheckoutPanel`** - एनरोलमेंट भुगतान (Razorpay)
- **`BackgroundUploadManager`** - फ़ाइल अपलोड (R2)

---

## 7. फ्लटर मोबाइल

Flutter स्टूडेंट ऐप में कोर्स और लाइव क्लास की सुविधाएं:
- कोर्स सूची और विवरण
- Chewie वीडियो प्लेयर
- लाइव क्लास (RealtimeKit)
- PiP (Picture-in-Picture)
- प्रगति ट्रैकिंग

---

यह दस्तावेज़ कक्षाओं और पाठ्यक्रमों की पूरी संरचना को समझाता है। क्रेडिट सिस्टम के लिए `02-credits.md` देखें।
