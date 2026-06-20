# एआई सुविधाएं (AI Features)

## अवलोकन
YA-LMS में **Google Gemini** और **OpenAI Whisper** पर आधारित कई एआई सुविधाएं हैं। सभी एआई कॉल Cloudflare AI Gateway के माध्यम से रूट की जाती हैं और क्रेडिट-आधारित हैं।

---

## 1. AI ट्यूटर (AI Tutor)

### `components/AITutor.tsx`
- पाठ स्तर पर फ्लोटिंग AI सहायता
- छात्र पाठ के दौरान AI से प्रश्न पूछ सकते हैं
- Gemini के माध्यम से संचालित

### `components/AIAssistant.tsx`
- डैशबोर्ड के लिए सामान्य AI चैट
- पुन: प्रयोज्य AI चैट पॉपअप
- AITutor और AdminAI द्वारा उपयोग

### `components/AdminAI.tsx`
- एडमिन पैनल के लिए फ्लोटिंग AI सहायक
- एडमिन प्रबंधन कार्यों में सहायता

---

## 2. सामग्री निर्माण AI (Content AI)

### `components/ContentAI.tsx`
- Gemini-संचालित कोर्स/फॉर्म सामग्री निर्माण
- एडमिन कोर्स और फॉर्म पेजों में उपयोग

**उपयोग:**
- कोर्स विवरण निर्माण
- पाठ सामग्री निर्माण
- फॉर्म प्रश्न निर्माण
- SEO मेटाडेटा निर्माण

---

## 3. AI शिक्षक (AI Teacher)

### `app/components/AITeacher.tsx`
- लाइव क्लास के दौरान AI शिक्षक
- WebSocket कनेक्शन
- Gemini इंटीग्रेशन
- छात्रों के प्रश्नों के वास्तविक समय में उत्तर
- व्हाइटबोर्ड एकीकरण

### `app/ai-teacher/[roomId]/`
- समर्पित AI शिक्षक कक्ष
- WebRTC + व्हाइटबोर्ड + AI शिक्षक
- प्रतिभागी क्लाइंट (`ParticipantClient.tsx`)

---

## 4. ट्रांसक्रिप्शन (AI Transcription)

### `src/workflows.ts` - `LessonTranscriptionWorkflow`
Cloudflare Workflow का उपयोग करके ऑडियो/वीडियो ट्रांसक्रिप्शन:

**प्रक्रिया:**
1. **पढ़ना** - R2 से मीडिया फ़ाइल पढ़ें
2. **चंकिंग** - 24MB चंक्स में विभाजित करें
3. **ट्रांसक्राइब** - प्रत्येक चंक को Whisper AI से ट्रांसक्राइब करें
4. **भाषा का पता लगाना** - हिंदी भाषा का स्वचालित पता लगाना
5. **सहेजना** - DB और R2 में ट्रांसक्रिप्ट सहेजें
6. **इंडेक्स** - AI Search में इंडेक्स करें
7. **सफाई** - अस्थायी चंक्स साफ़ करें
8. **सूचना** - एडमिन को पूर्णता की सूचना

---

## 5. एआई कॉस्ट और क्रेडिट

| सुविधा | क्रेडिट लागत |
|--------|--------------|
| AI Tutor प्रश्न | 2 क्रेडिट्स (डिफ़ॉल्ट) |
| Content AI जनरेशन | 2 क्रेडिट्स (डिफ़ॉल्ट) |
| AI Teacher चैट | 2 क्रेडिट्स (डिफ़ॉल्ट) |
| AI Assistant चैट | 2 क्रेडिट्स (डिफ़ॉल्ट) |

---

## 6. बैकएंड एआई हैंडलिंग

### `src/index.ts` में:
- `calculateAICreditsForPurchase()` - खरीद के लिए क्रेडिट गणना
- `getAICreditDeductionPerRequest()` - प्रति अनुरोध क्रेडिट लागत
- `addCreditsToWallet()` - वॉलेट क्रेडिट संचालन
- AI गेटवे कॉल → `AI.run()` Cloudflare बाइंडिंग

---

## 7. जूल्स ऑटोमेशन (Jules AI)

YA-LMS में **Jules AI** नामक एक ऑटोमेटेड AI एजेंट है:

### त्रुटि ऑटोमेशन:
1. त्रुटि होने पर `handleGlobalError()` कॉल होता है
2. `createErrorSessionFromPayload()` → ErrorSession बनाता है
3. `runErrorAutomation()` → Gemini प्रॉम्प्ट जनरेट करता है
4. `sendPromptToJules()` → Jules API को भेजता है
5. `syncJulesJobActivities()` → प्रगति ट्रैक करता है

### रिलीज़ ऑटोमेशन:
`app/admin/release-automation/page.tsx`:
- अभियान निर्माण
- ईमेल ब्लास्ट
- सोशल पोस्टिंग
- लेख निर्माण

### API:
- `POST /api/admin/jules/*` - Jules API संचालन
- `POST /api/admin/error-sessions/*` - त्रुटि सत्र प्रबंधन

---

## 8. एआई इंटीग्रेशन पॉइंट्स सारांश

| सुविधा | फ़ाइल | AI मॉडल |
|--------|-------|---------|
| AI Tutor | `components/AITutor.tsx` | Gemini |
| AI Assistant | `components/AIAssistant.tsx` | Gemini |
| Admin AI | `components/AdminAI.tsx` | Gemini |
| Content AI | `components/ContentAI.tsx` | Gemini |
| AI Teacher | `app/components/AITeacher.tsx` | Gemini |
| Transcription | `src/workflows.ts` | Whisper |
| Jules Automation | `src/index.ts` | Gemini + Jules API |

---

यह दस्तावेज़ सभी AI सुविधाओं का विस्तृत विवरण प्रदान करता है।
