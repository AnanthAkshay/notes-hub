import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Upload as UploadIcon, FileText, Link as LinkIcon, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import {
  SEMESTERS,
  SUBJECTS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES,
  ALLOWED_FILE_EXTENSIONS,
} from '../lib/constants'
import Button from '../components/ui/Button'
import { RoleBadge } from '../components/ui/Badge'

export default function Upload() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0] || '')
  const [semester, setSemester] = useState(SEMESTERS[4] || SEMESTERS[0] || '')
  const [description, setDescription] = useState('')
  const [sourceType, setSourceType] = useState('file')
  const [file, setFile] = useState(null)
  const [externalLink, setExternalLink] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileChange = (e) => {
    setError('')
    const selected = e.target.files?.[0]
    if (!selected) {
      setFile(null)
      return
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (selected.size / (1024 * 1024)).toFixed(1)
      setError(
        `File is too large (${sizeMb} MB). Maximum allowed size is 10 MB. For larger files, select "External Link" to paste a Google Drive link.`
      )
      setFile(null)
      e.target.value = ''
      return
    }

    const fileExt = '.' + selected.name.split('.').pop()?.toLowerCase()
    const isAllowedExt = ['.pdf', '.png', '.jpg', '.jpeg'].includes(fileExt)
    const isAllowedMime = ALLOWED_FILE_TYPES.includes(selected.type)

    if (!isAllowedExt && !isAllowedMime) {
      setError(
        'Unsupported file format. Please upload a PDF document or PNG/JPG image.'
      )
      setFile(null)
      e.target.value = ''
      return
    }

    setFile(selected)
  }

  const isValidUrl = (string) => {
    try {
      const parsed = new URL(string)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!title.trim()) {
      setError('Please provide a title for your notes.')
      return
    }
    if (!subject) {
      setError('Please select a subject.')
      return
    }
    if (!semester) {
      setError('Please select a semester.')
      return
    }

    if (sourceType === 'file' && !file) {
      setError('Please select a PDF or image file to upload.')
      return
    }

    if (sourceType === 'link') {
      const trimmedLink = externalLink.trim()
      if (!trimmedLink) {
        setError('Please paste a link to your notes.')
        return
      }
      if (!isValidUrl(trimmedLink)) {
        setError('Please provide a valid URL starting with http:// or https://')
        return
      }
    }

    setLoading(true)
    let uploadedFilePath = null

    try {
      let finalFileUrl = ''

      if (sourceType === 'file') {
        const cleanFileName = file.name
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .substring(0, 50)
        const timestamp = Date.now()
        uploadedFilePath = `${user.id}/${timestamp}-${cleanFileName}`

        const { error: uploadError } = await supabase.storage
          .from('notes-files')
          .upload(uploadedFilePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage
          .from('notes-files')
          .getPublicUrl(uploadedFilePath)

        finalFileUrl = publicUrlData.publicUrl
      } else {
        finalFileUrl = externalLink.trim()
      }

      const { data: insertedNote, error: insertError } = await supabase
        .from('notes')
        .insert({
          title: title.trim(),
          subject,
          semester,
          description: description.trim() || null,
          file_url: finalFileUrl,
          uploaded_by: user.id,
        })
        .select()
        .single()

      if (insertError) {
        if (uploadedFilePath) {
          await supabase.storage.from('notes-files').remove([uploadedFilePath])
        }
        throw new Error(`Database error: ${insertError.message}`)
      }

      queryClient.invalidateQueries({ queryKey: ['home-feed'] })
      queryClient.invalidateQueries({ queryKey: ['notes-feed'] })
      queryClient.invalidateQueries({ queryKey: ['review-queues'] })

      setSuccess('Note published successfully! Redirecting to archive...')
      setTimeout(() => {
        navigate(insertedNote ? `/notes/${insertedNote.id}` : '/notes')
      }, 1000)
    } catch (err) {
      console.error('[Upload Error]', err)
      setError(err.message || 'An error occurred while uploading. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[var(--bg-canvas)] min-h-screen py-10 sm:py-14">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-strong)] p-6 sm:p-9">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-[var(--border-hairline)] mb-7">
            <div>
              <span className="font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[var(--text-subtle)] block mb-1">
                Contribute Study Materials
              </span>
              <h1 className="font-display text-2xl sm:text-3xl text-[var(--text-ink)] tracking-tight">
                Upload Study Notes
              </h1>
            </div>
            <RoleBadge role={profile?.role} />
          </div>

          {success && (
            <div
              role="status"
              className="mb-6 p-3.5 rounded-[6px] bg-[var(--accent-verified-bg)] border border-[var(--accent-verified)]/30 flex items-center gap-2 text-xs font-semibold text-[var(--accent-verified)]"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-6 p-3.5 rounded-[6px] bg-[var(--accent-danger-bg)] border border-[var(--accent-danger)]/30 text-xs font-semibold text-[var(--accent-danger)]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="upload-title"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
              >
                Title <span className="text-[var(--accent-danger)]">*</span>
              </label>
              <input
                id="upload-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operating Systems: CPU Scheduling & Banker's Algorithm"
                className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder:text-[var(--text-subtle)] text-sm rounded-[6px] px-4 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)] font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="upload-subject"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
                >
                  Subject <span className="text-[var(--accent-danger)]">*</span>
                </label>
                <select
                  id="upload-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-sm rounded-[6px] px-3.5 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)] font-medium cursor-pointer"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="upload-semester"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
                >
                  Semester <span className="text-[var(--accent-danger)]">*</span>
                </label>
                <select
                  id="upload-semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-sm rounded-[6px] px-3.5 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)] font-medium cursor-pointer"
                >
                  {SEMESTERS.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="upload-description"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
              >
                Description & Topics Covered{' '}
                <span className="text-[var(--text-subtle)] font-normal lowercase">(optional)</span>
              </label>
              <textarea
                id="upload-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly summarize covered chapters, solved past questions, or formula sheets..."
                className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder:text-[var(--text-subtle)] text-sm rounded-[6px] p-3.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)] resize-none"
              />
            </div>

            <div className="pt-1">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-2">
                Attachment Source <span className="text-[var(--accent-danger)]">*</span>
              </span>
              <div className="flex p-1 rounded-[6px] bg-[var(--bg-surface)] max-w-sm border border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('file')
                    setError('')
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
                    sourceType === 'file'
                      ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Direct File (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSourceType('link')
                    setError('')
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
                    sourceType === 'link'
                      ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>External Link</span>
                </button>
              </div>
            </div>

            {sourceType === 'file' ? (
              <div className="bg-[var(--bg-surface)] rounded-[6px] p-6 text-center border border-dashed border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)]/45 transition-colors">
                <UploadIcon className="w-7 h-7 text-[var(--text-subtle)] mx-auto mb-2" />
                <label className="inline-block cursor-pointer">
                  <span className="text-xs font-semibold text-[var(--text-ink)] underline">
                    Choose a PDF or Image
                  </span>
                  <input
                    type="file"
                    accept={ALLOWED_FILE_EXTENSIONS}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                <p className="font-mono-meta text-[11px] text-[var(--text-subtle)] mt-1">
                  PDF, PNG, JPG accepted · Maximum 10 MB
                </p>
                {file && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-ink)] border border-[var(--border-hairline)]">
                    <FileText className="w-3.5 h-3.5 text-[var(--accent-verified)]" />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span className="font-mono-meta text-[var(--text-subtle)] text-[10px]">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder:text-[var(--text-subtle)] text-sm rounded-[6px] px-4 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)] font-medium"
                />
                <p className="text-[11px] text-[var(--text-subtle)] mt-1.5">
                  Paste a shared Google Drive, Dropbox, or OneDrive link for packs over 10 MB.
                </p>
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--border-hairline)]">
              <Link to="/notes">
                <Button variant="ghost" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="black"
                size="lg"
                disabled={loading}
              >
                <span>{loading ? 'Uploading & Publishing...' : 'Publish Study Notes'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
