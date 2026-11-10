import { describe, it, expect } from 'vitest'
import { formatRelativeDate } from '../lib/formatDate'

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

