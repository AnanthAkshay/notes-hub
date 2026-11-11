import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const INPUT_CSV_PATH = path.join(ROOT_DIR, 'data', 'students.csv')
const OUTPUT_SQL_PATH = path.join(ROOT_DIR, 'supabase', 'roster.sql')
const USN_PATTERN = /^1MS\d{2}IS\d{3}$/

function resolveAllowedDomain() {
  const fromEnv = process.env.VITE_ALLOWED_EMAIL_DOMAIN?.trim()
  if (fromEnv) return fromEnv.toLowerCase()

  const envExamplePath = path.join(ROOT_DIR, '.env.example')
  if (fs.existsSync(envExamplePath)) {
    const content = fs.readFileSync(envExamplePath, 'utf8')
    const match = content.match(/^VITE_ALLOWED_EMAIL_DOMAIN\s*=\s*(.+)$/m)
    if (match?.[1]) return match[1].trim().toLowerCase()
  }

  return 'msrit.edu'
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

function escapeSqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function main() {
  if (!fs.existsSync(INPUT_CSV_PATH)) {
    throw new Error(`Missing roster CSV at ${INPUT_CSV_PATH}`)
  }

  const allowedDomain = resolveAllowedDomain()
  const raw = fs.readFileSync(INPUT_CSV_PATH, 'utf8').replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '')

  if (lines.length < 2) {
    throw new Error('data/students.csv must contain a header row and at least one student row.')
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const usnIdx = headers.indexOf('usn')
  const nameIdx = headers.indexOf('name')

  if (usnIdx === -1 || nameIdx === -1) {
    throw new Error('CSV header must include both "usn" and "name" columns.')
  }

  const seenUsns = new Set()
  const rows = []

  for (let lineNum = 1; lineNum < lines.length; lineNum += 1) {
    const cells = parseCsvLine(lines[lineNum])
    // Read ONLY usn and name; never read, store, or log any private column
    const usn = (cells[usnIdx] || '').trim().toUpperCase()
    const name = (cells[nameIdx] || '').trim().replace(/\s+/g, ' ')

    if (!USN_PATTERN.test(usn)) {
      throw new Error(`Invalid USN format at CSV row ${lineNum + 1}: "${usn}"`)
    }

    if (!name) {
      throw new Error(`Blank student name at CSV row ${lineNum + 1} for USN ${usn}`)
    }

    if (seenUsns.has(usn)) {
      throw new Error(`Duplicate USN detected at CSV row ${lineNum + 1}: ${usn}`)
    }
    seenUsns.add(usn)

    const email = `${usn.toLowerCase()}@${allowedDomain}`
    rows.push({ usn, name, email })
  }

  const valuesSql = rows
    .map(
      (r) =>
        `  (${escapeSqlLiteral(r.usn)}, ${escapeSqlLiteral(r.name)}, ${escapeSqlLiteral(r.email)})`
    )
    .join(',\n')

  const sql = [
    '-- ==============================================================================',
    '-- GENERATED FILE — DO NOT COMMIT (gitignored via supabase/roster*.sql)',
    `-- Imported ${rows.length} student rows (usn, name, email only).`,
    '-- Safe to run before or after supabase/phase9_auth.sql.',
    '-- ==============================================================================',
    '',
    'create table if not exists public.student_roster (',
    '  usn text primary key check (usn = upper(usn)),',
    '  name text not null,',
    '  email text unique not null check (email = lower(email))',
    ');',
    '',
    'alter table public.student_roster enable row level security;',
    'revoke all on table public.student_roster from public, anon, authenticated;',
    '',
    'insert into public.student_roster (usn, name, email)',
    'values',
    `${valuesSql}`,
    'on conflict (usn) do update',
    'set name = excluded.name,',
    '    email = excluded.email;',
    '',
  ].join('\n')

  fs.mkdirSync(path.dirname(OUTPUT_SQL_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_SQL_PATH, sql, 'utf8')

  console.log(`Generated supabase/roster.sql with ${rows.length} students (@${allowedDomain}).`)
}

main()
