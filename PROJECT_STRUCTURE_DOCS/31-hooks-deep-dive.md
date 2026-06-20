# हुक्स - गहन विवरण (Hooks Deep Dive)

## अवलोकन
YA-LMS में 7 कस्टम React हुक्स हैं जो विभिन्न कार्यक्षमताएं प्रदान करते हैं।

---

## 1. useSessionGuard

### फ़ाइल: `hooks/useSessionGuard.tsx` (243 लाइनें)

**उद्देश्य:** क्लाइंट-साइड सत्र सुरक्षा

**कार्यप्रणाली:**
- निष्क्रियता ट्रैकर (5 मिनट में पिंग)
- लॉगआउट से 2 मिनट पहले चेतावनी मोडल
- `SESSION_EXPIRED` / `INACTIVITY_LOGOUT` पर स्वचालित लॉगआउट

**प्रदान किए गए:**
- `SessionWarningModal` React कंपोनेंट (2 मिनट पहले)
- `SessionExpiredModal` React कंपोनेंट (समाप्ति पर)

**टाइमर:**
```
Ping → 5 min → Ping → ... → Warning (2 min before) → Logout
```

### नीति फ़ाइल: `hooks/sessionGuardPolicy.ts` (15 लाइनें)

| स्थिरांक | मान | विवरण |
|-----------|------|--------|
| `STUDENT_INACTIVITY_LIMIT_MS` | 12 घंटे | छात्र निष्क्रियता सीमा |
| `PRIVILEGED_INACTIVITY_LIMIT_MS` | 3 घंटे | एडमिन/शिक्षक सीमा |
| `WARNING_BEFORE_MS` | 2 मिनट | चेतावनी पहले से |
| `PING_INTERVAL_MS` | 5 मिनट | पिंग अंतराल |

---

## 2. useProctoring

### फ़ाइल: `hooks/useProctoring.ts` (210 लाइनें)

**उद्देश्य:** परीक्षा प्रॉक्टरिंग

**निगरानी की जाने वाली गतिविधियां:**
1. **टैब स्विच** - `visibilitychange` ईवेंट
2. **विंडो ब्लर** - `blur` ईवेंट
3. **कॉपी/पेस्ट** - `copy`/`paste` ईवेंट
4. **राइट-क्लिक** - `contextmenu` ईवेंट
5. **फ़ुलस्क्रीन एग्ज़िट** - `fullscreenchange` ईवेंट
6. **F12/डेवलपर टूल्स** - `keydown` ईवेंट

**उल्लंघन प्रबंधन:**
```
उल्लंघन → POST /api/exams/:id/violation
         → गिनती बढ़ाएं
         → यदि maxWarnings पार → auto-submit
```

**पैरामीटर:**
| पैरामीटर | विवरण |
|-----------|--------|
| `examId` | परीक्षा आईडी |
| `maxWarnings` | अधिकतम चेतावनी (डिफ़ॉल्ट: 3) |
| `onViolation` | उल्लंघन कॉलबैक |
| `onAutoSubmit` | स्वचालित सबमिशन कॉलबैक |

---

## 3. useCurrency

### फ़ाइल: `hooks/useCurrency.tsx` (61 लाइनें)

**उद्देश्य:** मुद्रा स्वरूपण और सेटिंग

**प्रदान किए गए:**
- `CurrencyProvider` कॉन्टेक्स्ट
- `useCurrency(amountInr)` हुक → फ़ॉर्मेटेड करंसी स्ट्रिंग

**समर्थित मुद्राएं:**
- INR (₹) - डिफ़ॉल्ट
- USD ($)

**विशेषताएं:**
- localStorage में मुद्रा प्राथमिकता संग्रहीत
- INR के लिए `Intl.NumberFormat` का उपयोग

---

## 4. useTimezone

### फ़ाइल: `hooks/useTimezone.ts` (28 लाइनें)

**उद्देश्य:** उपयोगकर्ता समय क्षेत्र का पता लगाना

**कार्य:**
- ब्राउज़र `Intl.DateTimeFormat().resolvedOptions().timeZone` का उपयोग करता है
- SSR के दौरान डिफ़ॉल्ट `Asia/Kolkata` लौटाता है

**रैपर:** `lib/time.ts` फ़ंक्शन

---

## 5. use-mobile

### फ़ाइल: `hooks/use-mobile.ts` (20 लाइनें)

**उद्देश्य:** मोबाइल डिवाइस का पता लगाना

**कार्य:**
- `useIsMobile()` → बूलियन
- 768px ब्रेकपॉइंट
- `useEffect` + `resize` ईवेंट

**उपयोग:** `DashboardNav` मोबाइल मेनू

---

## 6. useCreditWallet

### फ़ाइल: `hooks/useCreditWallet.ts` (154 लाइनें)

**उद्देश्य:** क्रेडिट वॉलेट API ऑपरेशन

**5 उप-हुक्स:**

| हुक | विवरण |
|-----|--------|
| `useCreditWallet()` | वॉलेट विवरण + बैलेंस |
| `useAddCredits()` | क्रेडिट जोड़ें (एडमिन) |
| `useDeductCredits()` | क्रेडिट काटें (एडमिन) |
| `useCreditHistory()` | लेन-देन इतिहास |
| `useCreditAnalytics()` | क्रेडिट विश्लेषण |

**API कॉल्स:**
- `GET /api/admin/credits/wallet/:userId` - वॉलेट
- `POST /api/admin/credits/add` - जोड़ें
- `POST /api/admin/credits/deduct` - काटें
- `GET /api/admin/credits/history/:userId` - इतिहास
- `GET /api/admin/credits/analytics` - विश्लेषण

---

## 7. हुक्स उपयोग सारांश

| हुक | कहां उपयोग होता है |
|-----|-------------------|
| `useSessionGuard` | डैशबोर्ड और एडमिन लेआउट |
| `useProctoring` | परीक्षा पेज |
| `useCurrency` | कोर्स/चेकआउट पेज |
| `useTimezone` | फॉर्म पेजेस |
| `use-mobile` | DashboardNav |
| `useCreditWallet` | एडमिन क्रेडिट पेज |

---

यह दस्तावेज़ सभी कस्टम React हुक्स का गहन विवरण प्रदान करता है।
