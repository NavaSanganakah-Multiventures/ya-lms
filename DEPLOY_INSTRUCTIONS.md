# Deployment & Configuration Commands

यहाँ आपके 'Workers with Assets' प्रोजेक्ट के लिए आवश्यक कमांड्स दिए गए हैं:

### 1. KV Namespaces बनाना
सबसे पहले, प्रोडक्शन और प्रीव्यू के लिए अलग-अलग KV नेमस्पेस बनाएँ:

**Production के लिए:**
```bash
npx wrangler kv:namespace create MAIN_DATA
```
*(कमांड चलाने के बाद मिलने वाली `id` को `wrangler.toml` के प्रोडक्शन सेक्शन में पेस्ट करें)*

**Preview के लिए:**
```bash
npx wrangler kv:namespace create MAIN_DATA --env preview
```
*(कमांड चलाने के बाद मिलने वाली `id` को `wrangler.toml` के `[env.preview]` सेक्शन में पेस्ट करें)*

---

### 2. Secrets (गुप्त चाबियाँ) सेट करना
`RAZORPAY_SECRET_KEY` को सुरक्षित रूप से जोड़ें:

**Production के लिए:**
```bash
npx wrangler secret put RAZORPAY_SECRET_KEY
```

**Preview के लिए:**
```bash
npx wrangler secret put RAZORPAY_SECRET_KEY --env preview
```

---

### 3. Deployment कमांड्स
अपने प्रोजेक्ट को डिप्लॉय करने के लिए इन कमांड्स का उपयोग करें:

**Preview एन्वायरमेंट पर डिप्लॉय करें (Testing के लिए):**
```bash
npx wrangler deploy --env preview
```

**Production एन्वायरमेंट पर डिप्लॉय करें (Live के लिए):**
```bash
npx wrangler deploy
```

---

### महत्वपूर्ण नोट:
- `wrangler.toml` में `PASTE_PRODUCTION_KV_ID_HERE` और `PASTE_PREVIEW_KV_ID_HERE` को ऊपर बनाए गए KV IDs से बदलें।
- डिप्लॉयमेंट से पहले सुनिश्चित करें कि आपने `npm run build` चला लिया है।
