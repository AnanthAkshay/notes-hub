# Notes Hub: Live Presentation & Demo Guide

This document contains a complete **3–4 minute click-by-click live demo script**, presentation talking points, an offline/contingency fallback plan, and prepared answers to five tough questions from evaluators and judges.

---

## 1. Demo Setup & Prerequisites (Do This Before the Presentation)

### Step 1.1: Prepare 3 Demo Accounts
Register three accounts using your configured college email domain (e.g. `msrit.edu`):

1. **Student A**: `student1@msrit.edu` (Password: `Password123!`)
2. **Student B**: `student2@msrit.edu` (Password: `Password123!`)
3. **Teacher**: `teacher@msrit.edu` (Password: `Password123!`)

### Step 1.2: Promote the Teacher in Supabase
Run this single SQL statement in the Supabase **SQL Editor**:
```sql
UPDATE public.profiles
SET role = 'teacher'
WHERE email = 'teacher@msrit.edu';
```

### Step 1.3: Seed Demo Content
In the Supabase SQL Editor, run `supabase/seed-demo.sql`. This populates 8 realistic study notes across Computer Networks, DBMS, OS, ML, TOC, etc., with varied scores and verification statuses.

*(Tip: Keep Student A logged in on Google Chrome and Teacher logged in on an Incognito window or Firefox for seamless switching!)*

---

## 2. 3–4 Minute Live Presentation Flow

```
[0:00 - 0:30] The Problem & The Solution
[0:30 - 1:15] Student A: College Domain Auth & Upload
[1:15 - 2:00] Student B: Tamper-Proof Voting & Ranking
[2:00 - 2:45] Teacher: Faculty Verification Jump
[2:45 - 3:30] Moderation, Reports & Filter Power
[3:30 - 4:00] Architecture & Security Wrap-Up
```

### Act 1: The Problem & The Value Proposition (0:00 – 0:30)
- **Speaker**: *"College students currently rely on WhatsApp, Google Drive links, and Telegram groups for study notes. Half the notes are incomplete or incorrect, and there is no way to know which ones professors actually recommend. We built **Notes Hub**: a collaborative study platform where students share notes, peers vote on quality, and faculty verify curriculum alignment. Notes are ranked dynamically: **Teacher-verified first, then highest net score, then newest**."*
- **Visual**: Show the Notes Hub landing page on the live URL.

---

### Act 2: College Email Protection & Note Upload (0:30 – 1:15)
- **Speaker**: *"First, Notes Hub protects academic integrity by allowing only verified college emails."*
- **Action**:
  1. Click **"Log In"** in the top navbar.
  2. Demonstrate typing `hacker@gmail.com` with any password. Click Sign In/Sign Up.
  3. Show the immediate alert: *"Registration is restricted to college email addresses ending with @msrit.edu"*.
  4. Now log in as **Student A** (`student1@msrit.edu`).
  5. The Navbar immediately updates with an avatar showing `student1@msrit.edu` and a blue **"Student"** badge.
  6. Click **"Upload Notes"**.
  7. Fill in:
     - Title: `Operating Systems: Memory Management & Paging Notes`
     - Subject: `Operating Systems`
     - Semester: `4`
     - Description: `Page replacement algorithms (FIFO, LRU, Optimal) with solved numericals.`
     - Choose a sample PDF (or enter a Drive link).
  8. Click **"Upload & Publish Notes"**.
  9. Toast notification appears: *"Notes published successfully!"* and auto-redirects to Home.

---

### Act 3: Peer Upvoting & Tamper-Proof Scores (1:15 – 2:00)
- **Speaker**: *"Now, another classmate browses the platform to find exam preparation materials."*
- **Action**:
  1. Switch to window with **Student B** (`student2@msrit.edu`) logged in.
  2. Locate Student A's newly uploaded note or the OS Banker's algorithm note.
  3. Click the **Upvote (▲)** button.
     - The score immediately increments by +1 optimistically and the arrow lights up in emerald green.
  4. Click the **Upvote (▲)** button again.
     - The vote toggles off back to neutral, score decrements by -1.
  5. Click the **Downvote (▼)** button.
     - Score shifts to negative and lights up rose red.
- **Speaker**: *"Unlike trivial web apps where client code can send arbitrary scores, our score is tamper-proof: PostgreSQL triggers recalculate the sum of votes in real-time, blocking unauthorized client mutations."*

---

### Act 4: Faculty Verification & Instant Ranking Jump (2:00 – 2:45)
- **Speaker**: *"Notice that an unverified note can have 24 upvotes, but how do students know if it's accurate according to the syllabus? Let's switch to a Faculty perspective."*
- **Action**:
  1. Switch to the window logged in as **Teacher** (`teacher@msrit.edu`).
  2. The teacher navbar displays a violet **"Faculty"** badge and an exclusive **"Review Queue"** tab.
  3. Click **"Review Queue"** (`/review`).
  4. Look at the lower-scored note: `Theory of Computation: DFA/NFA Transitions & Pumping Lemma Proofs` (Score: 4).
  5. Click **"Verify Note"** (or click the emerald Verify button directly on any note card).
  6. The card immediately displays: *"Verified by Prof. Raghavan"*.
  7. Click back to **"Notes"** (Home).
  8. **Key Punchline**: Show that the Theory of Computation note with only 4 votes has jumped **above** the unverified Operating Systems note with 24 votes!
