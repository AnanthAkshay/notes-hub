import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { formatRelativeDate } from '../lib/formatDate'
import {
  computeVoteTransition,
  extractVoteResponse,
  normalizeVoteValue,
} from '../lib/voting'
import {
  ALLOWED_NOT_REGISTERED_MESSAGE,
  resolveLoginIdentifier,
  mapAuthErrorMessage,
  isTeacherRole,
  isAdminRole,
} from '../lib/authHelpers'
import { captureUtmFromSearch, buildShareUrlWithUtm } from '../lib/utm'
import { updateNoteVoteInCache } from '../lib/queryClient'

describe('formatRelativeDate', () => {
  it('returns empty string for null or invalid dates', () => {
    expect(formatRelativeDate(null)).toBe('')
    expect(formatRelativeDate('')).toBe('')
    expect(formatRelativeDate('invalid-date')).toBe('')
  })

  it('formats recent events as Just now or seconds ago', () => {
    const justNow = new Date(Date.now() - 10 * 1000).toISOString()
    expect(formatRelativeDate(justNow)).toBe('Just now')

    const fortySecsAgo = new Date(Date.now() - 40 * 1000).toISOString()
    expect(formatRelativeDate(fortySecsAgo)).toBe('40s ago')
  })

  it('formats minutes and hours ago', () => {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    expect(formatRelativeDate(tenMinsAgo)).toBe('10m ago')

    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    expect(formatRelativeDate(threeHoursAgo)).toBe('3h ago')
  })

  it('formats yesterday and days ago', () => {
    const yesterday = new Date(Date.now() - 26 * 3600 * 1000).toISOString()
    expect(formatRelativeDate(yesterday)).toBe('Yesterday')

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    expect(formatRelativeDate(threeDaysAgo)).toBe('3d ago')
  })
})

describe('Email Domain Restriction Logic', () => {
  const allowedDomain = 'msrit.edu'
  const validateCollegeEmail = (email) => {
    const normalized = email.trim().toLowerCase()
    const domainEscaped = allowedDomain.replace(/\./g, '\\.')
    const domainRegex = new RegExp(`@${domainEscaped}$`, 'i')
    return domainRegex.test(normalized)
  }

  it('rejects public commercial email providers', () => {
    expect(validateCollegeEmail('student@gmail.com')).toBe(false)
    expect(validateCollegeEmail('user@yahoo.co.in')).toBe(false)
    expect(validateCollegeEmail('hacker@msrit.edu.fake.com')).toBe(false)
  })

  it('accepts legitimate college emails regardless of case or whitespace', () => {
    expect(validateCollegeEmail('student@msrit.edu')).toBe(true)
    expect(validateCollegeEmail('  PROFESSOR@MSRIT.EDU  ')).toBe(true)
    expect(validateCollegeEmail('dept.head@msrit.edu')).toBe(true)
  })
})

describe('URL Search Parameter Building Logic', () => {
  const serializeParams = (params) => {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined ||
        value === '' ||
        (key === 'sort' && value === 'top')
      ) {
        search.delete(key)
      } else {
        search.set(key, String(value))
      }
    })
    return search.toString()
  }

  it('omits default sort "top" to preserve clean URLs', () => {
    expect(serializeParams({ sort: 'top' })).toBe('')
  })

  it('serializes custom sort, filters, and verified flags correctly', () => {
    const result = serializeParams({
      sort: 'upvoted',
      subject: 'Computer Networks',
      verified: 'true',
      q: 'Subnetting',
    })
    expect(result).toContain('sort=upvoted')
    expect(result).toContain('subject=Computer+Networks')
    expect(result).toContain('verified=true')
    expect(result).toContain('q=Subnetting')
  })

  it('strips empty or cleared filter fields', () => {
    const result = serializeParams({
      sort: 'newest',
      subject: '',
      semester: null,
      q: '',
    })
    expect(result).toBe('sort=newest')
  })
})

