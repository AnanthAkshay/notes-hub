import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import {
  computeVoteTransition,
  extractVoteResponse,
  normalizeVoteValue,
} from '../lib/voting'
import { UpvoteGlyph, DownvoteGlyph } from './icons/ArchiveIcons'

export default function VoteButtons({
  noteId,
  initialScore = 0,
  initialUserVote = 0,
  uploadedBy,
  onVoteChange,
  size = 'md',
}) {
  const { user } = useAuth()

  const [voteState, setVoteState] = useState(() => ({
    score: Number(initialScore ?? 0),
    myVote: normalizeVoteValue(initialUserVote),
  }))

  const [isVoting, setIsVoting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const voteStateRef = useRef(voteState)
  const pendingRef = useRef(false)
  const requestSeqRef = useRef(0)
  const activeNoteIdRef = useRef(noteId)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Sync authoritative props only when no vote request is currently pending
  useEffect(() => {
    const next = {
      score: Number(initialScore ?? 0),
      myVote: normalizeVoteValue(initialUserVote),
    }

    if (activeNoteIdRef.current !== noteId) {
      activeNoteIdRef.current = noteId
      pendingRef.current = false
      requestSeqRef.current += 1
      setIsVoting(false)
      setErrorMessage('')
      voteStateRef.current = next
      setVoteState(next)
      return
    }

    if (pendingRef.current) return

    if (
      voteStateRef.current.score !== next.score ||
      voteStateRef.current.myVote !== next.myVote
    ) {
      voteStateRef.current = next
      setVoteState(next)
    }
  }, [noteId, initialScore, initialUserVote])

  const currentScore = voteState.score
  const currentUserVote = voteState.myVote

  const isOwner = Boolean(user && user.id === uploadedBy)
  const isLoggedOut = !user

  const handleVote = async (e, direction) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (isLoggedOut) {
      setShowLoginPrompt(true)
      setTimeout(() => {
        if (isMountedRef.current) setShowLoginPrompt(false)
      }, 3500)
      return
    }

    if (isOwner || pendingRef.current) return

    pendingRef.current = true
    setIsVoting(true)
    setErrorMessage('')

    const requestSeq = ++requestSeqRef.current
    const targetNoteId = noteId
    const rollbackSnapshot = { ...voteStateRef.current }

    const optimistic = computeVoteTransition(
      rollbackSnapshot.myVote,
      direction,
      rollbackSnapshot.score
    )
    voteStateRef.current = {
      score: optimistic.nextScore,
      myVote: optimistic.nextVote,
    }
    setVoteState((curr) => {
      const t = computeVoteTransition(curr.myVote, direction, curr.score)
      return { score: t.nextScore, myVote: t.nextVote }
    })
    onVoteChange?.(optimistic.nextScore, optimistic.nextVote)

    try {
      const { data, error } = await supabase.rpc('cast_vote', {
        p_note_id: targetNoteId,
        p_value: direction,
      })

      if (error) throw error

      if (
        !isMountedRef.current ||
        requestSeq !== requestSeqRef.current ||
        activeNoteIdRef.current !== targetNoteId
      ) {
        return
      }

      const authoritative = extractVoteResponse(data)
      voteStateRef.current = authoritative
      setVoteState(() => authoritative)
      onVoteChange?.(authoritative.score, authoritative.myVote)
    } catch (err) {
      console.error('[Vote Error]', err)

      if (
        !isMountedRef.current ||
        requestSeq !== requestSeqRef.current ||
        activeNoteIdRef.current !== targetNoteId
      ) {
        return
      }

      voteStateRef.current = rollbackSnapshot
      setVoteState(() => rollbackSnapshot)
      onVoteChange?.(rollbackSnapshot.score, rollbackSnapshot.myVote)

      setErrorMessage(
        err.message?.includes('Self-voting')
          ? "You can't vote on your own note."
          : err.message || 'Vote failed. Please retry.'
      )
      setTimeout(() => {
        if (isMountedRef.current) setErrorMessage('')
      }, 3000)
    } finally {
      if (requestSeq === requestSeqRef.current) {
        pendingRef.current = false
        if (isMountedRef.current) {
          setIsVoting(false)
        }
      }
    }
  }

  const isSmall = size === 'sm'

  return (
    <div
      className="relative inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
      data-no-print
    >
      <div
        className={`inline-flex items-center rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-hairline)] select-none transition-colors ${
          isSmall ? 'px-1 py-0.5 gap-0.5' : 'px-1.5 py-1 gap-1'
        } ${
          isOwner
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:border-[var(--border-strong)]'
        }`}
        title={isOwner ? "You can't vote on your own note" : undefined}
      >
        <button
          type="button"
          onClick={(e) => handleVote(e, 1)}
          disabled={isVoting || isOwner}
          aria-label="Upvote note"
          className={`rounded-[4px] transition-colors flex items-center justify-center cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
            isSmall ? 'p-1' : 'p-1.5'
          } ${
            currentUserVote === 1
              ? 'bg-[var(--bg-inverse)] text-[var(--text-inverse)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-surface-hover)]'
          }`}
        >
          <UpvoteGlyph className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>

        <span
          className={`font-mono-meta font-semibold tracking-tight ${
            isSmall ? 'text-xs min-w-[20px]' : 'text-sm min-w-[26px]'
          } text-center ${
            currentScore > 0
              ? 'text-[var(--text-ink)]'
              : currentScore < 0
                ? 'text-[var(--accent-danger)]'
                : 'text-[var(--text-subtle)]'
          }`}
        >
          {currentScore}
        </span>

        <button
          type="button"
          onClick={(e) => handleVote(e, -1)}
          disabled={isVoting || isOwner}
          aria-label="Downvote note"
          className={`rounded-[4px] transition-colors flex items-center justify-center cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
            isSmall ? 'p-1' : 'p-1.5'
          } ${
            currentUserVote === -1
              ? 'bg-[var(--accent-danger)] text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--bg-surface-hover)]'
          }`}
        >
          <DownvoteGlyph className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      </div>

      {showLoginPrompt && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-[var(--bg-inverse)] text-[var(--text-inverse)] text-xs px-3 py-1.5 rounded-[6px] border border-[var(--border-strong)] whitespace-nowrap flex items-center gap-2">
          <span>Sign in to vote</span>
          <Link
            to="/login"
            className="underline font-semibold text-[var(--accent-amber)]"
            onClick={(e) => e.stopPropagation()}
          >
            Log In
          </Link>
        </div>
      )}

      {errorMessage && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-[var(--accent-danger)] text-white text-[11px] px-2.5 py-1 rounded-[4px] whitespace-nowrap font-medium">
          {errorMessage}
        </div>
      )}
    </div>
  )
}
