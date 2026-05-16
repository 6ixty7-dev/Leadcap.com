# LeadCap — AI Lead Intelligence OS

LeadCap is a production-grade AI-powered lead intelligence operating system built for modern SaaS CRM workflows. It's designed to help local businesses identify high-value leads, validate data deterministically, and categorize businesses using AI (Google Gemini).

## 🚀 Features

- **Lead Import System:** Drag-and-drop CSV/JSON upload with validation and duplicate detection.
- **Validation Engine:** Deterministic checking of phone numbers, emails, websites, and Instagram handles.
- **Credibility Scoring Engine:** 0–100 numerical score based on data completeness, reviews, active websites, etc.
- **AI Categorization (Gemini):** Automatically summarize leads, determine target audiences, and judge outreach potential.
- **Modern Dashboard:** Dark mode, Framer Motion animations, interactive charts, filtering, and pagination.
- **Export System:** Export validated and scored leads back to CSV/JSON.

## 🏗 Architecture

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion.
- **Backend:** Node.js, Express.js, TypeScript.
- **Database:** SQLite (using `sql.js` for pure JS implementation without native build issues).
- **AI Integration:** Google Gemini API (architected to support future Claude/OpenAI switching).

## 🛠 Project Structure

```
/lead-cap
  /frontend         # Next.js App Router Application
  /backend          # Express.js REST API
  ARCHITECTURE.md   # Detailed architecture and planning documentation
```

## 💻 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### 1. Backend Setup

Open a terminal and start the backend server:

```bash
cd backend
npm install
# Set your Gemini API key in .env for AI features
# Example: GEMINI_API_KEY=your_key_here
npm run dev
```

The backend runs on `http://localhost:3001` and uses a local SQLite database stored in `./data/leads.db`.

### 2. Frontend Setup

Open a new terminal and start the frontend application:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`.

### 3. Usage

1. **Import:** Go to the Import page and upload a CSV file containing leads (e.g., `business_name`, `phone`, `email`, `website`, `category`).
2. **Dashboard:** View overall statistics, score distributions, and quality breakdowns.
3. **Leads Table:** Filter, search, and sort your imported leads.
4. **Detail Page:** Click on a lead to view its validation results, score breakdown, and run an **AI Analysis**.
5. **Settings:** Configure connections or re-score all leads.

## 🚀 Deployment (Vercel)

The frontend is ready to be deployed to Vercel instantly:
1. Push the `frontend` folder to a GitHub repository.
2. Go to Vercel dashboard and click **Add New > Project**.
3. Import your GitHub repository.
4. If your root folder has both backend and frontend, set the **Root Directory** in Vercel to `frontend`.
5. Set the Environment Variable:
   - `NEXT_PUBLIC_API_URL` to your production backend URL (or leave blank if testing locally via tunneling).
6. Click **Deploy**. Vercel will automatically detect the Next.js setup.

## 📱 PWA Support

The frontend is configured with `next-pwa`. When built for production (`npm run build`), it generates a Service Worker that caches assets for offline usage and allows the web app to be installed locally to your device or mobile home screen.

## 🧩 Chrome Extension (Future Architecture)

The backend exposes an endpoint `POST /api/import/extension` designed to receive leads directly from a Manifest V3 Chrome Extension. The future extension will use content scripts to extract business details from DOM and send them to this endpoint for instant analysis.

## 🛡 License

Private / Proprietary
