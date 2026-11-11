import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Trash2, ShieldCheck, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { formatRelativeDate } from '../lib/formatDate'
import Button from '../components/ui/Button'
import CopyButton from '../components/ui/CopyButton'
import ConfirmModal from '../components/ui/ConfirmModal'
import { RoleBadge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'

export default function Admin() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const queryClient = useQueryClient()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('teacher')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmRemoveEmail, setConfirmRemoveEmail] = useState(null)
  const [removingEmail, setRemovingEmail] = useState(null)

  const {
    data: staffList = [],
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ['admin-staff-list', user?.id || 'anon'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_staff')
      if (error) throw error
      return data || []
    },
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const currentUserEmail = (user?.email || '').trim().toLowerCase()

  const handleAddStaff = async (e) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = fullName.trim()
    setFormError('')

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Please enter a valid institutional email address.')
      return
    }
    if (!cleanName) {
      setFormError('Please enter the staff member full name.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('admin_add_staff', {
        p_email: cleanEmail,
        p_full_name: cleanName,
        p_role: role,
      })
      if (error) throw error

      showSuccess(`Saved ${cleanName} (${role}) to staff allowlist.`)
      setEmail('')
      setFullName('')
      setRole('teacher')
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] })
    } catch (err) {
      console.error('[Admin] Add staff failed:', err)
      const msg = err.message || 'Failed to add staff member.'
      setFormError(msg)
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!confirmRemoveEmail) return
    const targetEmail = confirmRemoveEmail
    setRemovingEmail(targetEmail)
    try {
      const { error } = await supabase.rpc('admin_remove_staff', {
        p_email: targetEmail,
      })
      if (error) throw error

      showSuccess(`Removed ${targetEmail} from staff allowlist.`)
      setConfirmRemoveEmail(null)
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] })
    } catch (err) {
      console.error('[Admin] Remove staff failed:', err)
      showError(err.message || 'Failed to remove staff member.')
    } finally {
      setRemovingEmail(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 min-h-screen">
      {/* Header Banner */}
      <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono-meta text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-[4px] bg-[var(--bg-inverse)] text-[var(--text-inverse)] inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-amber)]" />
                <span>Admin Console</span>
              </span>
              <span className="font-mono-meta text-xs text-[var(--text-subtle)]">
                SQL-Enforced Role Governance
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl text-[var(--text-ink)] tracking-tight">
              Staff Allowlist Management
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 max-w-2xl">
              Approve faculty teachers and platform admins for passwordless OTP login. Removing a staff entry immediately reverts their profile role back to student.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh List</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Add Staff Form */}
        <section className="lg:col-span-4 bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-6">
          <h2 className="font-display text-xl text-[var(--text-ink)] mb-1 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span>Add Teacher / Admin</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-5">
            Approved staff can sign in immediately via Email OTP.
          </p>

          {formError && (
            <div
              role="alert"
              className="mb-4 p-2.5 rounded-[6px] bg-[var(--accent-danger-bg)] border border-[var(--accent-danger)]/30 text-xs font-medium text-[var(--accent-danger)]"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label
                htmlFor="staff-email"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
              >
                College / Work Email
              </label>
              <input
                id="staff-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@msrit.edu"
                className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder:text-[var(--text-subtle)] text-sm rounded-[6px] px-3.5 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)]"
              />
            </div>

            <div>
              <label
                htmlFor="staff-name"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="staff-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Ananya Rao"
                className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder:text-[var(--text-subtle)] text-sm rounded-[6px] px-3.5 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)]"
              />
            </div>

            <div>
              <label
                htmlFor="staff-role"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-ink)] mb-1.5"
              >
                Role
              </label>
              <select
                id="staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[var(--bg-surface)] text-[var(--text-ink)] text-sm font-medium rounded-[6px] px-3.5 py-2.5 border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--border-strong)] cursor-pointer"
              >
                <option value="teacher">Teacher (Faculty Verifier)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="black"
              size="md"
              disabled={submitting}
              className="w-full font-semibold"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Saving Staff...' : 'Add to Allowlist'}</span>
            </Button>
          </form>
        </section>

        {/* Right: Current Staff Table */}
        <section className="lg:col-span-8 bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-hairline)]">
            <h2 className="font-display text-xl text-[var(--text-ink)]">
              Approved Staff ({staffList.length})
            </h2>
            <span className="font-mono-meta text-[11px] text-[var(--text-subtle)]">
              Synced to profiles.role
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <div className="bg-[var(--accent-danger-bg)] border border-[var(--accent-danger)]/30 rounded-[6px] p-5 text-xs font-semibold text-[var(--accent-danger)]">
              {loadError?.message ||
                'Unable to load staff allowlist. Ensure phase9_auth.sql has been applied.'}
            </div>
          ) : staffList.length === 0 ? (
            <div className="bg-[var(--bg-surface)] rounded-[6px] p-10 text-center text-sm text-[var(--text-muted)]">
              No staff members found in the allowlist.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-strong)] font-mono-meta text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Updated</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
                  {staffList.map((staff) => {
                    const isSelf = staff.email?.toLowerCase() === currentUserEmail

                    return (
                      <tr
                        key={staff.email}
                        className="hover:bg-[var(--bg-surface)]/45 transition-colors"
                      >
                        <td className="py-3.5 pr-4 font-semibold text-[var(--text-ink)]">
                          {staff.full_name}
                        </td>
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono-meta text-xs text-[var(--text-muted)]">
                              {staff.email}
                            </span>
                            <CopyButton
                              text={staff.email}
                              label="Copy"
                              copiedLabel="Copied"
                              variant="ghost"
                              size="sm"
                              className="px-2 py-1 text-[10px]"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <RoleBadge role={staff.role} />
                        </td>
                        <td className="py-3.5 pr-4 font-mono-meta text-xs text-[var(--text-subtle)] whitespace-nowrap">
                          {formatRelativeDate(staff.created_at)}
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap">
                          {isSelf ? (
                            <span className="font-mono-meta text-[11px] font-semibold text-[var(--text-subtle)] px-2.5 py-1 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                              Current Admin
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmRemoveEmail(staff.email)}
                              className="text-[11px] px-3 py-1.5 text-[var(--accent-danger)] border-[var(--accent-danger)]/30 hover:bg-[var(--accent-danger-bg)]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmModal
        open={Boolean(confirmRemoveEmail)}
        title="Remove Staff Member?"
        description={
          confirmRemoveEmail
            ? `Remove ${confirmRemoveEmail} from the staff allowlist? Their existing profile role will revert to student.`
            : ''
        }
        confirmLabel="Remove Staff"
        confirmVariant="danger"
        loading={Boolean(removingEmail)}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemoveEmail(null)}
      />
    </div>
  )
}
