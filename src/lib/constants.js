// ==============================================================================
// Academic Constants for Notes Hub
// ==============================================================================
// Pre-configured lists for Semesters and Department Subjects (ISE sample).
// Add or edit subjects here anytime without modifying database schemas.
// ==============================================================================

export const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
]

export const SUBJECTS = [
  'Computer Networks',
  'Machine Learning',
  'Operating Systems',
  'Database Management Systems',
  'Data Structures & Algorithms',
  'Theory of Computation',
  'Artificial Intelligence',
  'Software Engineering',
  'Research Methodology & IPR',
  'Web Technologies & React',
  'Cloud Computing',
  'Cybersecurity & Cryptography',
  'Environmental Studies',
  'Design and Analysis of Algorithms',
  'Java Programming',
  'Mathematics',
  'Microcontroller',
  'R Programming',
  'Engineering Economics',
  'React',
]

export const SORT_OPTIONS = [
  { value: 'top', label: 'Top Ranked (Verified First)' },
  { value: 'newest', label: 'Newest Uploads' },
  { value: 'upvoted', label: 'Most Upvoted' },
]

// Maximum file size in bytes (10 MB cap for Supabase free tier)
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// Allowed MIME types for uploaded files
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]

export const ALLOWED_FILE_EXTENSIONS = '.pdf,.png,.jpg,.jpeg'

export const ITEMS_PER_PAGE = 12

// Per-subject initials, muted tint colors, and catalog codes (no external images)
export const SUBJECT_METADATA = {
  'Computer Networks': { initials: 'CN', tint: '#EEF4FF', accent: '#1E40AF', code: 'CS501' },
  'Machine Learning': { initials: 'ML', tint: '#F5EEFF', accent: '#6B21A8', code: 'CS602' },
  'Operating Systems': { initials: 'OS', tint: '#FEF6E8', accent: '#92400E', code: 'CS401' },
  'Database Management Systems': { initials: 'DBMS', tint: '#EDFAF0', accent: '#166534', code: 'CS402' },
  'Data Structures & Algorithms': { initials: 'DSA', tint: '#FFF1E8', accent: '#9A3412', code: 'CS301' },
  'Theory of Computation': { initials: 'TOC', tint: '#FDF0F0', accent: '#991B1B', code: 'CS502' },
  'Artificial Intelligence': { initials: 'AI', tint: '#F0FAF8', accent: '#115E59', code: 'CS601' },
  'Software Engineering': { initials: 'SE', tint: '#F2F5F8', accent: '#334155', code: 'CS503' },
  'Research Methodology & IPR': { initials: 'RM', tint: '#FAF0FD', accent: '#581C87', code: 'CS701' },
  'Web Technologies & React': { initials: 'WEB', tint: '#EDFAFC', accent: '#155E75', code: 'CS603' },
  'Cloud Computing': { initials: 'CC', tint: '#EFF7FC', accent: '#075985', code: 'CS702' },
  'Cybersecurity & Cryptography': { initials: 'CYBER', tint: '#FFF0F3', accent: '#9F1239', code: 'CS703' },
  'Environmental Studies': { initials: 'EVS', tint: '#F0FAF2', accent: '#14532D', code: 'HS101' },
  'Design and Analysis of Algorithms': { initials: 'DAA', tint: '#FFF2EB', accent: '#C2410C', code: 'CS403' },
  'Java Programming': { initials: 'JAVA', tint: '#FEF3C7', accent: '#B45309', code: 'CS404' },
  'Mathematics': { initials: 'MATH', tint: '#EFF6FF', accent: '#1D4ED8', code: 'MA401' },
  'Microcontroller': { initials: 'MC', tint: '#F3E8FF', accent: '#7E22CE', code: 'CS405' },
  'R Programming': { initials: 'R', tint: '#ECFDF5', accent: '#047857', code: 'CS406' },
  'Engineering Economics': { initials: 'ECO', tint: '#FDF4FF', accent: '#A21CAF', code: 'EC591' },
  'React': { initials: 'REACT', tint: '#F0FDF4', accent: '#0F766E', code: 'CS594' },
}

export function getSubjectMeta(subject) {
  if (!subject) return { initials: 'DOC', tint: '#F0EEED', accent: '#111111', code: 'GEN' }
  return (
    SUBJECT_METADATA[subject] || {
      initials: subject.slice(0, 3).toUpperCase(),
      tint: '#F0EEED',
      accent: '#111111',
      code: 'GEN',
    }
  )
}
