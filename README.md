# Adityanveshan LMS (Yagya Ashram)

<div align="center">
  <br />
  <h1>आदित्यान्वेषण (Adityanveshan)</h1>
  <p><strong>A Next-Generation Learning Management System by Yagya Ashram & Navasanganakah</strong></p>
  <br />
</div>

## 🕉️ About The Project

**Adityanveshan** is a modern, highly scalable Learning Management System (LMS) developed for **Yagya Ashram** under the technological guidance of **Navasanganakah**. The platform is designed to bridge traditional wisdom and modern education through a robust digital ecosystem.

Our goal is to provide a seamless, interactive, and highly secure learning environment for students across the globe.

### 🏢 Company Details
- **Organization:** Yagya Ashram
- **Technology Partner:** Navasanganakah
- **Platform Name:** Adityanveshan (आदित्यान्वेषण)
- **Domain:** Education & Spiritual Learning Technology

---

## 🌟 Key Features

1. **📚 Comprehensive Course Management**
   - Manage Books, Courses, and Batches seamlessly.
   - Structured curriculum with chapters, lessons, and assignments.

2. **🏆 Gamification Ecosystem (XP & Badges)**
   - Interactive Trophy Room for students.
   - Dynamic Leveling System with XP points.
   - Earnable Badges (e.g., Fast Learner, Scholar) based on lesson/course completion.

3. **🛡️ Advanced Proctoring (Anti-Cheat) System**
   - Face Monitored Exams with live camera tracking.
   - Tab Switch & Window Blur Detection.
   - Copy-Paste & Right-Click Restrictions.
   - Auto-Submit functionality upon multiple violations.

4. **📜 Dynamic Certificates & PDF Generator**
   - Automatically generate aesthetic, high-quality certificates in Devanagari lipi.
   - One-click PDF Notes generator for students.

5. **📊 Deep Analytics & Tracking**
   - Real-time student progress tracking.
   - Study hours and engagement analytics for Admins.

6. **🎥 Real-Time Classes & Video Integration**
   - Cloudflare Real-Time WebRTC integration for Live Classes.
   - Video Hosting and Playback via Cloudflare R2.

---

## 🛠️ Technology Stack

Adityanveshan is built strictly on the **Cloudflare Ecosystem** to ensure 100% Server-Side Rendering (SSR) at the Edge with Zero-Cold Starts.

- **Frontend:** Next.js 15 (React 19), TailwindCSS, Lucide Icons
- **Backend API:** Cloudflare Workers (Edge Computing)
- **Database:** Cloudflare D1 (Serverless SQLite)
- **Object Storage:** Cloudflare R2 (For Media & PDFs)
- **Key-Value Store:** Cloudflare KV (For Tokens & Environment Secrets)
- **Package Manager:** npm

---

## 🚀 Run Locally (Development Setup)

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v22+ Recommended)
- [npm](https://www.npmjs.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (For Cloudflare Database Management)

### 1. Clone the Repository
```bash
git clone https://github.com/NavaSanganakah-Multiventures/ya-lms.git
cd ya-lms
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and configure the necessary keys:
```env
JWT_SECRET=your_secure_jwt_secret_here
ENVIRONMENT=preview
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be running at `http://localhost:3000`.

---

## 🌐 Deployment

This application is strictly built for **Cloudflare Workers**. Do not use standard Vercel or Node.js deployment workflows.

To deploy to Production:
```bash
npm run build
```

## 📄 License

Copyright (c) Yagya Ashram & Navasanganakah. All rights reserved.

This project is licensed under the **PolyForm Noncommercial License 1.0.0** —
see the [`LICENSE`](./LICENSE) file for the full text.

In short:

- ✅ You may use, study, modify, and share this software **for noncommercial purposes**
  (personal study, research, education, religious observance, and charitable /
  public-interest work).
- ❌ **Commercial use is not permitted** without a separate written license from
  the copyright holders.
- You must include the license and the copyright notice in any copy or distribution.

---

<div align="center">
  <p>Built with ❤️ and dedication by Navasanganakah for Yagya Ashram.</p>
</div>
