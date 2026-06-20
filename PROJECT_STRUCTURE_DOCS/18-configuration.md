# परियोजना विन्यास (Project Configuration)

## अवलोकन
यह दस्तावेज़ YA-LMS प्रोजेक्ट के सभी विन्यास फ़ाइलों, पर्यावरण चरों, और स्क्रिप्ट्स का विवरण प्रदान करता है।

---

## 1. मुख्य विन्यास फ़ाइलें

### `package.json`
| फ़ील्ड | मान |
|--------|-----|
| नाम | `ai-studio-applet` |
| संस्करण | `0.1.0` |
| फ्रेमवर्क | Next.js 15, React 19 |

**मुख्य स्क्रिप्ट्स:**
| स्क्रिप्ट | विवरण |
|-----------|--------|
| `npm run dev` | डेवलपमेंट सर्वर |
| `npm run build` | प्रोडक्शन बिल्ड |
| `npm run deploy` | Cloudflare डिप्लॉय |
| `npm run test` | टेस्ट चलाएं |
| `npm run migrate` | DB माइग्रेशन |

**मुख्य निर्भरताएं:**
- `next`, `react`, `react-dom` - फ्रेमवर्क
- `motion` (framer-motion) - एनिमेशन
- `pdf-lib`, `fontkit` - PDF जनरेशन
- `mimetext` - ईमेल MIME
- `jose` - JWT (मिडलवेयर)
- `tailwind-merge`, `clsx` - CSS
- `razorpay` - भुगतान
- `firebase` - FCM
- `zod` - सत्यापन
- `recharts` - चार्ट
- `@cloudflare/next-on-pages` - Cloudflare डिप्लॉय

---

### `next.config.ts`
```typescript
// मुख्य विन्यास:
// 1. /api/* → http://127.0.0.1:8787/api/* रीराइट
// 2. HMR अक्षम (dev)
// 3. इमेजेज अनऑप्टिमाइज़्ड
```

---

### `wrangler.jsonc` - Cloudflare Worker विन्यास

**बाइंडिंग्स (Bindings):**
| बाइंडिंग | प्रकार | विवरण |
|-----------|--------|--------|
| `DB` | D1 | डेटाबेस |
| `STORAGE` | R2 | फ़ाइल संग्रहण |
| `PLATFORM_SECRETS` | KV | गुप्त कुंजियां/कॉन्फ़िग |
| `SEND_EMAIL` | Email | ईमेल भेजना |
| `AI` | AI | Gemini/Whisper |
| `AI_SEARCH` | AI Search | वेक्टर सर्च |
| `LESSON_QUEUE` | Queue | पाठ प्रसंस्करण |
| `PUSH_QUEUE` | Queue | पुश सूचनाएं |
| `NOTIFICATION_MANAGER` | Durable Object | सूचना प्रबंधन |
| `LESSON_TRANSCRIPTION_WORKFLOW` | Workflow | ट्रांसक्रिप्शन |

**क्रॉन ट्रिगर:**
- दैनिक - अज्ञात उपयोगकर्ता सफाई
- प्रति 15 मिनट - लाइव क्लास रिमाइंडर
- ईवेंट-आधारित - कोर्स घोषणा

---

### `tsconfig.json`
- **strict mode**: सक्षम
- **JSX**: `preserve`
- **पाथ एलियास**: `@/*` → `./*`
- **Cloudflare प्रकार**: `@cloudflare/workers-types`

---

### `middleware.ts` - Next.js Edge Middleware
- JWT सत्र सत्यापन (60s इन-मेमोरी कैश)
- `/admin/*` और `/dashboard/*` की सुरक्षा
- अप्रमाणित उपयोगकर्ताओं को `/auth/login` पर रीडायरेक्ट

---

## 2. पर्यावरण चर (Environment Variables)

### `.env.example`

| चर | विवरण |
|-----|--------|
| `JWT_SECRET` | JWT हस्ताक्षर गुप्त कुंजी |
| `JWT_REFRESH_SECRET` | JWT रिफ्रेश गुप्त कुंजी |
| `NEXT_PUBLIC_*` | सार्वजनिक चर |

### `secrets.local.json.example`
KV में संग्रहीत गुप्त कुंजियां:
- Razorpay कुंजियां
- FCM सेवा खाता
- सोशल मीडिया टोकन
- Google Calendar क्रेडेंशियल्स
- Infobip (WhatsApp) क्रेडेंशियल्स

---

## 3. अन्य विन्यास फ़ाइलें

| फ़ाइल | विवरण |
|-------|--------|
| `eslint.config.mjs` | ESLint नियम (TypeScript + Next.js) |
| `postcss.config.mjs` | Tailwind CSS + autoprefixer |
| `jest.config.js` | Jest टेस्ट कॉन्फ़िग |
| `pnpm-workspace.yaml` | PNPM वर्कस्पेस |
| `.npmrc` | npm कॉन्फ़िग |
| `.eslintrc.json` | लीगेसी ESLint (सुपरसीडेड) |

---

## 4. डेटाबेस विन्यास

### `schema.sql` (823 लाइनें)
- 30+ टेबल की परिभाषाएं
- D1 SQLite सिंटैक्स
- सिंगल सोर्स ऑफ़ ट्रूथ

### `db-migrate.ts`
- ऑटो-माइग्रेशन इंजन
- `schema.sql` को लाइव DB से तुलना करता है
- वर्कर स्टार्टअप पर चलता है

---

## 5. डिप्लॉयमेंट स्क्रिप्ट

### `scripts/deploy.sh`
```bash
# 1. npm run build (Next.js)
# 2. wrangler versions upload
# 3. wrangler versions deploy
```

### GitHub Actions (`.github/workflows/`)
- CI/CD पाइपलाइन
- स्वचालित टेस्ट + डिप्लॉय

---

## 6. प्रोजेक्ट फ़ाइलें

| फ़ाइल | विवरण |
|-------|--------|
| `DEVELOPER_MANUAL.md` | डेवलपर गाइड (339 लाइनें) |
| `AI_CORE_RULES.md` | AI एजेंट नियम |
| `metadata.json` | साइट मेटाडेटा |
| `global.d.ts` | वैश्विक TypeScript प्रकार |
| `types.d.ts` | मॉड्यूल प्रकार |
| `next-env.d.ts` | Next.js प्रकार (ऑटो-जनरेटेड) |

---

यह दस्तावेज़ सभी विन्यास फ़ाइलों और पर्यावरण सेटिंग्स का विवरण प्रदान करता है।
