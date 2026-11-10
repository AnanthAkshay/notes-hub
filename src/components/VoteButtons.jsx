import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function VoteButtons({
  noteId,
  initialScore = 0,
  initialUserVote = 0,
  uploadedBy,
  onVoteChange,
  size = 'md',
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

  const handleVote = async (e, direction) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

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

  const isSmall = size === 'sm'

  return (
    <div
      className="relative inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Pill Voting Capsule */}
      <div
        className={`inline-flex items-center rounded-full bg-[#F0EEED] border border-black/10 select-none transition-all ${
          isSmall ? 'px-1.5 py-0.5 gap-1' : 'px-2.5 py-1 gap-1.5'
        } ${
          isOwner
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:border-black/20'
        }`}
        title={isOwner ? "You can't vote on your own note" : undefined}
      >
        {/* Upvote Button */}
        <button
          type="button"
          onClick={(e) => handleVote(e, 1)}
          disabled={isVoting || isOwner}
          aria-label="Upvote note"
          className={`rounded-full transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed ${
            isSmall ? 'p-1' : 'p-1.5'
          } ${
            currentUserVote === 1
              ? 'bg-black text-white'
              : 'text-black/60 hover:text-black hover:bg-black/5'
          }`}
        >
          <ArrowUp className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>

        {/* Dynamic Score Display */}
        <span
          className={`font-semibold tabular-nums tracking-tight ${
            isSmall ? 'text-xs min-w-[16px]' : 'text-sm min-w-[20px]'
          } text-center ${
            currentScore > 0
              ? 'text-black font-bold'
              : currentScore < 0
                ? 'text-[#FF3333] font-bold'
                : 'text-black/60'
          }`}
        >
          {currentScore}
        </span>

        {/* Downvote Button */}
        <button
          type="button"
          onClick={(e) => handleVote(e, -1)}
          disabled={isVoting || isOwner}
          aria-label="Downvote note"
          className={`rounded-full transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed ${
            isSmall ? 'p-1' : 'p-1.5'
          } ${
            currentUserVote === -1
              ? 'bg-[#FF3333] text-white'
              : 'text-black/60 hover:text-[#FF3333] hover:bg-black/5'
          }`}
        >
          <ArrowDown className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      </div>

      {/* Login Prompt Tooltip for logged-out clicks */}
      {showLoginPrompt && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-black text-white text-xs px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1.5">
          <span>Sign in to vote</span>
          <Link
            to="/login"
            className="underline font-bold text-[#FFC633]"
            onClick={(e) => e.stopPropagation()}
          >
            Log In
          </Link>
        </div>
      )}

      {/* Error Message Tooltip */}
      {errorMessage && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-[#FF3333] text-white text-[11px] px-3 py-1 rounded-full shadow-lg whitespace-nowrap animate-in fade-in duration-100 font-medium">
          {errorMessage}
        </div>
      )}
    </div>
  )
}
