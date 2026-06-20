# लाइव कक्षाएं (Live Classes)

## अवलोकन
YA-LMS **Cloudflare RealtimeKit** पर आधारित एक पूर्ण लाइव क्लास सिस्टम प्रदान करता है जो WebRTC तकनीक का उपयोग करता है।

---

## 1. डेटाबेस टेबल

### LiveSessions
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी |
| `course_id` / `batch_id` | कोर्स/बैच से जुड़ाव |
| `title` | सत्र का शीर्षक |
| `room_name` | RealtimeKit कक्ष नाम |
| `teacher_id` | शिक्षक आईडी |
| `start_time` / `end_time` | प्रारंभ/समाप्ति समय |
| `status` | `scheduled` / `live` / `ended` |

### Recordings
| फ़ील्ड | विवरण |
|--------|--------|
| `id` | रिकॉर्डिंग आईडी |
| `course_id` / `live_session_id` | संबंध |
| `title` | शीर्षक |
| `url` | वीडियो URL (R2) |
| `duration_seconds` | अवधि |
| `type` | रिकॉर्डिंग प्रकार |

---

## 2. फ्रंटएंड कंपोनेंट्स

### LiveClassWindow (`app/components/LiveClassWindow.tsx`)
लाइव क्लास का मुख्य UI:
- RealtimeKit एकीकरण
- वीडियो स्ट्रीमिंग
- रिकॉर्डिंग नियंत्रण
- पिक्चर-इन-पिक्चर (PiP)
- हाथ उठाने का बटन
- AI शिक्षक एकीकरण

### WhiteboardPanel (`app/components/WhiteboardPanel.tsx`)
सहयोगी व्हाइटबोर्ड:
- कैनवास ड्राइंग
- पैन/ज़ूम
- अनुमति नियंत्रण
- स्ट्रीम शेयर

### AITeacher (`app/components/AITeacher.tsx`)
AI-संचालित शिक्षण सहायक:
- WebSocket कनेक्शन
- Gemini AI इंटीग्रेशन
- छात्र प्रश्नों के उत्तर

---

## 3. लाइव क्लास कंटेक्स्ट

### LiveSessionContext (`contexts/LiveSessionContext.tsx`)
- Cloudflare Live सत्र प्रबंधित करता है
- `LiveClassWindow` रेंडर करता है
- डैशबोर्ड कोर्स लर्न पेजों में उपयोग होता है

---

## 4. AI टीचर रूम

### `app/ai-teacher/[roomId]/page.tsx`
AI-संचालित लाइव क्लास रूम:
- एज रनटाइम (Edge Runtime)
- क्लाइंट-साइड माउंट (`Wrapper.tsx`)
- प्रतिभागी क्लाइंट (`ParticipantClient.tsx`)
- WebRTC + व्हाइटबोर्ड + AI शिक्षक

पूरा सेटअप:
1. `page.tsx` → सर्वर कंपोनेंट (एज रनटाइम)
2. `Wrapper.tsx` → डायनेमिक इम्पोर्ट रैपर
3. `ParticipantClient.tsx` → लाइव क्लास, AI शिक्षक, WebRTC, व्हाइटबोर्ड

---

## 5. लाइव क्लास सूची

### `app/live/page.tsx`
- आगामी और चालू लाइव कक्षाएं
- फ़िल्टरिंग विकल्प

### `app/recordings/page.tsx`
- उपलब्ध रिकॉर्डिंग्स
- फ़िल्टरिंग

---

## 6. एडमिन प्रबंधन

### बैच शेड्यूलिंग:
- लाइव सत्र Google Calendar से सिंक
- बैच घोषणाएं (ईमेल + सोशल + पुश)

### API:
- लाइव सत्र CRUD
- रिकॉर्डिंग प्रबंधन
- लाइव क्लास टोकन जनरेशन

---

## 7. फ्लटर मोबाइल

### लाइव क्लास (Flutter):
- RealtimeKit UI इंटीग्रेशन
- PiP (Picture-in-Picture) समर्थन
- वीडियो प्लेयर

फ़ाइल्स:
- `flutter/student_app/lib/screens/live_class_realtimekit_screen.dart`
- `flutter/student_app/lib/screens/course_detail_screen.dart` (वीडियो प्लेयर)

---

## 8. मुख्य विशेषताएं

- **रीयल-टाइम वीडियो/ऑडियो** - WebRTC स्ट्रीमिंग
- **व्हाइटबोर्ड** - सहयोगी ड्राइंग बोर्ड
- **AI शिक्षक** - Gemini-संचालित AI सहायक
- **रिकॉर्डिंग** - बाद में देखने के लिए
- **हाथ उठाना** - इंटरैक्शन के लिए
- **PiP** - मल्टीटास्किंग के लिए
- **Google Calendar** - शेड्यूल सिंक

---

यह दस्तावेज़ लाइव क्लास सिस्टम का विस्तृत विवरण प्रदान करता है।
