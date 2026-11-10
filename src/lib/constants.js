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

export const ITEMS_PER_PAGE = 20
