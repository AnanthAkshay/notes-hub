import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowUpRight } from 'lucide-react'
import Button from './ui/Button'
import SparkleIcon from './ui/Sparkle'

export default function Footer() {
  return (
    <footer className="mt-16 sm:mt-24">
      {/* Pre-footer Rounded Black CTA Block */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
        <div className="bg-black text-white rounded-[24px] sm:rounded-[32px] md:rounded-[40px] px-6 py-10 sm:px-12 sm:py-16 md:py-20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Subtle Decorative Star Sparkles */}
          <div className="absolute top-6 right-8 text-white/30 hidden sm:block">
            <SparkleIcon size={44} />
          </div>
          <div className="absolute bottom-6 left-12 text-white/20 hidden sm:block">
            <SparkleIcon size={28} />
          </div>

          <div className="max-w-2xl relative z-10 text-center md:text-left">
            <span className="text-xs uppercase tracking-widest text-white/60 font-semibold mb-2 block">
              COLLABORATIVE ACADEMIC COMMUNITY
            </span>
            <h2 className="font-display text-2xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase leading-[0.98]">
              UPLOAD YOUR NOTES. <br />
              HELP YOUR BATCH.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-white/70 max-w-lg">
              Share handwritten notes, lab manuals, and exam cheat sheets. Get
              recognized with faculty verification badges and peer upvotes.
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <Link to="/upload">
              <Button
                variant="white"
                size="lg"
                className="font-semibold shadow-none text-black hover:bg-neutral-200"
              >
                <span>Upload Notes Now</span>
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="bg-[#F0EEED] border-t border-black/10 pt-12 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-black/10">
            {/* Col 1: Brand */}
            <div className="md:col-span-2 space-y-4">
              <Link to="/" className="inline-block">
                <span className="font-display text-2xl text-black tracking-tight uppercase">
                  NOTES.HUB
                </span>
              </Link>
              <p className="text-sm text-black/60 max-w-sm leading-relaxed">
                A clean, peer-reviewed study portal for students and faculty.
                Notes are ranked objectively: faculty-verified first, followed
                by peer voting scores, and chronological recency.
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-black/70 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-[#01AB31]" />
                <span>Restricted to institutional domains (@msrit.edu)</span>
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                Explore
              </h3>
              <ul className="space-y-2 text-sm text-black/60">
                <li>
                  <Link to="/notes" className="hover:text-black transition-colors">
                    All Notes Feed
                  </Link>
                </li>
                <li>
                  <Link
                    to="/notes?verified_only=true"
                    className="hover:text-black transition-colors"
                  >
                    Faculty Verified
                  </Link>
                </li>
                <li>
                  <Link
                    to="/notes?sort=top"
                    className="hover:text-black transition-colors"
                  >
                    Top Ranked Notes
                  </Link>
                </li>
                <li>
                  <Link
                    to="/upload"
                    className="hover:text-black transition-colors"
                  >
                    Upload Notes (PDF/Drive)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Academic Semesters */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                Semesters
              </h3>
              <ul className="space-y-2 text-sm text-black/60">
                <li>
                  <Link
                    to="/notes?semester=3"
                    className="hover:text-black transition-colors"
                  >
                    Semester 3 (DSA, OOP)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/notes?semester=4"
                    className="hover:text-black transition-colors"
                  >
                    Semester 4 (OS, DBMS)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/notes?semester=5"
                    className="hover:text-black transition-colors"
                  >
                    Semester 5 (CN, TOC)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/notes?semester=6"
                    className="hover:text-black transition-colors"
                  >
                    Semester 6 (ML, Web Tech)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Faculty & Moderation */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                Faculty Portal
              </h3>
              <ul className="space-y-2 text-sm text-black/60">
                <li>
                  <Link
                    to="/review"
                    className="hover:text-black transition-colors flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Review Queue</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="hover:text-black transition-colors"
                  >
                    Faculty Verification
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/AnanthAkshay/notes-hub"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-black transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>Open Source Repository</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-black/50">
            <p>Notes Hub © 2026. Built with React 19, Vite, Tailwind CSS & Supabase.</p>
            <p>100% Free Tier Academic Platform • Non-commercial educational use</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
