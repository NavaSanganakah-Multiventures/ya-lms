# कॉन्टेक्स्ट्स - गहन विवरण (Contexts Deep Dive)

## अवलोकन
YA-LMS चार React कॉन्टेक्स्ट का उपयोग करता है जो पूरे एप्लिकेशन में वैश्विक स्थिति प्रदान करते हैं।

---

## 1. LanguageContext

### फ़ाइल: `contexts/LanguageContext.tsx` (89 लाइनें)

**उद्देश्य:** द्विभाषी (EN/HI) समर्थन

**प्रदान किए गए मान:**
| मान | प्रकार | विवरण |
|-----|--------|--------|
| `language` | `'en'` | वर्तमान भाषा |
| `setLanguage()` | fn | भाषा बदलें |
| `t()` | fn | अनुवाद फ़ंक्शन |

**`t()` फ़ंक्शन सुविधाएं:**
1. **नेस्टेड की लुकअप:** `t('common.save')` → डॉट नोटेशन
2. **इंटरपोलेशन:** `t('course.progress', { percent: 75 })` → `{var}` सिंटैक्स
3. **बहुवचन:** `t('item', { count: 2 })` → `|` सेपरेटर ("item|items")
4. **माउंट गार्ड:** SSR के दौरान डिफ़ॉल्ट भाषा
5. **लोकलस्टोरेज:** `language` कुंजी में प्राथमिकता संग्रहीत

**प्रदाता:** `LanguageProvider` → `ClientLayout` में रैप

---

## 2. CreditsContext

### फ़ाइल: `contexts/CreditsContext.tsx` (44 लाइनें)

**उद्देश्य:** क्रेडिट बैलेंस प्रबंधन

**प्रदान किए गए मान:**
| मान | प्रकार | विवरण |
|-----|--------|--------|
| `balance` | `number` | वर्तमान क्रेडिट बैलेंस |
| `refreshCredits()` | fn | बैलेंस रिफ्रेश करें |
| `loading` | `boolean` | लोडिंग स्थिति |

**डेटा स्रोत:** `GET /api/credits/balance`
**उपयोग:** डैशबोर्ड लेआउट

---

## 3. ToastContext

### फ़ाइल: `contexts/ToastContext.tsx` (109 लाइनें)

**उद्देश्य:** टोस्ट सूचना प्रणाली

**प्रदान किए गए मान:**
| मान | विवरण |
|-----|--------|
| `toast()` | जेनेरिक टोस्ट |
| `success()` | सफलता टोस्ट (हरा) |
| `error()` | त्रुटि टोस्ट (लाल) |
| `warning()` | चेतावनी टोस्ट (पीला) |
| `info()` | जानकारी टोस्ट (नीला) |

**विशेषताएं:**
- 4 आइकन प्रकार (check, x, alert-triangle, info)
- कलर-कोडेड बॉर्डर
- 4 सेकंड ऑटो-डिसमिस
- Framer Motion एनिमेशन (`motion` पैकेज)
- क्लोज़ बटन

---

## 4. LiveSessionContext

### फ़ाइल: `contexts/LiveSessionContext.tsx` (70 लाइनें)

**उद्देश्य:** लाइव क्लास सत्र प्रबंधन

**प्रदान किए गए मान:**
| मान | विवरण |
|-----|--------|
| `startSession()` | लाइव सत्र शुरू करें |
| `endSession()` | लाइव सत्र समाप्त करें |
| `currentSession` | वर्तमान सत्र डेटा |
| `isLiveActive` | क्या लाइव सत्र सक्रिय है |

**विशेषताएं:**
- Cloudflare Live सत्र प्रबंधित करता है
- व्हाइटबोर्ड पहचान के लिए उपयोगकर्ता प्रोफ़ाइल फ़ेच करता है
- `LiveClassWindow` रेंडर करता है
- डैशबोर्ड कोर्स लर्न पेजों में उपयोग

---

## 5. प्रदाता पदानुक्रम (Provider Hierarchy)

### `components/ClientLayout.tsx` में:

```
GlobalErrorBoundary
  └── ToastProvider (ToastContext)
      └── LanguageProvider (LanguageContext)
          └── CurrencyProvider (useCurrency)
              └── LiveSessionProvider (LiveSessionContext)
                  └── CreditsProvider (CreditsContext)
                      └── FirebaseInit
                      └── NotificationPrompt
                      └── SessionGuard
```

---

## 6. कॉन्टेक्स्ट्स का उपयोग

| कॉन्टेक्स्ट | उपयोग कहां होता है |
|-------------|-------------------|
| LanguageContext | सभी पेजेस (t() फ़ंक्शन) |
| CreditsContext | डैशबोर्ड लेआउट, BuyCreditsModal |
| ToastContext | सभी कंपोनेंट्स (useToast()) |
| LiveSessionContext | कोर्स लर्न पेजेस |

---

यह दस्तावेज़ सभी React कॉन्टेक्स्ट का गहन विवरण प्रदान करता है।
