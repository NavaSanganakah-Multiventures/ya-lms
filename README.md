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
- **Package Manager:** PNPM (Strictly with `--frozen-lockfile`)

---

## 🚀 Run Locally (Development Setup)

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v22+ Recommended)
- [PNPM](https://pnpm.io/) (`npm i -g pnpm`)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (For Cloudflare Database Management)

### 1. Clone the Repository
```bash
git clone https://github.com/navasanganakah/ya-lms-production-nextjs.git
cd ya-lms-production-nextjs
```

### 2. Install Dependencies
```bash
pnpm install --frozen-lockfile
```

### 3. Database Setup (Local)
Generate the local Cloudflare D1 Database schema:
```bash
pnpm run db:setup
```

### 4. Environment Variables
Create a `.env` file in the root directory and configure the necessary keys:
```env
JWT_SECRET=your_secure_jwt_secret_here
ENVIRONMENT=preview
```

### 5. Start Development Server
```bash
pnpm run dev
```

The application will be running at `http://localhost:3000`.

---

## 🌐 Deployment

This application is strictly built for **Cloudflare Workers**. Do not use standard Vercel or Node.js deployment workflows.

To deploy to Production:
```bash
pnpm run build
pnpm run deploy
```

---

<div align="center">
  <p>Built with ❤️ and dedication by Navasanganakah for Yagya Ashram.</p>
</div>
