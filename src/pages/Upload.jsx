import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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

  // Form state
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0] || '')
  const [semester, setSemester] = useState(SEMESTERS[4] || SEMESTERS[0] || '')
  const [description, setDescription] = useState('')
  const [sourceType, setSourceType] = useState('file') // 'file' or 'link'
  const [file, setFile] = useState(null)
  const [externalLink, setExternalLink] = useState('')

  // UI state
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

    // 1. Check file size (10 MB cap for Supabase free tier)
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (selected.size / (1024 * 1024)).toFixed(1)
      setError(
        `File is too large (${sizeMb} MB). Maximum allowed size is 10 MB. For larger files, select "External Link" to paste a Google Drive link.`
      )
      setFile(null)
      e.target.value = ''
      return
    }

    // 2. Check file type
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

      setSuccess('Note published successfully! Redirecting to feed...')
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
    <div className="bg-white min-h-screen py-10 sm:py-16">
      <main className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-[24px] border border-black/10 p-6 sm:p-10 shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-black/10 mb-8">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-black/50 block mb-1">
                Contribute Study Materials
              </span>
              <h1 className="font-display text-2xl sm:text-3xl text-black uppercase tracking-tight">
                UPLOAD STUDY NOTES
              </h1>
            </div>
            <RoleBadge role={profile?.role} />
          </div>

          {/* Success Notification */}
          {success && (
            <div className="mb-6 p-4 rounded-[16px] bg-[#01AB31]/10 border border-[#01AB31]/20 flex items-center gap-2 text-xs font-semibold text-[#01AB31]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div className="mb-6 p-4 rounded-[16px] bg-[#FF3333]/10 border border-[#FF3333]/20 text-xs font-semibold text-[#FF3333]">
              {error}
            </div>
          )}

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Title <span className="text-[#FF3333]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operating Systems: CPU Scheduling & Banker's Algorithm"
                className="w-full bg-[#F0EEED] text-black text-sm rounded-full px-5 py-3 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Subject and Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                  Subject <span className="text-[#FF3333]">*</span>
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#F0EEED] text-black text-sm rounded-full px-4 py-3 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all font-medium cursor-pointer"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                  Semester <span className="text-[#FF3333]">*</span>
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full bg-[#F0EEED] text-black text-sm rounded-full px-4 py-3 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all font-medium cursor-pointer"
                >
                  {SEMESTERS.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Description & Topics Covered <span className="text-black/40 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this note covers (e.g. Chapter 3 numericals, VTU solved exam questions, summary of formulas)..."
                className="w-full bg-[#F0EEED] text-black text-sm rounded-[20px] p-4 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all resize-none font-normal"
              />
            </div>

            {/* Source Type Selector (Pills) */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                Attachment Source <span className="text-[#FF3333]">*</span>
              </label>
              <div className="flex p-1 rounded-full bg-[#F0EEED] max-w-sm border border-black/5">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('file')
                    setError('')
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    sourceType === 'file'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-black/60 hover:text-black'
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
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    sourceType === 'link'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-black/60 hover:text-black'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>External Link</span>
                </button>
              </div>
            </div>

            {/* File Dropzone */}
            {sourceType === 'file' ? (
              <div className="bg-[#F0EEED] rounded-[20px] p-6 text-center border border-dashed border-black/20 hover:border-black transition-colors">
                <UploadIcon className="w-8 h-8 text-black/40 mx-auto mb-2" />
                <label className="inline-block cursor-pointer">
                  <span className="text-xs font-bold text-black underline">
                    Choose a PDF or Image
                  </span>
                  <input
                    type="file"
                    accept={ALLOWED_FILE_EXTENSIONS}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                <p className="text-[11px] text-black/50 mt-1">
                  PDF, PNG, JPG accepted (Maximum 10 MB)
                </p>
                {file && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-xs font-semibold text-black border border-black/10">
                    <FileText className="w-3.5 h-3.5 text-[#01AB31]" />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span className="text-black/40 text-[10px]">
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
                  className="w-full bg-[#F0EEED] text-black text-sm rounded-full px-5 py-3 border border-transparent focus:outline-none focus:border-black/20 focus:bg-white transition-all font-medium"
                />
                <p className="text-[11px] text-black/50 mt-1.5 pl-2">
                  Paste a link to Google Drive, Dropbox, or OneDrive (Recommended for files &gt; 10 MB).
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 flex items-center justify-end gap-3">
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
                className="font-bold shadow-none"
              >
                <span>{loading ? 'Uploading & Publishing...' : 'Publish Study Notes'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
