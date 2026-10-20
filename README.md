# StudyPilot AI — Stage 3: AI Study Coach & Notes Studio

StudyPilot AI is an AI-powered personal study coach designed to help students master complex subjects through personalized study scheduling, active recall quizzes, spaced-repetition flashcards, and grounded document inquiry.

This repository represents **Stage 3: AI Study Coach & Notes Studio**, introducing multi-format document ingestion (PDF, Word, Markdown, Text), SQLite persistence, and Google Gemini API integration for structured study summaries and grounded Q&A ("Ask Your Notes").

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite with development API proxy (`/api` &rarr; `http://127.0.0.1:8000`)
- **Styling**: Tailwind CSS with custom Indigo accent palette & class-based dark mode
- **Routing**: React Router (`react-router-dom` v7) with `ProtectedRoute`
- **State & Auth**: Lightweight React `AuthContext` with HttpOnly cookie support and Bearer token fallback
- **Icons**: Lucide Icons (`lucide-react`)
- **Visualizations**: Recharts

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Server**: Uvicorn (ASGI)
- **Database**: SQLite with SQLAlchemy 2.x ORM, foreign key enforcement (`PRAGMA foreign_keys=ON`), and lightweight schema migrations
- **Authentication**: `bcrypt` password hashing, `pyjwt` access tokens, dual header and cookie session handling
- **Document Text Extractors**: `pypdf` for PDF parsing, `python-docx` for Word documents, native UTF-8/Latin-1 decoding for Markdown/Text
- **AI Model**: Google Gemini API via official `google-genai` SDK (`gemini-3.8-flash`)
- **Testing**: `pytest` & `httpx` (async ASGI client)

---

## 📁 Repository Structure

```text
StudyPilotAI/
├── .gitignore                      # Excludes venv, node_modules, dist, .env, DBs (*.db), private docs
├── README.md                       # Complete project & setup documentation
├── backend/
│   ├── .env                        # Local environment variables (GEMINI_API_KEY, secrets)
│   ├── .env.example                # Backend configuration template
│   ├── requirements.txt            # Python dependencies (FastAPI, SQLAlchemy, pypdf, python-docx, google-genai)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application with lifespan DB init & routers
│   │   ├── config.py               # Pydantic BaseSettings (DB URL, JWT Secret, Gemini API Key/Model)
│   │   ├── database.py             # SQLAlchemy engine, SessionLocal, PRAGMA, schema migration
│   │   ├── models.py               # User, StudyTask, StudySession, QuizAttempt, Document
│   │   ├── schemas.py              # Pydantic models for Auth, Tasks, Documents, and AI Q&A
│   │   ├── auth.py                 # Password hashing, JWT creation/decoding, get_current_user
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── extractor.py        # Safe text extraction from PDF, DOCX, TXT, MD
│   │   │   └── gemini.py           # Google Gemini SDK prompt templates & grounding
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── health.py           # GET /api/health
│   │       ├── auth.py             # POST /register, POST /login, GET /me, POST /logout
│   │       ├── tasks.py            # GET, POST, PATCH, DELETE /api/tasks (user-scoped)
│   │       ├── sessions.py         # GET, POST /api/sessions (user-scoped)
│   │       ├── quizzes.py          # GET, POST /api/quizzes (user-scoped)
│   │       └── documents.py        # GET, POST, DELETE /api/documents, /summarize, /notes/ask, /ai/status
│   └── tests/
│       ├── __init__.py
│       ├── test_health.py          # System health check tests
│       ├── test_auth_and_user_data.py # Auth flow, JWT, cookies, and user data isolation tests
│       └── test_documents_and_ai.py   # Document upload, extraction, and AI endpoints tests
└── frontend/
    ├── .env.example                # Frontend environment configuration template
    ├── index.html                  # HTML entry point with Google Fonts (Inter)
    ├── package.json                # Frontend dependencies & scripts
    ├── tsconfig.json               # TypeScript configuration
    ├── vite.config.ts              # Vite configuration with /api development proxy
    ├── tailwind.config.js          # Tailwind styling with dark mode & brand palette
    ├── postcss.config.js
    └── src/
        ├── main.tsx                # React root mount
        ├── App.tsx                 # Protected route declarations with AuthProvider & ThemeProvider
        ├── index.css               # Tailwind directives & base styles
        ├── context/
        │   ├── ThemeContext.tsx    # Light/dark theme provider with localStorage sync
        │   └── AuthContext.tsx     # Authentication state provider
        ├── services/
        │   └── api.ts              # API client for Auth, Tasks, Sessions, Quizzes, Documents, AI
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.tsx     # Navigation sidebar with stage indicator and drawer
        │   │   ├── TopNav.tsx      # Top bar with authenticated user profile & theme switcher
        │   │   ├── ProtectedRoute.tsx # Route guard redirecting unauthenticated users to login
        │   │   └── AppLayout.tsx   # Responsive app shell container
        │   └── ui/
        │       ├── Button.tsx      # Variants: primary, secondary, outline, ghost, danger
        │       ├── Card.tsx        # Composite card component system
        │       ├── EmptyState.tsx  # Stage-tagged, non-deceptive empty state container
        │       ├── LoadingSpinner.tsx # Spinners & Skeleton loader components
        │       ├── ErrorAlert.tsx  # Error display with retry trigger
        │       └── ThemeToggle.tsx # Accessible light/dark toggle switch
        └── pages/
            ├── Dashboard.tsx       # Live user-scoped tasks, study time chart, and metrics
            ├── NotesStudio.tsx     # Document upload, text inspection, and Gemini study summaries
            ├── StudyPlanner.tsx    # Interactive study task manager & study session logging
            ├── QuizLab.tsx         # Active recall & adaptive evaluation roadmap
            ├── Flashcards.tsx      # Spaced repetition card decks (SM-2)
            ├── AskNotes.tsx        # Grounded conversational inquiry with Gemini citations
            ├── Progress.tsx        # Study velocity & retention charts
            ├── Login.tsx           # Real authentication sign-in form
            ├── Signup.tsx          # Real user registration form
            └── NotFound.tsx        # 404 page with return route
```

