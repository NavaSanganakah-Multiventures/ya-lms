# UI कंपोनेंट्स - व्यापक विवरण

## अवलोकन
यह दस्तावेज़ उन UI कंपोनेंट्स का विवरण प्रदान करता है जो अन्य दस्तावेज़ों में विस्तार से कवर नहीं किए गए हैं।

---

## 1. ClientLayout

### फ़ाइल: `components/ClientLayout.tsx`

**उद्देश्य:** रूट क्लाइंट-साइड प्रोवाइडर रैपर

**प्रदाता पदानुक्रम:**
```
GlobalErrorBoundary
  └── ToastProvider
      └── LanguageProvider
          └── CurrencyProvider
              └── LiveSessionProvider
                  └── CreditsProvider
                      └── FirebaseInit
                      └── NotificationPrompt
                      └── SessionGuard
                      └── AIAssistant
```

**उपयोग:** `app/layout.tsx` में

---

## 2. DashboardNav कंपोनेंट्स

### फ़ाइलें: `components/DashboardNav/`

### index.ts
- DesktopNav, MobileMenu, NavDropdown का री-एक्सपोर्ट

### DesktopNav.tsx
- डेस्कटॉप साइडबार नेविगेशन
- कोलैप्सेबल साइडबार
- भूमिका-आधारित लिंक (छात्र/एडमिन)
- भाषा स्विचर
- क्रेडिट बैलेंस प्रदर्शन

### MobileMenu.tsx
- शीट-आधारित मोबाइल नेविगेशन
- हैमबर्गर मेनू
- नीचे से स्लाइड करने वाला शीट

### NavDropdown.tsx
- एनिमेटेड सबमेनू आइटम
- ड्रॉपडाउन संक्रमण

---

## 3. AI चैट कंपोनेंट्स

### AIAssistant (`components/AIAssistant.tsx`)
- पुन: प्रयोज्य AI चैट पॉपअप
- संदेश इतिहास
- टाइपिंग संकेतक
- Gemini API से जुड़ाव

### AITutor (`components/AITutor.tsx`)
- पाठ स्तर पर AI ट्यूटर
- फ्लोटिंग पॉपअप
- पाठ संदर्भ-जागरूक

### AdminAI (`components/AdminAI.tsx`)
- एडमिन पैनल AI सहायक
- फ्लोटिंग बटन
- एडमिन लेआउट में शामिल

---

## 4. Whiteboard कंपोनेंट्स

### WhiteboardPanel (`app/components/WhiteboardPanel.tsx`)
- पूर्ण व्हाइटबोर्ड:
  - कैनवास ड्राइंग
  - पैन/ज़ूम
  - अनुमति नियंत्रण
  - स्ट्रीम शेयर

### live/Whiteboard (`app/components/live/Whiteboard.tsx`) - 276 लाइनें
- सहयोगी व्हाइटबोर्ड:
  - कैनवास ड्राइंग
  - रंग/चौड़ाई नियंत्रण
  - इरेज़र
  - प्रति-स्ट्रोक अनडू
  - पैन/ज़ूम
  - ड्राइंग अनुमति नियंत्रण (एडमिन छात्र के ड्राइंग को टॉगल कर सकता है)
  - मीटिंग इंटीग्रेशन

**प्रॉप्स:** `isActive`, `isAdmin`, `meeting`, `canStudentsDraw`, `onToggleStudentDraw`

---

## 5. AI Teacher Room - संरचना

### फ़ाइलें: `app/ai-teacher/[roomId]/`

```
page.tsx          → Edge Runtime सर्वर कंपोनेंट
Wrapper.tsx       → डायनामिक इम्पोर्ट रैपर (क्लाइंट-साइड)
ParticipantClient.tsx → मुख्य AI शिक्षक क्लाइंट
```

### ParticipantClient.tsx सुविधाएं:
- लाइव क्लास (LiveClassWindow)
- AI शिक्षक (AITeacher कंपोनेंट)
- WebRTC (RealtimeKit)
- व्हाइटबोर्ड (WhiteboardPanel)
- ऑडियो कॉन्टेक्स्ट

---

## 6. LanguageSwitcher

### फ़ाइल: `components/LanguageSwitcher.tsx` (56 लाइनें)

**उद्देश्य:** EN/HI भाषा टॉगल

**कार्य:**
- टॉगल बटन
- LanguageContext.setLanguage() कॉल करता है
- डैशबोर्ड और एडमिन लेआउट में उपलब्ध

---

## 7. CheckoutPanel

### फ़ाइल: `components/CheckoutPanel.tsx`

**उद्देश्य:** Razorpay चेकआउट इंटीग्रेशन

**सुविधाएं:**
- Razorpay बटन
- कूपन सत्यापन
- बिलिंग पता फॉर्म
- ऑर्डर निर्माण और सत्यापन
- एरर हैंडलिंग

---

## 8. UI प्रिमिटिव्स

### `components/ui/button.tsx`
- बटन वेरिएंट: default, destructive, outline, ghost
- साइज़: default, sm, lg

### `components/ui/card.tsx`
- Card, CardHeader, CardContent, CardFooter

### `components/ui/skeleton.tsx`
- लोडिंग स्केलेटन
- डैशबोर्ड पेजों में उपयोग

---

## 9. AI Teacher Room कंपोनेंट

### `app/ai-teacher/[roomId]/ParticipantClient.tsx`
पूरा AI शिक्षक अनुभव:
- लाइव वीडियो/ऑडियो (WebRTC)
- AI शिक्षक चैट (Gemini)
- सहयोगी व्हाइटबोर्ड
- हाथ उठाने का बटन
- PiP समर्थन

---

यह दस्तावेज़ सभी UI कंपोनेंट्स का व्यापक विवरण प्रदान करता है।
