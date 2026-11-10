# Notes Hub — Comprehensive Manual Test Plan

This manual testing guide verifies all features and security constraints across the application using three distinct accounts:
- **Student A**: `student_a@msrit.edu` (uploader)
- **Student B**: `student_b@msrit.edu` (peer voter & reporter)
- **Teacher**: `teacher@msrit.edu` (faculty verifier & moderator)

---

## Pre-Test Setup
1. Confirm Supabase project is active and migrations `supabase/schema.sql` through `supabase/phase7.sql` have been executed.
2. In Supabase Dashboard > Authentication > Providers > Email, confirm **Confirm email** is set to **OFF** for immediate test sign-ins.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173).

---

## Test Suite 1: Authentication & College Domain Restriction

### 1.1 Commercial Email Rejection (Client-Side)
- **Action**: Navigate to `/login`, toggle to **Sign Up**, and attempt to register with `test@gmail.com`.
- **Expected Result**: Frontend alert displays: *"Access restricted: Please enter your official college email ending with @msrit.edu"*. Submission is halted.

### 1.2 Commercial Email Rejection (Server-Side)
- **Action**: Open browser developer console and invoke `supabase.auth.signUp({ email: 'hacker@gmail.com', password: 'password123' })`.
- **Expected Result**: Database trigger `enforce_email_domain_on_signup` raises an exception; signup is rejected by PostgreSQL.

### 1.3 Legitimate Account Creation
- **Action**: Sign up the three test accounts with password `password123`:
  1. `student_a@msrit.edu` (Full Name: `Akshay Kumar`)
  2. `student_b@msrit.edu` (Full Name: `Bhavana Rao`)
  3. `teacher@msrit.edu` (Full Name: `Prof. S. Sharma`)
- **Expected Result**: Each account logs in successfully and displays the green **STUDENT** role badge.

### 1.4 Faculty Role Promotion
- **Action**: In the Supabase SQL editor, promote `teacher@msrit.edu`:
  ```sql
  UPDATE public.profiles SET role = 'teacher' WHERE email = 'teacher@msrit.edu';
  ```
- **Expected Result**: Refreshing the app for `teacher@msrit.edu` updates the badge to a purple **TEACHER** badge and reveals the **Review** link in the Navbar.

---

## Test Suite 2: Notes Upload & File Storage

### 2.1 Unauthenticated Protection
- **Action**: Log out and navigate to `http://localhost:5173/upload`.
- **Expected Result**: Immediate redirect to `/login`.

### 2.2 Direct File Upload (PDF)
- **Action**: Sign in as `student_a@msrit.edu`. Navigate to `/upload`:
  - Title: `Computer Networks Unit 3 CIDR Subnetting`
  - Subject: `Computer Networks`
  - Semester: `Semester 5`
  - Source: **Upload File** (select a PDF under 10 MB)
  - Click **Publish Notes**.
- **Expected Result**: Green toast appears, redirects to `/`, and the note card renders on Home with the PDF download link opening in a new tab.

### 2.3 External Link Upload
- **Action**: As `student_a@msrit.edu`, navigate to `/upload`:
  - Title: `Machine Learning Regression Slides`
  - Subject: `Machine Learning`
  - Semester: `Semester 5`
  - Source: **External Link** (`https://drive.google.com/file/d/sample`)
  - Click **Publish Notes**.
- **Expected Result**: Note card renders on Home with an external drive link.

### 2.4 File Size & Type Validation
- **Action**: In `/upload`, select an `.exe` file or a file larger than 10 MB.
- **Expected Result**: Warning banner prevents upload and advises compressing or using an external Drive link.

---

## Test Suite 3: Voting System & Tamper-Proof Scores

### 3.1 Self-Voting Prevention
- **Action**: While logged in as `student_a@msrit.edu`, view Note A (authored by Student A).
- **Expected Result**: The vote arrows are disabled with reduced opacity. Hovering displays the tooltip *"You can't vote on your own note"*.

### 3.2 Peer Upvoting & Optimistic UI
- **Action**: Sign in as `student_b@msrit.edu`. Click the **Up arrow (▲)** on Student A's note.
- **Expected Result**: Score increments from `0` to `+1` instantly, up arrow highlights green.

### 3.3 Vote Toggle Off (Un-vote)
- **Action**: As `student_b@msrit.edu`, click the highlighted green **Up arrow (▲)** again.
- **Expected Result**: Vote toggles off, score decrements back to `0`, highlight clears.

### 3.4 Direction Switching
- **Action**: Click the **Down arrow (▼)** (score becomes `-1`), then immediately click the **Up arrow (▲)**.
- **Expected Result**: Score switches from `-1` to `+1` (+2 delta), and highlight shifts from red down to green up.