describe('Vote Transition Delta Logic (all 6 transitions)', () => {
  it('1. none (0) -> upvote (+1) applies +1', () => {
    expect(computeVoteTransition(0, 1, 10)).toEqual({
      prevVote: 0,
      nextVote: 1,
      delta: 1,
      nextScore: 11,
    })
  })

  it('2. none (0) -> downvote (-1) applies -1', () => {
    expect(computeVoteTransition(0, -1, 10)).toEqual({
      prevVote: 0,
      nextVote: -1,
      delta: -1,
      nextScore: 9,
    })
  })

  it('3. up (+1) -> click upvote (+1) toggles to none (0) and applies -1', () => {
    expect(computeVoteTransition(1, 1, 11)).toEqual({
      prevVote: 1,
      nextVote: 0,
      delta: -1,
      nextScore: 10,
    })
  })

  it('4. up (+1) -> click downvote (-1) switches to -1 and applies -2', () => {
    expect(computeVoteTransition(1, -1, 11)).toEqual({
      prevVote: 1,
      nextVote: -1,
      delta: -2,
      nextScore: 9,
    })
  })

  it('5. down (-1) -> click downvote (-1) toggles to none (0) and applies +1', () => {
    expect(computeVoteTransition(-1, -1, 9)).toEqual({
      prevVote: -1,
      nextVote: 0,
      delta: 1,
      nextScore: 10,
    })
  })

  it('6. down (-1) -> click upvote (+1) switches to +1 and applies +2', () => {
    expect(computeVoteTransition(-1, 1, 9)).toEqual({
      prevVote: -1,
      nextVote: 1,
      delta: 2,
      nextScore: 11,
    })
  })

  it('chains up then down sequentially giving -2 from the upvoted state', () => {
    const afterUp = computeVoteTransition(0, 1, 5)
    expect(afterUp.nextScore).toBe(6)
    expect(afterUp.nextVote).toBe(1)

    const afterDown = computeVoteTransition(afterUp.nextVote, -1, afterUp.nextScore)
    expect(afterDown.delta).toBe(-2)
    expect(afterDown.nextScore).toBe(4)
    expect(afterDown.nextVote).toBe(-1)
  })

  it('normalizes invalid/null current vote values and rejects bad directions', () => {
    expect(normalizeVoteValue(null)).toBe(0)
    expect(normalizeVoteValue(undefined)).toBe(0)
    expect(normalizeVoteValue(42)).toBe(0)
    expect(computeVoteTransition(undefined, 1, 0).delta).toBe(1)
    expect(() => computeVoteTransition(0, 0, 5)).toThrow()
  })

  it('extracts authoritative (score, my_vote) from server RPC response', () => {
    expect(extractVoteResponse({ score: 7, my_vote: -1 })).toEqual({
      score: 7,
      myVote: -1,
    })
    expect(extractVoteResponse({ score: 0, my_vote: 0 })).toEqual({
      score: 0,
      myVote: 0,
    })
    expect(extractVoteResponse({ score: 3, user_vote: 1 })).toEqual({
      score: 3,
      myVote: 1,
    })
  })

  it('syncs updated score and my_vote across home, notes, detail, and review query caches', () => {
    const client = new QueryClient()
    const noteId = 'note-123'

    client.setQueryData(['home-feed', 'u1'], {
      topVerifiedNotes: [{ id: noteId, score: 5, my_vote: 0 }],
      newestNotes: [{ id: noteId, score: 5, my_vote: 0 }],
      stats: { notesCount: 1, verifiedCount: 1, studentsCount: 1 },
    })
    client.setQueryData(['notes-feed', 'u1', {}], {
      pages: [{ items: [{ id: noteId, score: 5, my_vote: 0 }], totalCount: 1 }],
      pageParams: [0],
    })
    client.setQueryData(['note-detail', noteId, 'u1'], {
      note: { id: noteId, score: 5 },
      myVote: 0,
    })

    updateNoteVoteInCache(client, noteId, 6, 1)
    expect(client.getQueryData(['home-feed', 'u1']).topVerifiedNotes[0]).toMatchObject({
      score: 6,
      my_vote: 1,
    })
    expect(client.getQueryData(['notes-feed', 'u1', {}]).pages[0].items[0]).toMatchObject({
      score: 6,
      my_vote: 1,
    })
    expect(client.getQueryData(['note-detail', noteId, 'u1'])).toEqual({
      note: { id: noteId, score: 6 },
      myVote: 1,
    })

    updateNoteVoteInCache(client, noteId, 4, -1)
    expect(client.getQueryData(['home-feed', 'u1']).newestNotes[0]).toMatchObject({
      score: 4,
      my_vote: -1,
    })
    expect(client.getQueryData(['note-detail', noteId, 'u1'])).toEqual({
      note: { id: noteId, score: 4 },
      myVote: -1,
    })
  })
})

describe('OTP Auth Identifier & Error Mapping Helpers', () => {
  it('converts USNs to lowercase @msrit.edu emails and normalizes full emails', () => {
    expect(resolveLoginIdentifier('1MS24IS013', 'msrit.edu')).toEqual({
      email: '1ms24is013@msrit.edu',
      isUsn: true,
      valid: true,
    })
    expect(resolveLoginIdentifier('  faculty@MSRIT.EDU  ', 'msrit.edu')).toEqual({
      email: 'faculty@msrit.edu',
      isUsn: false,
      valid: true,
    })
    expect(resolveLoginIdentifier('   ', 'msrit.edu').valid).toBe(false)
    expect(resolveLoginIdentifier('bad email!', 'msrit.edu').valid).toBe(false)
  })

  it('maps unregistered, expired, invalid, and 429 rate-limit errors cleanly', () => {
    expect(
      mapAuthErrorMessage({ message: 'NOT_REGISTERED: email not in roster' })
    ).toBe(ALLOWED_NOT_REGISTERED_MESSAGE)
    expect(
      mapAuthErrorMessage({ message: 'Database error saving new user' })
    ).toBe(ALLOWED_NOT_REGISTERED_MESSAGE)
    expect(mapAuthErrorMessage({ status: 429, message: 'Too many requests' })).toMatch(
      /60 seconds/i
    )
    expect(mapAuthErrorMessage({ message: 'Token has expired or is invalid' })).toMatch(
      /expired/i
    )
    expect(mapAuthErrorMessage({ message: 'Invalid token' })).toMatch(
      /incorrect verification code/i
    )
  })

  it('recognizes teacher and admin role permissions correctly', () => {
    expect(isTeacherRole('student')).toBe(false)
    expect(isTeacherRole('teacher')).toBe(true)
    expect(isTeacherRole('admin')).toBe(true)
    expect(isAdminRole('student')).toBe(false)
    expect(isAdminRole('teacher')).toBe(false)
    expect(isAdminRole('admin')).toBe(true)
  })

  it('captures UTM parameters cleanly and builds share links with attribution', () => {
    const parsed = captureUtmFromSearch(
      '?subject=OS&utm_source=whatsapp&utm_medium=group&utm_campaign=midsem'
    )
    expect(parsed).toMatchObject({
      utm_source: 'whatsapp',
      utm_medium: 'group',
      utm_campaign: 'midsem',
    })
    expect(captureUtmFromSearch('?subject=OS')).toBeNull()
    expect(buildShareUrlWithUtm('/notes/abc', 'note_detail')).toContain(
      'utm_source=note_detail&utm_medium=share'
    )
  })
})


