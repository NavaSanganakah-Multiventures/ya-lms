# डेटाबेस संरचना (Database Structure)

## अवलोकन
YA-LMS **Cloudflare D1** (SQLite-आधारित) डेटाबेस का उपयोग करता है। पूरी स्कीमा `schema.sql` (823 लाइनें) में परिभाषित है और `db-migrate.ts` स्वचालित माइग्रेशन का काम करता है।

---

## पूरी टेबल सूची

| क्रम | टेबल | विवरण |
|------|-------|--------|
| 1 | `Users` | उपयोगकर्ता (छात्र, शिक्षक, एडमिन) |
| 2 | `OTPs` | एक-बार पासवर्ड |
| 3 | `Categories` | कोर्स श्रेणियां |
| 4 | `Courses` | पाठ्यक्रम परिभाषाएं |
| 5 | `Lessons` | कोर्स/बुक पाठ |
| 6 | `Batches` | बैच शेड्यूलिंग |
| 7 | `Books` | पुस्तक परिभाषाएं |
| 8 | `Enrollments` | छात्र एनरोलमेंट |
| 9 | `Transactions` | भुगतान लेन-देन |
| 10 | `Subscriptions` | आवर्ती सब्सक्रिप्शन |
| 11 | `Subscribers` | ईमेल सब्सक्राइबर्स |
| 12 | `FormTemplates` | डायनामिक फॉर्म टेम्पलेट |
| 13 | `FormResponses` | फॉर्म सबमिशन |
| 14 | `Exams` | परीक्षाएं |
| 15 | `ExamQuestions` | परीक्षा प्रश्न |
| 16 | `ExamAttempts` | परीक्षा प्रयास |
| 17 | `LiveSessions` | लाइव क्लास सत्र |
| 18 | `IndividualBookings` | 1-ऑन-1 बुकिंग |
| 19 | `Recordings` | क्लास रिकॉर्डिंग |
| 20 | `LeaveRequests` | छात्र छुट्टी अनुरोध |
| 21 | `PushSubscriptions` | FCM/WEB पुश पंजीकरण |
| 22 | `Notifications` | सूचना इतिहास |
| 23 | `ScheduledNotifications` | निर्धारित सूचनाएं |
| 24 | `NotificationTemplates` | सूचना टेम्पलेट |
| 25 | `SiteSettings` | साइट विन्यास (key-value) |
| 26 | `CreditWallets` | क्रेडिट वॉलेट |
| 27 | `CreditTransactions` | क्रेडिट लेन-देन |
| 28 | `Gamification` | XP/स्तर/पुरस्कार सेटिंग्स |
| 29 | `Badges` | बैज परिभाषाएं |
| 30 | `UserTrophies` | प्रदान किए गए बैज |
| 31 | `ErrorSessions` | त्रुटि निगरानी |
| 32 | `ErrorSessionEvents` | त्रुटि घटनाएं |
| 33 | `JulesJobs` | Jules ऑटोमेशन ट्रैकिंग |
| 34 | `MerchantProducts` | Google Merchant सिंक |
| 35 | `Coupons` | डिस्काउंट कूपन |
| 36 | `_migrations` | माइग्रेशन ट्रैकिंग |

---

## 1. मुख्य टेबल संरचना

### Users
```sql
CREATE TABLE Users (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'student',
  profile_picture_url TEXT,
  batch_id TEXT,
  family_details TEXT,    -- JSON
  address TEXT,           -- JSON
  education TEXT,         -- JSON
  timezone TEXT,
  language TEXT DEFAULT 'hi',
  status TEXT DEFAULT 'active',
  currency TEXT DEFAULT 'INR',
  created_at TEXT,
  updated_at TEXT
);
```

### OTPs
```sql
CREATE TABLE OTPs (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Courses
```sql
CREATE TABLE Courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  teacher_name TEXT,
  price_inr REAL DEFAULT 0,
  subscription_price_inr REAL DEFAULT 0,
  self_study_price_inr REAL DEFAULT 0,
  has_trial INTEGER DEFAULT 0,
  image_url TEXT,
  category_id TEXT,
  status TEXT DEFAULT 'active',
  certificate_eligible INTEGER DEFAULT 1,
  -- SEO फ़ील्ड्स
  seo_title TEXT,
  seo_description TEXT,
  -- अन्य
  created_at TEXT,
  updated_at TEXT
);
```

### Enrollments
```sql
CREATE TABLE Enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT,
  book_id TEXT,
  progress REAL DEFAULT 0,
  completed_lessons TEXT DEFAULT '[]',  -- JSON array
  enrolled_at TEXT,
  certificate_eligible INTEGER DEFAULT 0,
  source TEXT DEFAULT 'payment'
);
```

---

## 2. ऑटो-माइग्रेशन

### `db-migrate.ts`
- `schema.sql` को लाइव D1 डेटाबेस से तुलना करता है
- लापता टेबल/कॉलम/ट्रिगर स्वचालित रूप से जोड़ता है
- वर्कर स्टार्टअप पर कॉल किया जाता है

---

## 3. मुख्य संबंध (Relationships)

```
Users ──→ Enrollments ──→ Courses / Books
Users ──→ CreditWallets ──→ CreditTransactions
Users ──→ PushSubscriptions
Users ──→ Notifications
Users ──→ ExamAttempts ──→ Exams ──→ Courses
Categories ──→ Courses
Courses ──→ Lessons
Courses ──→ Batches
Courses ──→ LiveSessions
Courses ──→ Recordings
Books ──→ Lessons
Books ──→ Batches
Batches ──→ Users (batch_id)
ErrorSessions ──→ ErrorSessionEvents
```

---

## 4. डेटाबेस प्रबंधन

### `app/admin/database/page.tsx`
- मैन्युअल DB क्वेरी/माइग्रेशन
- POST `/api/admin/database`

---

यह दस्तावेज़ पूरी डेटाबेस संरचना का विवरण प्रदान करता है।
