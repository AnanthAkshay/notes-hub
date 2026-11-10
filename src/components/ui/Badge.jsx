import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'

export function VerifiedBadge({ teacherName, date, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#01AB31]/10 text-[#01AB31] border border-[#01AB31]/20 text-xs font-semibold ${className}`}
      title={teacherName ? `Verified by ${teacherName}` : 'Faculty Verified'}
    >
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">
        {teacherName ? `Verified by ${teacherName}` : 'Faculty Verified'}
      </span>
      {date && <span className="opacity-70 text-[10px] hidden sm:inline">• {date}</span>}
    </span>
  )
}

export function NeedsReviewBadge({ reason, count, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF3333]/10 text-[#FF3333] border border-[#FF3333]/20 text-[11px] font-semibold ${className}`}
    >
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span>{reason || (count ? `${count} Reports` : 'Needs Review')}</span>
    </span>
  )
}

export function RoleBadge({ role = 'student', className = '' }) {
  const isTeacher = role === 'teacher'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        isTeacher
          ? 'bg-black text-white'
          : 'bg-[#F0EEED] text-black/70 border border-black/10'
      } ${className}`}
    >
      {isTeacher && <ShieldCheck className="w-3 h-3 text-[#FFC633]" />}
      <span>{isTeacher ? 'Faculty' : 'Student'}</span>
    </span>
  )
}

export default VerifiedBadge
