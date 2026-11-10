import { CheckCircle2, ArrowUp, FileText } from 'lucide-react'
import Sparkle from './ui/Sparkle'

export default function HeroIllustration() {
  return (
    <div className="relative w-full aspect-square max-w-lg mx-auto flex items-center justify-center p-4 sm:p-8 select-none pointer-events-none">
      {/* Decorative Sparkles positioned like in the reference hero */}
      <div className="absolute top-2 right-4 sm:right-8 text-black animate-pulse duration-1000">
        <Sparkle size={64} />
      </div>
      <div className="absolute bottom-12 left-2 sm:left-6 text-black">
        <Sparkle size={40} />
      </div>

      {/* Layer 1: Background card (tilted left) */}
      <div className="absolute w-64 sm:w-72 h-80 sm:h-92 bg-[#F0EEED] rounded-[24px] border border-black/10 -rotate-8 -translate-x-6 translate-y-3 opacity-90 shadow-xs flex flex-col p-5 justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-black/70 border border-black/5">
            Sem 5 • Computer Networks
          </span>
          <FileText className="w-4 h-4 text-black/30" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-black/10 rounded-full w-4/5" />
          <div className="h-3 bg-black/10 rounded-full w-3/5" />
          <div className="h-3 bg-black/10 rounded-full w-2/3" />
        </div>
        <div className="flex justify-between items-center text-xs text-black/40 font-semibold">
          <span>CIDR Subnetting</span>
          <span>+18 Votes</span>
        </div>
      </div>

      {/* Layer 2: Middle card (tilted right) */}
      <div className="absolute w-64 sm:w-72 h-80 sm:h-92 bg-[#F7F6F5] rounded-[24px] border border-black/10 rotate-6 translate-x-4 -translate-y-2 opacity-95 shadow-xs flex flex-col p-5 justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-black/70 border border-black/5">
            Sem 6 • Machine Learning
          </span>
          <FileText className="w-4 h-4 text-black/30" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-black/10 rounded-full w-3/4" />
          <div className="h-3 bg-black/10 rounded-full w-1/2" />
        </div>
        <div className="flex justify-between items-center text-xs text-black/40 font-semibold">
          <span>Gradient Descent Derivations</span>
          <span>+9 Votes</span>
        </div>
      </div>

      {/* Layer 3: Foreground Main Featured Card (Centered, crisp white, verified check) */}
      <div className="relative w-68 sm:w-80 h-84 sm:h-96 bg-white rounded-[24px] border border-black/15 shadow-xl p-6 flex flex-col justify-between z-10 transform -rotate-1">
        {/* Top Badges */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-black text-white">
              Sem 4 • DBMS
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#01AB31]/10 text-[#01AB31] border border-[#01AB31]/20 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified</span>
            </span>
          </div>

          <h3 className="font-display text-xl sm:text-2xl text-black uppercase leading-tight tracking-tight">
            NORMALIZATION & BCNF SOLVED QUESTIONS
          </h3>
          <p className="mt-2 text-xs text-black/60 leading-relaxed">
            Lossless decomposition theorems, 1NF to BCNF rules, and past university numericals solved step-by-step.
          </p>
        </div>

        {/* Realistic Note Preview Diagram Lines */}
        <div className="space-y-2 py-3 border-y border-black/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#F0EEED] flex items-center justify-center font-bold text-[10px]">
              1
            </div>
            <div className="h-2.5 bg-black/15 rounded-full flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#F0EEED] flex items-center justify-center font-bold text-[10px]">
              2
            </div>
            <div className="h-2.5 bg-black/10 rounded-full w-4/5" />
          </div>
        </div>

        {/* Card Footer: Score Capsule & Verifier Credit */}
        <div className="flex items-center justify-between pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0EEED] border border-black/10 text-xs font-bold">
            <ArrowUp className="w-3.5 h-3.5 text-[#01AB31]" />
            <span className="text-black font-extrabold">+24 Score</span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-black/70 block">
              Prof. Raghavan
            </span>
            <span className="text-[10px] text-black/40 block">HOD Verified</span>
          </div>
        </div>
      </div>
    </div>
  )
}