---

## 🔒 Security & Privacy Practices

1. **No Frontend API Keys**: The Gemini API key is strictly stored in `backend/.env` on the server and is never exposed to the browser or logged in console/responses.
2. **Grounding & Attribution**: Responses in "Ask Your Notes" are constrained to user-uploaded study text, with references citing the source document.
3. **User Isolation**: All document uploads, extracted text, and AI queries are scoped strictly to the authenticated `current_user.id`.
4. **Git Hygiene**: Uploaded files, database files (`*.db`), `.env` files, and virtual environments are ignored in `.gitignore`.

---

## 🚀 Quickstart Guide (Windows PowerShell)

### Step 1: Start Backend (Terminal 1)

```powershell
# Navigate to the backend directory
cd backend

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run automated test suite
pytest -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend is running at **`http://127.0.0.1:8000`**:
- **Interactive OpenAPI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **AI Status Endpoint**: [http://127.0.0.1:8000/api/ai/status](http://127.0.0.1:8000/api/ai/status)

---

### Step 2: Start Frontend (Terminal 2)

```powershell
# Navigate to the frontend directory
cd frontend

# Verify TypeScript compilation & production build
npm run build

# Start Vite development server
npm run dev
```

The application is accessible at **`http://localhost:5173`**.

---

## 🤖 How to Test Real Gemini AI Responses

1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Open `backend/.env` in your editor and enter your key:
   ```env
   GEMINI_API_KEY="AIzaSyYourActualKeyHere"
   GEMINI_MODEL="gemini-3.8-flash"
   ```
3. Restart the backend server (`uvicorn app.main:app --reload --port 8000`).
4. In the browser ([http://localhost:5173](http://localhost:5173)):
   - Sign in or create an account.
   - Go to **Notes Studio** (`/notes`). Notice the green badge: `Gemini: gemini-3.8-flash`.
   - Click **Upload Document** and select a `.txt`, `.md`, `.pdf`, or `.docx` file.
   - Click **Generate Summary** on the uploaded document card. Gemini will generate an Executive Overview, Key Concepts, Core Takeaways, and Active Recall prompts.
   - Go to **Ask Your Notes** (`/ask`). Pose a question about your study materials to receive grounded explanations with cited document sources.
