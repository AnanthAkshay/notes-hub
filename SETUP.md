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

---

# Part 8: Vote Integrity & Feed Performance (Phase 8)

## 14. Run the Phase 8 SQL Migration

1. In the Supabase Dashboard, open **SQL Editor** (`>_`) > **New query**.
2. Paste and run [`supabase/phase8.sql`](./supabase/phase8.sql).
3. Run the mismatch diagnostic query in [`supabase/reconcile_scores.sql`](./supabase/reconcile_scores.sql) and verify it returns **0 rows**.

---

# Part 9: Passwordless Email OTP, Student Roster & Staff Admin (Phase 9)

## 15. Generate & Import the Private Student Roster

> [!WARNING]
> Never commit `data/students.csv`, `students.csv`, or `supabase/roster*.sql`. Both `data/` and `supabase/roster*.sql` are listed in `.gitignore`.

1. Place your roster CSV at `data/students.csv` (must have `usn` and `name` headers; all other columns are ignored).
2. Run the local roster import script in order:
   ```bash
   node scripts/build-roster.mjs
   ```
   This validates USN format (`^1MS\d{2}IS\d{3}$`), checks for duplicates/blank names, and generates the gitignored `supabase/roster.sql` containing **only** `usn`, `name`, and `email` (`lowercase(usn)@msrit.edu`).
3. **Run order in Supabase SQL Editor**:
   1. First run `supabase/roster.sql` (populates `public.student_roster` with RLS enabled and zero client policies).
   2. Next run [`supabase/phase9_auth.sql`](./supabase/phase9_auth.sql) (configures `staff_allowlist`, `profiles.usn`, `auth.users` roster/staff gate, `handle_new_user` Title Case naming, `check_email_allowed`, and admin RPCs).

---

## 16. Configure Supabase SMTP (Gmail App Password) & OTP Email Templates

Supabase's built-in email service is capped at 2–4 emails/hour on the Free Tier and delivers reliably only when custom SMTP is configured:

1. **Create a Gmail App Password**:
   - Enable **2-Step Verification** on the Google account you want to send OTP emails from.
   - Open Google Account **Security** > **App passwords**, create one for **Mail**, and copy the 16-character password.
2. **Configure Custom SMTP in Supabase**:
   - Go to **Project Settings** > **Authentication** > **SMTP Settings** and toggle **Enable Custom SMTP** ON.
   - **Sender email**: your Gmail address (e.g. `noteshub.admin@gmail.com`).
   - **Sender name**: `Notes Hub`.
   - **Host**: `smtp.gmail.com`
   - **Port**: `465` (or `587`).
   - **Username**: your Gmail address.
   - **Password**: the 16-character Gmail App Password.
   - Click **Save**.
3. **Update Email Templates to send 6-digit OTP (`{{ .Token }}`)**:
   - Go to **Authentication** > **Email Templates**.
   - Make sure **Email** provider has **Enable Email OTP** active (**Authentication** > **Providers** > **Email**).
   - Edit **Confirm signup** (used when a roster student or staff member signs in for the very first time via `shouldCreateUser: true`):
     ```html
     <h2>Confirm your Notes Hub login</h2>
     <p>Enter this 6-digit code to finish signing in:</p>
     <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
     ```
   - Edit **Magic Link** (used for subsequent OTP logins):
     ```html
     <h2>Your Notes Hub login code</h2>
     <p>Enter this 6-digit verification code:</p>
     <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
     ```
   - Save both templates.

---

## 17. Bootstrap the First Admin & Add Teachers

1. In the Supabase SQL Editor, run this SQL once (replacing `<MY EMAIL>` and `<MY NAME>` with your own details):
   ```sql
   INSERT INTO staff_allowlist (email, full_name, role)
   VALUES ('<MY EMAIL>', '<MY NAME>', 'admin')
   ON CONFLICT (email) DO UPDATE SET role = 'admin';
   ```
2. Open `/login` in the app, enter your admin email, and verify the 6-digit OTP sent to your inbox.
3. Once signed in, click **Admin** in the Navbar (`/admin`).
4. Use the **Add Teacher / Admin** form to add faculty emails (with full name and role `teacher` or `admin`). Added staff can immediately log in via `/login` using their email and OTP, and any matching existing profile role updates automatically.

---

## 18. How to Test Auth, Privacy & Admin Security

1. **Unregistered USN rejected**: On `/login`, enter `1MS24IS999` → rejected before sending an OTP with `"This email isn't registered. Students use their college USN. Teachers: ask the admin to add you."`
2. **Roster student OTP login**: Enter a valid roster USN (e.g. `1MS24IS001`) → receives 6-digit code → auto-submits on 6th digit → Navbar shows Title Case name (e.g. `Aaditya V`) and USN (`1MS24IS001`).
3. **Wrong / expired code**: Entering a wrong 6-digit code shows `"Incorrect verification code..."`; waiting past expiry shows `"That verification code has expired..."`; requesting repeatedly shows the 60s countdown or rate-limit message.
4. **Teacher added via `/admin`**: Add a teacher on `/admin`, log in with that email in an incognito window → role is `teacher` (`Faculty` badge, `/review` access).
5. **Student blocked from `/admin` & admin RPCs**: Logged in as a student, visiting `/admin` redirects to `/`, and running `await supabase.rpc('admin_list_staff')` in DevTools Console fails with `Unauthorized: Admin privileges required.`
6. **Roster privacy**: In DevTools Console as anon or student, running `await supabase.from('student_roster').select('*')` fails/returns no rows (RLS enabled, no policies, table privileges revoked).
7. **Core features intact**: Browse notes, vote, verify notes as faculty, and check ranking (`verified > score > newest`).

