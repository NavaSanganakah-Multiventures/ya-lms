# अनुवाद और अंतर्राष्ट्रीयकरण (Translations & i18n)

## अवलोकन
YA-LMS **हिंदी (HI)** और **अंग्रेज़ी (EN)** में पूर्ण द्विभाषी समर्थन प्रदान करता है। अनुवाद JSON फ़ाइलों में नेस्टेड कुंजी संरचना में संग्रहीत हैं।

---

## 1. फ़ाइल संरचना

### `translations/en.json` (158 लाइनें)
### `translations/hi.json` (158 लाइनें)

दोनों फ़ाइलों में समान कुंजी संरचना है।

---

## 2. अनुवाद अनुभाग (Translation Sections)

| अनुभाग | विवरण |
|---------|--------|
| `common` | सामान्य बटन, लेबल, संदेश |
| `auth` | लॉगिन/रजिस्टर पेज |
| `dashboard` | डैशबोर्ड होम पेज |
| `course` | कोर्स सूची, विवरण, पाठ |
| `live` | लाइव क्लास |
| `exam` | परीक्षा इंटरफ़ेस |
| `form` | फॉर्म सबमिशन |
| `leave` | छुट्टी प्रबंधन |
| `credits` | क्रेडिट सिस्टम |
| `profile` | उपयोगकर्ता प्रोफ़ाइल |
| `admin` | एडमिन पैनल |
| `notification` | सूचनाएं |

---

## 3. कुंजी संरचना

नेस्टेड की:
```json
{
  "common": {
    "save": "सहेजें",
    "cancel": "रद्द करें",
    "loading": "लोड हो रहा है..."
  },
  "course": {
    "enroll": "नामांकन करें",
    "progress": "प्रगति: {percent}%",
    "chapters": {
      "title": "अध्याय",
      "completed": "पूर्ण"
    }
  }
}
```

---

## 4. उपयोग पैटर्न (Usage Pattern)

### useContext से उपयोग:
```jsx
import { useLanguage } from '@/contexts/LanguageContext';

const { t } = useLanguage();
t('common.save')  // → "सहेजें"
t('course.progress', { percent: 75 })  // → "प्रगति: 75%"
```

### LanguageContext (`contexts/LanguageContext.tsx`) सुविधाएं:
1. **नेस्टेड की लुकअप:** डॉट नोटेशन (`common.save`)
2. **इंटरपोलेशन:** `{var}` सिंटैक्स
3. **बहुवचन:** `|` सेपरेटर
4. **स्थानीय भंडारण:** `localStorage` में `language` कुंजी
5. **SSR-सुरक्षित:** माउंट होने तक डिफ़ॉल्ट भाषा

---

## 5. भाषा टॉगल

### LanguageSwitcher (`components/LanguageSwitcher.tsx`)
- भाषा स्विच करने के लिए टॉगल बटन
- डैशबोर्ड और एडमिन लेआउट में उपलब्ध
- localStorage में भाषा प्राथमिकता संग्रहीत

---

## 6. करंसी और टाइमज़ोन

### करंसी:
- `lib/utils.ts` - `formatCurrency()` (INR फ़ॉर्मेटिंग)
- `hooks/useCurrency.tsx` - `CurrencyProvider` + `useCurrency` हुक
- `INR`/`USD` सपोर्ट, localStorage पर्सिस्टेंस

### टाइमज़ोन:
- `lib/time.ts` - टाइमज़ोन-अवेयर डेट फ़ॉर्मेटिंग
- `hooks/useTimezone.ts` - ब्राउज़र टाइमज़ोन डिटेक्शन

---

## 7. मुख्य अनुवाद कुंजियां (Key Translation Families)

### `common.*`:
- save, cancel, delete, edit, create, loading, error, success
- confirm, back, next, submit, search, filter
- yes, no, ok, close, retry

### `auth.*`:
- login, register, logout, email, password, otp, verify
- sendOtp, enterOtp, studentId, loginTitle

### `course.*`:
- enroll, progress, chapters, lessons, completed, certificate
- video, pdf, live, recording, duration

### `dashboard.*`:
- myCourses, stats, activity, upcoming, live, credits
- progress, achievements, settings, profile

### `admin.*`:
- dashboard, users, courses, batches, settings
- notifications, analytics, forms, credits

---

## 8. अनुवाद जोड़ना

नई कुंजी जोड़ने के लिए:
1. `en.json` में कुंजी जोड़ें
2. `hi.json` में हिंदी अनुवाद जोड़ें
3. `t('section.key')` के साथ उपयोग करें

---

यह दस्तावेज़ अनुवाद और अंतर्राष्ट्रीयकरण प्रणाली का विस्तृत विवरण प्रदान करता है।