- **Speaker**: *"Faculty authority always supersedes peer popularity. Verified notes jump to the top, ensuring students revise accurate, curriculum-approved material first."*

---

### Act 5: Fast Filtering & Peer Moderation (2:45 – 3:30)
- **Action**:
  1. Click the **"Verified only"** toggle switch. The feed instantly filters exclusively to teacher-verified study guides.
  2. Select Semester `5` and Subject `Computer Networks`. The search parameters synchronize directly with the URL (`/?subject=Computer+Networks&semester=5&verified_only=true`) allowing students to bookmark or share exact query views.
  3. Clear filters.
  4. Show a negative/incomplete note. Click the **"Report"** button.
  5. Select reason: `Incomplete` and details: *"Missing pages 4-8 on virtual memory"*. Submit.
  6. Switch to Teacher window and open **Review Queue** > **"Reported / Needs Review"** tab.
  7. The teacher sees the reported note with the peer report details and can choose to dismiss the reports or delete the note with one click.

---

### Act 6: Architecture & Security Wrap-Up (3:30 – 4:00)
- **Speaker**:
  - *"Full stack built on React 19, Vite, Tailwind CSS, and Supabase Postgres."*
  - *"Enforced by Row Level Security (RLS) on all 4 tables."*
  - *"Tamper-proof score trigger and `SECURITY DEFINER` RPCs for verification and moderation."*
  - *"Deployed on Vercel's global edge network on 100% free tier infrastructure."*

---

## 3. Contingency / Fallback Plan (If Internet or Demo Server Fails)

1. **Local Host Fallback**:
   Have your local development environment already running in the background:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in a standby tab. If Vercel or Wi-Fi hiccups, swap to the localhost tab immediately without hesitation.

2. **Supabase Sleep Check**:
   Always test-login 15 minutes before your demo to ensure Supabase is awake and responding.

3. **Offline Demo Deck / Backup Video**:
   Keep a 90-second screen-recording MP4 on your desktop showing:
   - Login with college email rejection demo.
   - Note upload with file preview.
   - Upvoting and verification jump.
   - Moderation queue.
   If internet drops entirely in the auditorium, present the screen-recording video while narrating live.

---

## 4. Top 5 Evaluator & Judge Q&A

### Q1: How do you prevent vote manipulation or students upvoting their own notes?
**Answer**:
> *"We enforce multi-layered defense. First, the database unique constraint `UNIQUE (note_id, user_id)` restricts every user to at most one vote (+1 or -1) per note. Second, our `cast_vote` RPC function checks `uploaded_by = auth.uid()` and explicitly rejects votes from the note's author. Third, direct client updates to `notes.score` are blocked by Row Level Security; the score is recalculated solely inside a `SECURITY DEFINER` Postgres trigger."*

### Q2: How does someone become a Teacher, and what stops students from claiming to be teachers?
**Answer**:
> *"User roles are stored in the database `profiles` table with a column `role IN ('student', 'teacher')`. Upon signup, every new user defaults to 'student'. Role changes require administrative privileges in Supabase or verification by an institutional admin. Furthermore, all teacher-specific actions (verifying notes, reviewing moderation reports, and deleting notes) execute through backend RPC functions that verify `public.is_teacher()` using `auth.uid()`, preventing unauthorized client calls."*

### Q3: How does the system scale as thousands of students upload notes?
**Answer**:
> *"First, search and feeds use compound B-tree indexes (`verified DESC, score DESC, created_at DESC, id DESC` and `(subject, semester)`) so queries execute in sub-millisecond time. Second, we paginate queries using limit and offset pagination with a 'Load more' interface to prevent heavy payloads. Third, heavy file storage is offloaded to Supabase Storage and external Drive links, so the database stores only small metadata records."*

### Q4: Why did you choose Supabase over a custom Node.js/Express + MongoDB backend?
**Answer**:
> *"For an academic collaboration platform, relational integrity and security boundaries are paramount. Supabase provides full PostgreSQL with ACID compliance, Row Level Security (RLS), and server-side RPCs. This allows us to achieve enterprise-grade authorization and tamper-proof voting triggers directly at the database engine layer without the maintenance overhead, latency, or hosting cost of an intermediate Node.js server, keeping the platform 100% free-tier compliant."*

### Q5: What is on your roadmap for future development?
**Answer**:
> *"Our immediate roadmap includes: (1) AI-assisted summarization and duplicate detection using Gemini to flag identical lecture slides; (2) threaded discussion comments for clarification questions; (3) student bookmarking and personal study collections; and (4) department-level RBAC so CSE, ISE, and ECE faculty only moderate their respective subject feeds."*

