# FixVault

FixVault is a personal record of technical problems and the steps that solved them. Save an incident in rough language, review the structured draft, and search your history later without remembering the exact error message.

The app keeps successful fixes and failed attempts together. Answers include the incidents they came from, so you can check the original notes instead of trusting an unsupported suggestion.

## What it does

- Converts rough troubleshooting notes into editable incident records
- Stores the problem, environment, root cause, final fix, tags, and status
- Tracks each attempted fix as successful, failed, or inconclusive
- Finds related incidents using semantic search
- Answers questions about your own archive and shows its sources
- Warns when a similar fix failed before
- Keeps each account's incidents separate

## How it works

The Next.js frontend talks to a FastAPI backend. PostgreSQL stores accounts and full incident records. Pinecone stores vector embeddings used for similarity search. Gemini structures notes, creates embeddings, and writes grounded answers.

Each user supplies a Gemini API key and a Pinecone API key in Settings. Provider keys are encrypted before they are stored. The deployed app does not share the owner's Gemini or Pinecone quota with other users.

## Stack

- Next.js, React, TypeScript, and Tailwind CSS
- FastAPI, SQLAlchemy, and PostgreSQL
- Supabase for hosted PostgreSQL
- Gemini Flash and `gemini-embedding-001`
- Pinecone serverless vector search

## Local setup

Requirements:

- Python 3.11 or newer
- Node.js 18 or newer
- A Supabase PostgreSQL project

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
python scripts\generate_key.py
```

Edit `backend/.env`:

- Set `DATABASE_URL` and `DATABASE_URL_SYNC` to the Supabase connection URI
- Set `JWT_SECRET` to a long random value
- Set `CREDENTIALS_ENCRYPTION_KEY` to the value printed by `generate_key.py`

Start the API:

```powershell
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

Open another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. First account

Sign up, then complete Settings:

1. Create a Gemini key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Create a Pinecone serverless dense index with 1536 dimensions and cosine distance.
3. Paste the Gemini key, Pinecone key, and Pinecone index host into Settings.

## Environment files

`backend/.env` contains the database connection, login secret, encryption key, model names, and allowed frontend origin.

`frontend/.env.local` contains the backend URL used by the Next.js proxy.

Gemini and Pinecone user keys do not belong in either file. They are entered through the Settings page.

## Tests

```powershell
cd backend
.\.venv\Scripts\activate
pytest
```

Build the frontend:

```powershell
cd frontend
npm run build
```

## Deployment

Deploy the frontend and API as separate services, with Supabase providing PostgreSQL. Set `BACKEND_URL` on the frontend. Set the backend variables listed in `backend/.env.example`, use `COOKIE_SECURE=true`, and set `CORS_ORIGINS` to the public frontend URL.

Do not commit `.env`, `.env.local`, `.venv`, `node_modules`, or build output.
