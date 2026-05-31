# AdPlain

AI-powered Facebook Ads dashboard for small business owners. Connects to your Meta ad accounts, scores every ad, and generates a plain-English summary of what's working, what to stop, and exactly what to do next.

## What it does

- Pulls live ad data from the Meta Graph API
- Scores every ad as **WINNER**, **WATCH**, or **PAUSE** based on spend, CTR, CPC, and real conversions (leads + purchases only)
- Generates a 3-section AI summary via Claude: what's working, what to stop, exact next steps
- Caches results for 30 minutes to avoid redundant API calls
- Supports 7-day, 14-day, and 30-day date ranges

## Project structure

```
adplain/
  backend/        Node.js + Express API
  frontend/       React dashboard
```

## Local setup

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:
```
META_ACCESS_TOKEN=your_meta_access_token_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3001
```

Start:
```bash
npm start
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `META_ACCESS_TOKEN` | Yes | Meta (Facebook) user access token with `ads_read` permission |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `PORT` | No | API port (default: 3001) |

## Getting a Meta access token

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create an app (type: Business)
3. Add the **Marketing API** product
4. Use the Graph API Explorer to generate a token with `ads_read` and `ads_management` permissions

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Server status |
| `GET /api/status` | System status, cache, API connectivity |
| `GET /api/accounts` | List active ad accounts |
| `GET /api/analysis?dateRange=last_7d&force=true` | Full analysis, all accounts |
| `GET /api/analysis/:accountId` | Analysis for one account |
| `GET /api/refresh/:accountId` | Force-refresh one account |

## Running tests

```bash
cd backend
node src/test.js
```

## Deploying to Railway

1. Push to GitHub (see below)
2. Create a new Railway project → Deploy from GitHub repo
3. Set root directory to `backend`
4. Add environment variables in Railway dashboard
5. Railway auto-detects the `Procfile` and runs `node src/server.js`

## Pushing to GitHub

```bash
cd ~/adplain
git init
git add .
git commit -m "Initial commit — AdPlain v0.2"
```

Then on GitHub: create a new repository, copy the remote URL, and:

```bash
git remote add origin https://github.com/YOUR_USERNAME/adplain.git
git branch -M main
git push -u origin main
```
