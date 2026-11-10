# Notes Hub — Setup Guide

Follow these step-by-step instructions to set up your free Supabase backend and connect it to your local Notes Hub React application.

---

# Part 1: Initial Setup (Phase 1)

## 1. Create a Free Supabase Project (100% Free Tier, No Card Required)

1. Go to [https://supabase.com](https://supabase.com) and click **Start your project** or sign in with your GitHub account.
2. In the Supabase Dashboard, click **New project**.
3. Choose an organization (or create a personal one).
4. Fill in the project details:
   - **Name**: `notes-hub`
   - **Database Password**: Choose a strong password and save it in a safe place.
   - **Region**: Choose the region closest to you for low latency.
   - **Pricing Plan**: Select **Free ($0/month)**.
5. Click **Create new project** and wait 1–2 minutes for the database to provision.

---

## 2. Copy Your API URL & Anon Key

1. In your Supabase dashboard, click on **Project Settings (gear icon)** > **API** (or **Data API**).
2. Locate:
   - **Project URL**: (e.g., `https://abcdefghijklm.supabase.co`)
   - **anon / public key**: (a long JWT token starting with `eyJ...`)

> [!WARNING]
> Never copy or use the `service_role` secret key in your React frontend. Only use the public `anon` key.

---

## 3. Run the Base Database Schema (Phase 1)

1. In the Supabase navigation menu, click on the **SQL Editor** (`>_`).
2. Click **New query**.
3. Open [`supabase/schema.sql`](./supabase/schema.sql), paste into the editor, and click **Run**.
4. Confirm in the **Table Editor** that `profiles`, `notes`, and `votes` exist with RLS enabled.

---

# Part 2: Authentication, Roles & Security (Phase 2)

## 4. Configure Your Local `.env` File

1. In the root directory of this project (`A:\REACT_PROJECT`), open your `.env` file (copy from `.env.example` if needed).
2. Set your Supabase URL, anon key, and college email domain:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_ALLOWED_EMAIL_DOMAIN=msrit.edu
   ```

---

## 5. Configure Supabase Email Confirmation Settings

1. In your Supabase dashboard, go to **Authentication** > **Providers** > **Email**.
2. **For Local Development & Testing**: Toggle **Confirm email** to **OFF** and click **Save**.
3. **For Production**: Toggle **Confirm email** to **ON**.

---

## 6. Run the Phase 2 Security SQL Migration

1. In the Supabase SQL Editor, click **New query**.
2. Open [`supabase/phase2.sql`](./supabase/phase2.sql), paste into the editor, and click **Run**.
3. This applies server-side domain restriction, role self-tampering prevention, and the `is_teacher()` helper function.

---

## 7. Create Test Accounts & Promote Teacher

1. Run `npm run dev` and navigate to `http://localhost:5173/login`.
2. Sign up with a student account (e.g., `student@msrit.edu`).
3. Sign up with a teacher account (e.g., `teacher@msrit.edu`).
4. In the Supabase SQL Editor, promote the teacher:
   ```sql
   UPDATE public.profiles
   SET role = 'teacher'
   WHERE email = 'teacher@msrit.edu';
   ```
5. Verify in the app that `teacher@msrit.edu` displays the purple **TEACHER** badge.

---

# Part 3: Notes Upload, Storage & Listing (Phase 3)

## 8. Run the Phase 3 SQL Migration (Storage & Notes RLS)

1. In the Supabase dashboard, open the **SQL Editor** (`>_`).
2. Click **New query**.
3. Open [`supabase/phase3.sql`](./supabase/phase3.sql), paste into the editor, and click **Run**.
4. This script configures notes table RLS and creates the public **`notes-files`** storage bucket (10 MB cap, PDF/PNG/JPG).
5. Verify the bucket is visible and public under the **Storage** section in Supabase.

---

# Part 4: Voting System & Tamper-Proof Scores (Phase 4)

## 9. Run the Phase 4 SQL Migration

1. In the Supabase dashboard, open the **SQL Editor** (`>_`).
2. Click **New query**.
3. Open [`supabase/phase4.sql`](./supabase/phase4.sql), paste all contents into the editor, and click **Run**.
4. This script sets up votes RLS, the `on_vote_changed` automatic score trigger, and the `cast_vote` atomic RPC function.

---

# Part 5: Teacher Verification System (Phase 5)

## 10. Run the Phase 5 SQL Migration

1. In the Supabase dashboard, open the **SQL Editor** (`>_`).
2. Click **New query**.
3. Open [`supabase/phase5.sql`](./supabase/phase5.sql), paste all contents into the editor, and click **Run**.
4. This script sets up the `set_note_verified` RPC, column protection triggers, and the `notes_feed` view.

---

# Part 6: Ranking Algorithm, Sort Controls & URL State (Phase 6)

## 11. Run the Phase 6 SQL Migration

1. In the Supabase dashboard, open the **SQL Editor** (`>_`).
2. Click **New query**.
3. Open [`supabase/phase6.sql`](./supabase/phase6.sql), paste all contents into the editor, and click **Run**.
4. This script creates the composite database indexes for deterministic multi-tier ranking (`Top`, `Newest`, `Most Upvoted`).

---

# Part 7: Reporting, Moderation & UI Polish (Phase 7)

## 12. Run the Phase 7 SQL Migration

1. In the Supabase dashboard, open the **SQL Editor** (`>_`).
2. Click **New query**.
3. Open [`supabase/phase7.sql`](./supabase/phase7.sql), paste all contents into the editor, and click **Run**.
4. This script initializes:
   - `reports` table with strict RLS (students only insert/view their own; teachers view all).
   - "Needs Review" thresholds (notes with 3+ open reports or score <= -3).
   - `resolve_report`, `dismiss_reports_for_note`, and `teacher_delete_note` RPC functions.
   - `get_open_reports_count()` RPC driving the teacher Navbar notification badge.

---

## 13. Test Note Reporting & Teacher Moderation

1. **Student reporting flow**:
   - Sign in as a student (e.g. `student2@msrit.edu`).
   - On any note uploaded by another peer, click the **🚩** flag icon.
   - Choose a reason (e.g. *Inaccurate or incorrect content*), enter optional details, and click **Submit Report**.
   - A success toast confirms receipt. Attempting to report the same note again will notify you that a report is already recorded.
2. **Faculty moderation queue**:
   - Sign in as `teacher@msrit.edu`.
   - The Navbar shows a red alert badge next to **Review** with the number of flagged notes.
   - Click **Review** and switch to the **Reported / Needs Review** tab.
   - You can review open reports, inspect the file, dismiss reports, or permanently delete the note.
3. **Automated Unit Testing**:
   - Execute the unit tests to verify pure application logic:
     ```bash
     npm test
     ```
   - All tests in `src/test/pureLogic.test.js` should pass cleanly.
4. **Comprehensive Manual Testing**:
   - Refer to [`TESTING.md`](./TESTING.md) for the end-to-end multi-account test plan.