### 3.5 Tamper-Proof Score Verification
- **Action**: In developer console:
  ```javascript
  await supabase.from('notes').update({ score: 999 }).eq('title', 'Computer Networks Unit 3 CIDR Subnetting')
  ```
- **Expected Result**: Rejected by RLS. `notes.score` is calculated strictly by the server-side trigger summing rows in `public.votes`.

---

## Test Suite 4: Teacher Verification & Ranking Hierarchy

### 4.1 Student Cannot Verify
- **Action**: While logged in as `student_b@msrit.edu`, look at note cards and review routes.
- **Expected Result**: No **Verify** buttons are rendered. Visiting `/review` redirects to Home. Calling `supabase.rpc('set_note_verified', ...)` from the console fails with an unauthorized exception.

### 4.2 Faculty Verification
- **Action**: Sign in as `teacher@msrit.edu`. Locate Student A's note (score `+1`) on the Home feed. Click **✓ Verify** and confirm in the popover.
- **Expected Result**: The card updates instantly with a green badge **✓ Verified by Prof. S. Sharma** and tooltip showing verification timestamp. The button toggles to **✕ Unverify**.

### 4.3 Self-Verification Blocked
- **Action**: As `teacher@msrit.edu`, upload a note.
- **Expected Result**: The card displays a disabled **"Self-authored"** indicator. Faculty cannot verify notes they uploaded themselves.

### 4.4 Ranking Priority Test (Verified > Score > Newest)
- **Setup**:
  - Note 1 (Student B): Unverified, upvoted to score `+4`.
  - Note 2 (Student A): Verified by teacher, score `0` (or `-1`).
- **Action**: View Home feed sorted by default **Top**.
- **Expected Result**: Note 2 (verified, score 0) appears at **Position #1**, ahead of Note 1 (unverified, score +4).
- **Visual Cue**: A divider labeled **"↓ Community Uploads (Ranked by Net Score)"** renders between verified and community notes.

---

## Test Suite 5: Note Reporting & Faculty Moderation Queue

### 5.1 Self-Reporting Block
- **Action**: Log in as `student_a@msrit.edu` and view a note uploaded by Student A.
- **Expected Result**: The report flag icon is not rendered for the author.

### 5.2 Peer Note Reporting
- **Action**: Sign in as `student_b@msrit.edu`. Click the **🚩** flag icon on Student A's note:
  - Select Reason: `Inaccurate or incorrect content`
  - Details: `Formulas on page 4 are missing subnet mask notation.`
  - Click **Submit Report**.
- **Expected Result**: Success toast: *"Thanks! A faculty member will review this note."*

### 5.3 Duplicate Report Block
- **Action**: As `student_b@msrit.edu`, click **🚩** on the same note and submit again.
- **Expected Result**: Friendly notice: *"You have already submitted a report for this note. Faculty will review it."* Database constraint `unique_note_reporter` prevents duplicate rows.

### 5.4 Privacy Protection
- **Action**: As `student_a@msrit.edu`, query `supabase.from('reports').select('*')` in console.
- **Expected Result**: RLS returns only Student A's own reports (0 rows). Reports made by Student B and their identity remain completely hidden.

### 5.5 Faculty Review Queue & Alert Badge
- **Action**: Sign in as `teacher@msrit.edu`.
- **Expected Result**:
  - The Navbar **Review** link displays an alert pill with the count of notes having open reports.
  - On `/review`, switch to the **"Reported / Needs Review"** tab.
  - Student A's reported note appears with the reason, details, timestamp, and a *"Needs Review"* alert banner if threshold is met.

### 5.6 Report Dismissal
- **Action**: As `teacher@msrit.edu`, click **Dismiss Reports**.
- **Expected Result**: Reports status updates to `resolved`, and the note clears from the reported queue.

### 5.7 Faculty Note Deletion
- **Action**: On an inappropriate note in `/review`, click **Delete Note** and confirm in the dialog.
- **Expected Result**: The note, its storage file in `notes-files`, votes, and reports are deleted completely.

---

## Test Suite 6: Responsive Layout & Error Handling

### 6.1 Mobile Viewport (360px & 768px)
- **Action**: In browser DevTools, switch to Mobile Viewport (`360px x 640px`).
- **Expected Result**:
  - No horizontal scrolling occurs.
  - Navbar collapses into a clean hamburger menu.
  - Note cards stack cleanly in a single column.
  - Report and confirmation modals fit within the viewport.

### 6.2 404 Route Handling
- **Action**: Navigate to `http://localhost:5173/nonexistent-route-xyz`.
- **Expected Result**: The 404 Page renders cleanly with a link returning to `/`.

### 6.3 Automated Vitest Logic Tests
- **Action**: Execute:
  ```bash
  npm test
  ```
- **Expected Result**: All 9 unit tests pass in under 500ms.

