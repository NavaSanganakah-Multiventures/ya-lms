# Deployment & Configuration Commands

यहाँ आपके अपडेटेड 'Workers with Assets' प्रोजेक्ट के लिए आवश्यक कमांड्स दिए गए हैं:

### 1. Secrets (गुप्त चाबियाँ) सेट करना
`RAZORPAY_SECRET_KEY` को दोनों एन्वायरनमेंट के लिए सुरक्षित रूप से जोड़ें:

**Production के लिए:**
```bash
npx wrangler secret put RAZORPAY_SECRET_KEY
```

**Preview के लिए:**
```bash
npx wrangler secret put RAZORPAY_SECRET_KEY --env preview
```

---

### 2. Deployment कमांड्स
अपने प्रोजेक्ट को डिप्लॉय करने के लिए इन कमांड्स का उपयोग करें:

**Preview एन्वायरमेंट पर डिप्लॉय करें (dev.lms.yagyaashram.com):**
```bash
npx wrangler deploy --env preview
```

**Production एन्वायरमेंट पर डिप्लॉय करें (lms.yagyaashram.com):**
```bash
npx wrangler deploy
```

---

### महत्वपूर्ण नोट:
- अब आपने `wrangler.toml` में सभी IDs (D1, R2, KV, Queues) खुद ही सेट कर दिए हैं, इसलिए आपको अलग से KV नेमस्पेस बनाने की जरूरत नहीं है (यदि वे पहले से बने हुए हैं)।
- डिप्लॉयमेंट से पहले सुनिश्चित करें कि आपने `npm run build` चला लिया है ताकि एसेट्स अपडेट हो सकें।
