import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import {
  SEMESTERS,
  SUBJECTS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES,
  ALLOWED_FILE_EXTENSIONS,
} from '../lib/constants'

export default function Upload() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  // Form state
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0] || '')
  const [semester, setSemester] = useState(SEMESTERS[4] || SEMESTERS[0] || '') // Defaults to Semester 5 or 1
  const [description, setDescription] = useState('')
  const [sourceType, setSourceType] = useState('file') // 'file' or 'link'
  const [file, setFile] = useState(null)
  const [externalLink, setExternalLink] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Handle file picker selection with validation
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

  // Validate URL format
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

    // Field validation
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
      const cleanUrl = externalLink.trim()
      if (!cleanUrl) {
        setError('Please enter a valid external link (e.g., Google Drive or Dropbox).')
        return
      }
      if (!isValidUrl(cleanUrl)) {
        setError('Invalid URL format. Links must start with http:// or https://')
        return
      }
    }

    setLoading(true)
    let uploadedFilePath = null

    try {
      let finalFileUrl = ''

      if (sourceType === 'file') {
        // Sanitize file name: remove whitespace and unsafe characters
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const timestamp = Date.now()
        // Format path: <user_id>/<timestamp>-<filename> (matches phase3 storage RLS)
        uploadedFilePath = `${user.id}/${timestamp}-${cleanFileName}`

        // Upload to Supabase Storage "notes-files" bucket
        const { error: uploadError } = await supabase.storage
          .from('notes-files')
          .upload(uploadedFilePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }

        // Retrieve public URL from bucket
        const { data: publicUrlData } = supabase.storage
          .from('notes-files')
          .getPublicUrl(uploadedFilePath)

        finalFileUrl = publicUrlData.publicUrl
      } else {
        finalFileUrl = externalLink.trim()
      }

      // Insert record into "notes" table
      const { error: insertError } = await supabase.from('notes').insert({
        title: title.trim(),
        subject,
        semester,
        description: description.trim() || null,
        file_url: finalFileUrl,
        uploaded_by: user.id,
        score: 0,
        verified: false,
      })

      if (insertError) {
        // If table insert fails, clean up the orphan file from storage
        if (uploadedFilePath) {
          await supabase.storage.from('notes-files').remove([uploadedFilePath])
        }
        throw new Error(`Database error: ${insertError.message}`)
      }

      setSuccess('Note published successfully! Redirecting to feed...')
      setTimeout(() => {
        navigate('/')
      }, 1200)
    } catch (err) {
      console.error('[Upload Error]', err)
      setError(err.message || 'An error occurred while uploading your note.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Upload Study Notes
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Share handwritten notes, slides, or lecture summaries with peers
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            {profile?.role || 'student'}
          </span>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-gray-800 mb-1"
            >
              Note Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit 3: CIDR Subnetting & Routing Algorithms"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Subject & Semester Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-semibold text-gray-800 mb-1"
              >
                Subject <span className="text-rose-500">*</span>
              </label>
              <select
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                {SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="semester"
                className="block text-sm font-semibold text-gray-800 mb-1"
              >
                Semester <span className="text-rose-500">*</span>
              </label>
              <select
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
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
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-gray-800 mb-1"
            >
              Description <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key concepts covered, textbook references, lecture module numbers..."
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Source Selector (File vs Link) */}
          <div className="pt-2">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Note Resource Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => {
                  setSourceType('file')
                  setError('')
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center space-x-1.5 ${
                  sourceType === 'file'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>📄 Upload File</span>
                <span className="text-[10px] text-gray-400">(PDF / Image)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType('link')
                  setError('')
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center space-x-1.5 ${
                  sourceType === 'link'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>🔗 External Link</span>
                <span className="text-[10px] text-gray-400">(Drive / Web)</span>
              </button>
            </div>

            {/* File Picker input */}
            {sourceType === 'file' && (
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <input
                  id="fileUpload"
                  type="file"
                  accept={ALLOWED_FILE_EXTENSIONS}
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Accepted formats: <span className="font-medium text-gray-600">PDF, PNG, JPG</span> (Maximum 10 MB).
                </p>
                {file && (
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>
            )}

            {/* External URL input */}
            {sourceType === 'link' && (
              <div>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Paste a link from Google Drive, Dropbox, Notion, or cloud storage. (Recommended fallback for files &gt; 10 MB).
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading note and saving record...</span>
                </>
              ) : (
                <span>Publish Notes to Community</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
