# Deployment Guide: Notes Hub (100% Free Tier)

This guide covers deploying **Notes Hub** to **Vercel** (with Netlify as an alternative) backed by your free **Supabase** database and storage.

---

## 1. Pre-Deployment Verification

Before pushing to production, verify your local build and secrets:

1. **Verify No Secrets are Committed**:
   - Check that `.env` is listed in `.gitignore` (it is).
   - Never commit your `.env` file or paste the Supabase `service_role` key anywhere.
   - Only `VITE_` prefixed public environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ALLOWED_EMAIL_DOMAIN`) are used in client code.

2. **Test the Production Build Locally**:
   ```bash
   npm run build
   ```
   Confirm the build finishes with `built in ...` and 0 errors.

3. **Run Automated Tests and Linter**:
   ```bash
   npm test
   npm run lint
   ```
   Confirm all test suites pass with 0 errors and 0 warnings.

---

## 2. Push Code to GitHub

1. Open your terminal in the project root (`A:\REACT_PROJECT`) and initialize Git if you haven't already:
   ```bash
   git init
   git branch -M main
   ```

2. Stage all files (the `.gitignore` ensures `node_modules` and `.env` are excluded):
   ```bash
   git add .
   git commit -m "feat: complete Notes Hub with deployment and demo setup"
   ```

3. Create a new repository on [GitHub](https://github.com/new) (e.g. `notes-hub`). Leave "Initialize this repository with a README" **unchecked**.

4. Link and push your repository:
   ```bash
   git remote add origin https://github.com/<your-username>/notes-hub.git
   git push -u origin main
   ```

---

## 3. Deploy to Vercel (Recommended — Free Hobby Plan)

Vercel provides free global CDN hosting, automatic SSL certificates, and zero-configuration CI/CD from GitHub.

### Step 3.1: Connect Your Repository
1. Navigate to [vercel.com](https://vercel.com) and sign in with your GitHub account.
2. In your Vercel Dashboard, click **"Add New..."** > **"Project"**.
3. Locate your `notes-hub` repository and click **"Import"**.

### Step 3.2: Configure Build Settings
- **Framework Preset**: Vite (Vercel automatically detects this).
- **Root Directory**: `./` (leave default).
- **Build Command**: `npm run build` (leave default).
- **Output Directory**: `dist` (leave default).

### Step 3.3: Configure Environment Variables
Expand the **"Environment Variables"** section and add the three required variables:

| Variable Name | Description | Example Value |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project API URL | `https://xyzproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key | `eyJhbGciOi...` |
| `VITE_ALLOWED_EMAIL_DOMAIN` | Allowed institutional domain | `msrit.edu` |

*(Find your URL and anon key in Supabase Dashboard > Project Settings > API).*

### Step 3.4: Deploy
Click **"Deploy"**. Within 60 seconds, your site will be live at `https://notes-hub-xxx.vercel.app`.

### Why `vercel.json` is Included
The project includes a root `vercel.json` file:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
**Why this is mandatory**: React Router is a single-page app (SPA). When a user visits or refreshes a deep link directly (like `/login` or `/review`), Vercel rewrites the request back to `/index.html` so React Router can render the correct route instead of returning an HTTP 404 error.

---

## 4. Alternative: Deploy to Netlify (Free Starter Plan)

If you prefer Netlify:

1. Go to [netlify.com](https://netlify.com) and log in with GitHub.
2. Click **"Add new site"** > **"Import an existing project"** > **GitHub**.
3. Select your `notes-hub` repository.
4. Set:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click **"Site configuration"** > **"Environment variables"** and add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_ALLOWED_EMAIL_DOMAIN`.
6. Click **"Deploy site"**.

*(Note: We have placed `public/_redirects` containing `/* /index.html 200` to handle SPA route refreshes on Netlify automatically).*

---

## 5. Why Not GitHub Pages?

> **Important**: GitHub Pages serves pure static files and returns a 404 error when users refresh or directly visit client-side URLs like `/login` or `/review`, because it lacks server-side wildcard fallback routing to `/index.html` unless you convert the router to `HashRouter` (which exposes ugly `/#/path` URLs).

For professional college evaluations and live demos, Vercel or Netlify is strongly recommended.

---

## 6. Supabase Production Settings

Once your app is deployed and you have your live URL (e.g. `https://notes-hub.vercel.app`), update your Supabase settings:

### 6.1 Set Auth Site URL and Redirect URLs
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** > **URL Configuration**.
3. Under **Site URL**, set your deployed production domain:
   ```
   https://notes-hub.vercel.app
   ```
4. Under **Redirect URLs**, add both your production domain and local development server:
   ```
   https://notes-hub.vercel.app/**
   http://localhost:5173/**
   ```
5. Click **Save**.

### 6.2 Email Confirmation: Demo vs Real Production
- **For Hackathons / Live Presentations / Demos (Recommended)**:
  - Go to **Authentication** > **Providers** > **Email**.
  - Toggle **"Confirm email"** to **OFF**.
  - **Reason**: Supabase free-tier built-in email service is rate-limited to 3-4 emails per hour and can experience delay. Disabling email confirmation allows you, judges, or testers to sign up and instantly log in without waiting for an email.
- **For Long-Term Real Production**:
  - Toggle **"Confirm email"** to **ON**.
  - Configure a custom SMTP provider (e.g., Resend free tier or SendGrid free tier) in **Authentication** > **SMTP Settings** to send legitimate verification emails to institutional addresses.

### 6.3 Free Tier Inactivity Pause Prevention
- **The Free-Tier Rule**: Free Supabase projects automatically pause if they receive zero database queries for **7 consecutive days**.
- **Before Demo Day**: Log into your Supabase dashboard 24 hours prior to your demo. If the project is asleep, click "Restore" (takes ~1-2 minutes).
- **Automated Keep-Alive Ping**:
  This repository includes `.github/workflows/keep-alive.yml`. It runs a free scheduled GitHub Actions cron job every 4 days that sends a lightweight GET request to your Supabase REST endpoint:
  1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
  2. Add repository secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  3. The workflow will now automatically keep your Supabase database warm and prevent pausing.

### 6.4 Supabase Free Tier Quotas & Usage Tracking
All features in Notes Hub are 100% supported within Supabase's generous free tier:
- **Postgres Database**: **500 MB** (sufficient for >250,000 note metadata rows, votes, and reports).
- **File Storage**: **1 GB** (sufficient for ~150-200 5MB PDF notes; files can also be linked externally via Google Drive).
- **Monthly Active Users (MAU)**: **50,000 users** per month.
- **API Requests**: Unlimited.
- **Bandwidth (Egress)**: **2 GB** per month.

To monitor your current consumption:
In the Supabase Dashboard, click **Project Settings** > **Usage**.

