import { supabase } from './supabaseClient'
import { ITEMS_PER_PAGE } from './constants'

const NOTE_DETAIL_COLUMNS =
  'id, title, subject, semester, description, file_url, uploaded_by, score, verified, verified_by, verified_at, created_at, profiles:uploaded_by(full_name, email, role), verifier:verified_by(full_name, email)'

const REVIEW_UNVERIFIED_COLUMNS =
  'id, title, subject, semester, file_url, score, verified, verified_by, created_at, uploaded_by, profiles:uploaded_by(full_name, email, role)'

function normalizeFeedRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    semester: row.semester,
    file_url: row.file_url,
    uploaded_by: row.uploaded_by,
    score: Number(row.score ?? 0),
    verified: Boolean(row.verified),
    verified_by: row.verified_by || null,
    created_at: row.created_at,
    uploader_name: row.uploader_name || 'Student',
    verifier_name: row.verifier_name || null,
    my_vote: Number(row.my_vote ?? 0),
  }))
}

export async function fetchNotesFeed({
  subject = '',
  semester = '',
  verifiedOnly = false,
  search = '',
  sort = 'top',
  limit = ITEMS_PER_PAGE,
  offset = 0,
} = {}) {
  const filters = {}
  if (subject) filters.subject = subject
  if (semester) filters.semester = semester
  if (verifiedOnly) filters.verified_only = true
  if (search) filters.search = search

  const { data, error } = await supabase.rpc('get_notes_feed', {
    p_filters: filters,
    p_sort: sort || 'top',
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error

  const items = normalizeFeedRows(data)
  const totalCount =
    data && data.length > 0 ? Number(data[0].total_count ?? items.length) : 0

  return {
    items,
    totalCount,
    offset,
    limit,
  }
}

export async function fetchHomeFeed() {
  const [topRes, newRes, profilesCountRes] = await Promise.all([
    supabase.rpc('get_notes_feed', {
      p_filters: { verified_only: true },
      p_sort: 'top',
      p_limit: 4,
      p_offset: 0,
    }),
    supabase.rpc('get_notes_feed', {
      p_filters: {},
      p_sort: 'newest',
      p_limit: 4,
      p_offset: 0,
    }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  if (topRes.error) throw topRes.error
  if (newRes.error) throw newRes.error
  if (profilesCountRes.error) throw profilesCountRes.error

  const topVerifiedNotes = normalizeFeedRows(topRes.data)
  const newestNotes = normalizeFeedRows(newRes.data)

  const verifiedCount =
    topRes.data && topRes.data.length > 0
      ? Number(topRes.data[0].total_count ?? topVerifiedNotes.length)
      : topVerifiedNotes.length

  const notesCount =
    newRes.data && newRes.data.length > 0
      ? Number(newRes.data[0].total_count ?? newestNotes.length)
      : newestNotes.length

  return {
    topVerifiedNotes,
    newestNotes,
    stats: {
      notesCount,
      verifiedCount,
      studentsCount: profilesCountRes.count || 0,
    },
  }
}

export async function fetchNoteDetail(noteId, userId) {
  const notePromise = supabase
    .from('notes')
    .select(NOTE_DETAIL_COLUMNS)
    .eq('id', noteId)
    .single()

  const votePromise = userId
    ? supabase
        .from('votes')
        .select('value')
        .eq('note_id', noteId)
        .eq('user_id', userId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [noteRes, voteRes] = await Promise.all([notePromise, votePromise])

  if (noteRes.error) throw noteRes.error

  return {
    note: noteRes.data,
    myVote: Number(voteRes.data?.value ?? 0),
  }
}

export async function fetchReviewQueues(userId) {
  const unverifiedPromise = supabase
    .from('notes')
    .select(REVIEW_UNVERIFIED_COLUMNS)
    .eq('verified', false)
    .order('created_at', { ascending: false })

  const reportedPromise = supabase
    .from('notes_reported_queue')
    .select(
      'id, title, subject, semester, file_url, score, verified, created_at, uploader_name, open_report_count, open_reports, needs_review'
    )

  const votesPromise = userId
    ? supabase.from('votes').select('note_id, value').eq('user_id', userId)
    : Promise.resolve({ data: [], error: null })

  const [unverifiedRes, reportedRes, votesRes] = await Promise.all([
    unverifiedPromise,
    reportedPromise,
    votesPromise,
  ])

  if (unverifiedRes.error) throw unverifiedRes.error
  if (reportedRes.error) throw reportedRes.error

  const voteMap = {}
  if (votesRes.data) {
    votesRes.data.forEach((v) => {
      voteMap[v.note_id] = v.value
    })
  }

  const unverifiedNotes = (unverifiedRes.data || []).map((n) => ({
    ...n,
    my_vote: Number(voteMap[n.id] ?? 0),
  }))

  const reportedNotes = (reportedRes.data || []).map((r) => ({
    ...r,
    open_reports_count: r.open_reports_count ?? r.open_report_count ?? 0,
    recent_report_reason: r.recent_report_reason ?? r.open_reports?.[0]?.reason ?? null,
    recent_report_details: r.recent_report_details ?? r.open_reports?.[0]?.details ?? null,
  }))

  return {
    unverifiedNotes,
    reportedNotes,
  }
}
