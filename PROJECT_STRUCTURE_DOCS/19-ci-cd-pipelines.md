# CI/CD पाइपलाइन (CI/CD Pipelines)

## अवलोकन
YA-LMS **GitHub Actions** का उपयोग करके स्वचालित बिल्ड, टेस्ट और डिप्लॉयमेंट करता है। तीन वर्कफ़्लो परिभाषित हैं।

---

## 1. डिप्लॉय वर्कफ़्लो (Deploy)

### फ़ाइल: `.github/workflows/deploy.yml`

**ट्रिगर:** `main`, `dev`, `verified` ब्रांच पर push

**स्टेप्स:**
1. **बिल्ड** - `npm run build` (Next.js + Worker)
2. **वर्सन अपलोड** - `wrangler versions upload`
3. **डिप्लॉय** - `wrangler versions deploy`
4. **वर्कफ़्लो वेरिफिकेशन** - `LessonTranscriptionWorkflow` को वेरिफाई/क्रिएट करता है

**स्किप शर्तें:**
- `.md` फ़ाइलों में बदलाव
- Flutter फ़ाइलों में बदलाव
- केवल विशिष्ट पथों पर ही चलता है

---

## 2. लॉकफ़ाइल सिंक वर्कफ़्लो (Lockfile Sync)

### फ़ाइल: `.github/workflows/lockfile-sync.yml`

**ट्रिगर:** `dev`, `test` ब्रांच पर `package.json` में बदलाव

**स्टेप्स:**
1. `npm install` चलाएं
2. टेस्ट चलाएं
3. `package-lock.json` को पुनर्जीवित करें और कमिट करें

**उद्देश्य:** लॉकफ़ाइल को हमेशा `package.json` के साथ सिंक रखना

---

## 3. एपीके बिल्ड वर्कफ़्लो (APK Build)

### फ़ाइल: `.github/workflows/build_and_upload_apk.yml`

**ट्रिगर:** `main`, `dev`, `verified` ब्रांच पर Flutter फ़ाइलों में बदलाव

**स्टेप्स:**
1. Flutter एपीके बिल्ड (debug/release)
2. एपीके + एएबी जनरेट
3. वैकल्पिक: कीस्टोर साइनिंग (secrets से)
4. Cloudflare R2 (`yagyaashram-lms/apps/`) पर अपलोड

**आउटपुट:** `flutter/student_app/apk/` में संग्रहीत

---

## 4. मैन्युअल डिप्लॉय स्क्रिप्ट

### फ़ाइल: `scripts/deploy.sh`

```bash
# 1. npm run build
# 2. wrangler versions upload
# 3. wrangler versions deploy
```

स्थानीय डिप्लॉयमेंट के लिए उपयोग की जाती है।

---

## 5. बिल्ड और डिप्लॉयमेंट आर्किटेक्चर

```
Git Push (main/dev/verified)
    │
    ▼
GitHub Actions
    │
    ├── Deploy Workflow
    │   ├── Next.js Build (npm run build)
    │   ├── @cloudflare/next-on-pages
    │   ├── wrangler versions upload
    │   └── wrangler versions deploy
    │
    ├── Lockfile Sync
    │   ├── npm install
    │   ├── Tests
    │   └── Commit lockfile
    │
    └── APK Build (Flutter only)
        ├── flutter build apk
        ├── flutter build appbundle
        └── Upload to R2
```

---

## 6. महत्वपूर्ण नोट्स

- Cloudflare Workers `nodejs_compat_v2` रनटाइम का उपयोग करता है
- `output: export` **सख्त वर्जित** है (Next.js डायनामिक SSR)
- Flutter APK GitHub Actions के माध्यम से बनता है
- सभी सीक्रेट्स GitHub Secrets में संग्रहीत हैं

---

यह दस्तावेज़ CI/CD पाइपलाइन की पूरी जानकारी प्रदान करता है।
