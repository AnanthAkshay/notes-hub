import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { VerifiedSealIcon } from '../icons/ArchiveIcons'

export function VerifiedBadge({ teacherName, date, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[var(--accent-verified-bg)] text-[var(--accent-verified)] border border-[var(--accent-verified)]/30 text-xs font-semibold ${className}`}
      title={teacherName ? `Verified by ${teacherName}` : 'Faculty Verified'}
    >
      <VerifiedSealIcon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">
        {teacherName ? `Verified by ${teacherName}` : 'Faculty Verified'}
      </span>
      {date && (
        <span className="opacity-75 text-[10px] font-mono-meta hidden sm:inline">
          · {date}
        </span>
      )}
    </span>
  )
}

export function NeedsReviewBadge({ reason, count, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[var(--accent-danger-bg)] text-[var(--accent-danger)] border border-[var(--accent-danger)]/30 text-[11px] font-semibold ${className}`}
    >
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span>{reason || (count ? `${count} Reports` : 'Needs Review')}</span>
    </span>
  )
}

export function RoleBadge({ role = 'student', className = '' }) {
  const isAdmin = role === 'admin'
  const isTeacher = role === 'teacher'
  const isStaff = isAdmin || isTeacher
  const label = isAdmin ? 'Admin' : isTeacher ? 'Faculty' : 'Student'

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-mono-meta font-semibold uppercase tracking-wider ${
        isStaff
          ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)]'
          : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-hairline)]'
      } ${className}`}
    >
      {isStaff && <ShieldCheck className="w-3 h-3 text-[var(--accent-amber)]" />}
      <span>{label}</span>
    </span>
  )
}

export default VerifiedBadge
