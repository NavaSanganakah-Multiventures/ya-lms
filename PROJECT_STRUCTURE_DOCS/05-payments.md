# भुगतान प्रणाली (Payment System)

## अवलोकन
YA-LMS **Razorpay** भुगतान गेटवे का उपयोग करता है। सिस्टम एकमुश्त भुगतान, सब्सक्रिप्शन और कूपन/डिस्काउंट का समर्थन करता है।

---

## 1. लेन-देन (Transactions)

### डेटाबेस टेबल: `Transactions`

| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी |
| `user_id` | उपयोगकर्ता आईडी |
| `course_id` | कोर्स आईडी (वैकल्पिक) |
| `order_id` | Razorpay ऑर्डर आईडी |
| `payment_id` | Razorpay भुगतान आईडी |
| `amount` | राशि (पैसे में) |
| `currency` | मुद्रा (INR) |
| `status` | `created` / `paid` / `failed` / `refunded` |
| `type` | `course_enrollment` / `subscription` / `credit_purchase` |
| `coupon_code` | उपयोग किया गया कूपन |

---

## 2. एनरोलमेंट भुगतान

### कोर्स खरीद विकल्प:
1. **एकमुश्त भुगतान** - पूरे कोर्स की कीमत
2. **सब्सक्रिप्शन** - मासिक/आवर्ती भुगतान
3. **निःशुल्क ट्रायल** - सीमित समय के लिए मुफ्त पहुंच
4. **स्व-अध्ययन** - कम कीमत पर स्व-गति पहुंच
5. **क्रेडिट** - क्रेडिट से खरीद

### चेकआउट कंपोनेंट:
`components/CheckoutPanel.tsx`:
- Razorpay एकीकरण (Razorpay बटन)
- कूपन सत्यापन
- बिलिंग पता फॉर्म
- ऑर्डर निर्माण और सत्यापन

---

## 3. कूपन सिस्टम (Coupons)

### डेटाबेस टेबल: `Coupons`

| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी |
| `code` | कूपन कोड |
| `discount_percent` | डिस्काउंट प्रतिशत |
| `max_uses` | अधिकतम उपयोग |
| `current_uses` | वर्तमान उपयोग |
| `expires_at` | समाप्ति तिथि |
| `course_id` | विशिष्ट कोर्स (वैकल्पिक) |
| `min_amount` | न्यूनतम ऑर्डर राशि |

### API:
- `GET/POST/PUT/DELETE /api/admin/coupons` - एडमिन कूपन CRUD

---

## 4. सब्सक्रिप्शन (Subscriptions)

### डेटाबेस टेबल: `Subscriptions`

| फ़ील्ड | विवरण |
|--------|--------|
| `id` | अद्वितीय आईडी |
| `user_id` | उपयोगकर्ता आईडी |
| `course_id` | कोर्स आईडी |
| `razorpay_subscription_id` | Razorpay सब्सक्रिप्शन आईडी |
| `status` | `active` / `cancelled` / `expired` |
| `current_period_start/end` | वर्तमान अवधि |
| `cancelled_at` | रद्दीकरण तिथि |

### UI:
- `app/dashboard/subscription/page.tsx` - सब्सक्रिप्शन प्रबंधन
- `app/admin/subscription/page.tsx` - एडमिन सब्सक्रिप्शन योजनाएं

---

## 5. एडमिन अकाउंटिंग

### `app/admin/accounting/page.tsx`
- सभी लेन-देन की सूची
- राजस्व आंकड़े
- पेजिनेशन

### API:
- `GET /api/admin/accounting` - लेन-देन सूची + राजस्व

---

## 6. फ्लटर भुगतान

### `flutter/student_app/lib/screens/checkout_screen.dart`
- Razorpay भुगतान एकीकरण
- `razorpay_flutter` पैकेज
- ऑर्डर निर्माण और सत्यापन

---

## 7. बैकएंड हैंडलिंग

`src/index.ts` में भुगतान-संबंधित हैंडलर:
- Razorpay ऑर्डर निर्माण
- भुगतान सत्यापन (webhook)
- कूपन सत्यापन
- सब्सक्रिप्शन प्रबंधन
- रिफंड हैंडलिंग

---

यह दस्तावेज़ भुगतान प्रणाली की पूरी जानकारी प्रदान करता है। क्रेडिट सिस्टम के लिए `02-credits.md` देखें।
