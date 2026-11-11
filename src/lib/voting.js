// Pure state transition logic for note voting.

export function normalizeVoteValue(value) {
  if (value === 1 || value === -1) return value
  return 0
}

/**
 * Computes the next vote state and score delta for any of the 6 transitions:
 *   0  -> click  1 => nextVote:  1, delta: +1
 *   0  -> click -1 => nextVote: -1, delta: -1
 *   1  -> click  1 => nextVote:  0, delta: -1
 *   1  -> click -1 => nextVote: -1, delta: -2
 *  -1  -> click -1 => nextVote:  0, delta: +1
 *  -1  -> click  1 => nextVote:  1, delta: +2
 */
export function computeVoteTransition(currentVote, clickedDirection, currentScore = 0) {
  if (clickedDirection !== 1 && clickedDirection !== -1) {
    throw new Error(`Invalid vote direction: ${clickedDirection}`)
  }

  const prevVote = normalizeVoteValue(currentVote)
  const nextVote = prevVote === clickedDirection ? 0 : clickedDirection
  const delta = nextVote - prevVote
  const baseScore = Number.isFinite(Number(currentScore)) ? Number(currentScore) : 0

  return {
    prevVote,
    nextVote,
    delta,
    nextScore: baseScore + delta,
  }
}

/**
 * Extracts authoritative (score, my_vote) from the cast_vote RPC response.
 */
export function extractVoteResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Empty response from cast_vote')
  }

  const rawVote = data.my_vote !== undefined ? data.my_vote : data.user_vote
  return {
    score: Number(data.score ?? 0),
    myVote: normalizeVoteValue(Number(rawVote ?? 0)),
  }
}

