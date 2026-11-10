import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function VoteButtons({
  noteId,
  initialScore = 0,
  initialUserVote = 0,
  uploadedBy,
  onVoteChange,
}) {
  const { user } = useAuth()

  // Optimistic overrides during active voting request
  const [optimisticScore, setOptimisticScore] = useState(null)
  const [optimisticVote, setOptimisticVote] = useState(null)

  const [isVoting, setIsVoting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // Derived score and vote values (optimistic when pending, else authoritative props)
  const currentScore =
    optimisticScore !== null ? optimisticScore : initialScore
  const currentUserVote =
    optimisticVote !== null ? optimisticVote : initialUserVote

  const isOwner = Boolean(user && user.id === uploadedBy)
  const isLoggedOut = !user

  const handleVote = async (direction) => {
    // 1. Guard: Logged-out users
    if (isLoggedOut) {
      setShowLoginPrompt(true)
      setTimeout(() => setShowLoginPrompt(false), 3500)
      return
    }

    // 2. Guard: Note author cannot vote on own note
    if (isOwner) {
      return
    }

    // 3. Guard: Prevent double-click while in flight
    if (isVoting) return

    setIsVoting(true)
    setErrorMessage('')

    const prevVote = currentUserVote
    const prevScore = currentScore

    // Calculate optimistic updates
    let nextVote = 0
    let scoreDelta = 0

    if (prevVote === direction) {
      // Toggle off: removing existing vote
      nextVote = 0
      scoreDelta = -direction
    } else if (prevVote === 0) {
      // Brand new vote
      nextVote = direction
      scoreDelta = direction
    } else {
      // Switching vote direction (+1 to -1 or -1 to +1)
      nextVote = direction
      scoreDelta = 2 * direction
    }

    const nextScore = prevScore + scoreDelta

    // Apply optimistic state instantly
    setOptimisticScore(nextScore)
    setOptimisticVote(nextVote)
    onVoteChange?.(nextScore, nextVote)

    try {
      const { data, error } = await supabase.rpc('cast_vote', {
        p_note_id: noteId,
        p_value: direction,
      })

      if (error) throw error

      // Authoritative database values
      if (data) {
        setOptimisticScore(null)
        setOptimisticVote(null)
        onVoteChange?.(data.score, data.user_vote)
      }
    } catch (err) {
      console.error('[Vote Error]', err)
      // Rollback optimistic state
      setOptimisticScore(null)
      setOptimisticVote(null)
      onVoteChange?.(prevScore, prevVote)

      setErrorMessage(
        err.message?.includes('Self-voting')
          ? "You can't vote on your own note."
          : err.message || 'Vote failed. Please retry.'
      )
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="relative inline-flex items-center">
      {/* Compact Voting Capsule */}
      <div
        className={`inline-flex items-center rounded-lg border bg-white shadow-2xs text-xs overflow-hidden ${
          isOwner ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-gray-200'
        }`}
        title={isOwner ? "You can't vote on your own note" : undefined}
      >
        {/* Upvote Button */}
        <button
          type="button"
          onClick={() => handleVote(1)}
          disabled={isVoting || isOwner}
          aria-label="Upvote note"
          className={`px-2 py-1.5 transition-colors flex items-center justify-center font-bold ${
            currentUserVote === 1
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50/50'
          } ${isOwner ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <svg
            className="w-3.5 h-3.5 fill-current"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 3.293l6.707 6.707-1.414 1.414L11 7.121V17H9V7.121L4.707 11.414 3.293 10 10 3.293z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Dynamic Net Score */}
        <span
          className={`px-2 py-1 font-semibold tabular-nums min-w-[28px] text-center select-none ${
            currentUserVote === 1
              ? 'text-emerald-700 font-bold'
              : currentUserVote === -1
              ? 'text-rose-700 font-bold'
              : currentScore > 0
              ? 'text-emerald-600'
              : currentScore < 0
              ? 'text-rose-600'
              : 'text-gray-700'
          }`}
          title={`Net score: ${currentScore}`}
        >
          {currentScore > 0 ? `+${currentScore}` : currentScore}
        </span>

        {/* Downvote Button */}
        <button
          type="button"
          onClick={() => handleVote(-1)}
          disabled={isVoting || isOwner}
          aria-label="Downvote note"
          className={`px-2 py-1.5 transition-colors flex items-center justify-center font-bold ${
            currentUserVote === -1
              ? 'bg-rose-50 text-rose-700'
              : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50/50'
          } ${isOwner ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <svg
            className="w-3.5 h-3.5 fill-current"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 16.707L3.293 10l1.414-1.414L9 12.879V3h2v9.879l4.293-4.293L16.707 10 10 16.707z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Login Prompt Popover (when logged-out user attempts to vote) */}
      {showLoginPrompt && (
        <div className="absolute left-0 bottom-full mb-1.5 z-20 w-44 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg text-center animate-fade-in">
          <span>Please </span>
          <Link
            to="/login"
            className="text-blue-300 font-semibold underline hover:text-blue-200"
          >
            log in to vote
          </Link>
          <span> on notes.</span>
        </div>
      )}

      {/* Error Message Tooltip */}
      {errorMessage && (
        <div className="absolute left-0 bottom-full mb-1.5 z-20 whitespace-nowrap px-2.5 py-1 bg-rose-900 text-rose-100 text-[11px] rounded shadow-md animate-fade-in">
          {errorMessage}
        </div>
      )}
    </div>
  )
}
