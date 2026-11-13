// ==============================================================================
// NOTES HUB: BULK IMPORT SCRIPT
// ==============================================================================
// Reads notes from local semester folders (READ-ONLY) and imports them into
// Supabase storage and notes table.
//
// Usage:
//   node scripts/import-notes.mjs              # Dry run (default, writes import-plan.json)
//   node scripts/import-notes.mjs --commit     # Executes import after user review
//   node scripts/import-notes.mjs --rollback   # Deletes imported files & rows from manifest
// ==============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load Configurations & Environment
const configPath = path.join(__dirname, 'import-config.json');
const envImportPath = path.join(__dirname, '.env.import');
const manifestPath = path.join(__dirname, '.import-manifest.json');
const planPath = path.join(__dirname, 'import-plan.json');
const convertedDir = path.join(__dirname, 'converted');

if (!fs.existsSync(configPath)) {
  console.error(`[Error] Missing configuration file: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Parse credentials from .env.import
function loadImportEnv() {
  const env = { SUPABASE_URL: '', SUPABASE_SECRET_KEY: '' };
  if (fs.existsSync(envImportPath)) {
    const lines = fs.readFileSync(envImportPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([A-Z_]+)\s*=\s*(.*)$/);
      if (match) {
        env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return env;
}

const env = loadImportEnv();
const args = process.argv.slice(2);
const isCommit = args.includes('--commit');
const isRollback = args.includes('--rollback');
const isCreateMissing = args.includes('--create-missing');
const isDryRun = !isCommit && !isRollback;

// 2. Browser detection for HTML to PDF conversion
function findBrowserExecutable() {
  for (const p of config.browserCandidates || []) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// 3. String Cleaners and Title Casers
function cleanTitle(rawName, isLab = false) {
  let name = path.parse(rawName).name;

  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]+/g, ' ');

  // Remove common noisy prefixes / suffixes
  name = name.replace(/\b4th\s*Sem\b/gi, '');
  name = name.replace(/\bNotes\s*Book\b/gi, 'Notes');
  name = name.replace(/\bLab\s*Book\b/gi, 'Lab Guide');
  name = name.replace(/\s+/g, ' ').trim();

  // Convert to Title Case
  name = name
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (['and', 'or', 'the', 'in', 'on', 'at', 'to', 'for', 'of'].includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  // Ensure first character is uppercase
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  if (isLab && !name.toLowerCase().startsWith('lab')) {
    name = `Lab - ${name}`;
  }

  return name || rawName;
}

function sanitizeStorageFileName(rawName) {
  return rawName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 60);
}

function getFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// 4. Discover eligible files across configured source directories
const SUPPORTED_EXTS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
const HTML_EXTS = new Set(['.html']);
const MAX_FILE_SIZE = (config.maxFileSizeMB || 10) * 1024 * 1024;

function collectSourceFiles() {
  const subjectGroups = {}; // subject -> array of candidates
  const skippedFiles = [];

  for (const src of config.sourceDirs) {
    if (!fs.existsSync(src.path)) {
      console.warn(`[Warning] Source directory not found: ${src.path}`);
      continue;
    }

    const rootEntries = fs.readdirSync(src.path, { withFileTypes: true });

    for (const entry of rootEntries) {
      if (config.ignoredFolderNames.includes(entry.name)) continue;

      const fullEntryPath = path.join(src.path, entry.name);

      if (entry.isDirectory()) {
        const mappedSubject = config.folderSubjectMap[entry.name];
        if (!mappedSubject) {
          skippedFiles.push({ path: fullEntryPath, reason: `Unmapped folder: ${entry.name}` });
          continue;
        }

        const isLab = (config.labFolders || []).includes(entry.name);

        function walk(subDir) {
          const items = fs.readdirSync(subDir, { withFileTypes: true });
          for (const item of items) {
            const itemPath = path.join(subDir, item.name);
            if (item.isDirectory()) {
              if (config.ignoredFolderNames.includes(item.name)) continue;
              walk(itemPath);
            } else {
              if (item.name === '.gitignore') continue;
              const stats = fs.statSync(itemPath);
              const ext = path.extname(item.name).toLowerCase();

              if (stats.size > MAX_FILE_SIZE) {
                skippedFiles.push({
                  path: itemPath,
                  name: item.name,
                  size: stats.size,
                  reason: `Exceeds 10 MB limit (${(stats.size / (1024*1024)).toFixed(2)} MB)`
                });
                continue;
              }

              let action = null;
              if (SUPPORTED_EXTS.has(ext)) action = 'upload';
              else if (HTML_EXTS.has(ext)) action = 'convert';
              else {
                skippedFiles.push({
                  path: itemPath,
                  name: item.name,
                  size: stats.size,
                  reason: `Unsupported file type: ${ext}`
                });
                continue;
              }

              if (!subjectGroups[mappedSubject]) subjectGroups[mappedSubject] = [];
              subjectGroups[mappedSubject].push({
                sourcePath: itemPath,
                fileName: item.name,
                ext,
                size: stats.size,
                action,
                isLab,
                subject: mappedSubject,
                semester: src.semNumber,
                cleanedTitle: cleanTitle(item.name, isLab),
                uploaderEmail: config.subjectUploaderMap[mappedSubject]
              });
            }
          }
        }

        walk(fullEntryPath);
      } else {
        // Root files: check if they clearly match a subject book HTML
        const ext = path.extname(entry.name).toLowerCase();
        let matchedSubject = null;
        let isLab = false;

        const lowerName = entry.name.toLowerCase();
        if (lowerName.includes('daa') && lowerName.includes('lab')) { matchedSubject = 'Design and Analysis of Algorithms'; isLab = true; }
        else if (lowerName.includes('daa')) { matchedSubject = 'Design and Analysis of Algorithms'; }
        else if (lowerName.includes('dbms') && lowerName.includes('lab')) { matchedSubject = 'Database Management Systems'; isLab = true; }
        else if (lowerName.includes('dbms')) { matchedSubject = 'Database Management Systems'; }
        else if (lowerName.includes('java') && lowerName.includes('lab')) { matchedSubject = 'Java Programming'; isLab = true; }
        else if (lowerName.includes('java')) { matchedSubject = 'Java Programming'; }
        else if (lowerName.includes('mathematics') || lowerName.includes('maths')) { matchedSubject = 'Mathematics'; }
        else if (lowerName.includes('microcontroller')) { matchedSubject = 'Microcontroller'; }
        else if (lowerName.includes('r_programming')) { matchedSubject = 'R Programming'; }

        if (matchedSubject && (SUPPORTED_EXTS.has(ext) || HTML_EXTS.has(ext))) {
          const stats = fs.statSync(fullEntryPath);
          if (!subjectGroups[matchedSubject]) subjectGroups[matchedSubject] = [];
          subjectGroups[matchedSubject].push({
            sourcePath: fullEntryPath,
            fileName: entry.name,
            ext,
            size: stats.size,
            action: HTML_EXTS.has(ext) ? 'convert' : 'upload',
            isLab,
            subject: matchedSubject,
            semester: src.semNumber,
            cleanedTitle: cleanTitle(entry.name, isLab),
            uploaderEmail: config.subjectUploaderMap[matchedSubject]
          });
        } else {
          skippedFiles.push({ path: fullEntryPath, name: entry.name, reason: 'Root non-subject / admin file' });
        }
      }
    }
  }

  // Cap at maxFilesPerSubject (e.g. 3-4 files per subject as requested)
  const maxPerSubject = config.maxFilesPerSubject || 4;
  const planItems = [];
  const cappedSkips = [];

  for (const [_subject, files] of Object.entries(subjectGroups)) {
    // Sort prioritized: PDFs first, then HTML, then larger/comprehensive notes
    files.sort((a, b) => {
      if (a.ext === '.pdf' && b.ext !== '.pdf') return -1;
      if (b.ext === '.pdf' && a.ext !== '.pdf') return 1;
      return b.size - a.size;
    });

    const selected = files.slice(0, maxPerSubject);
    const remainder = files.slice(maxPerSubject);

    planItems.push(...selected);
    remainder.forEach(f => cappedSkips.push({ path: f.sourcePath, reason: `Capped by maxFilesPerSubject (${maxPerSubject})` }));
  }

  return { planItems, skippedFiles: [...skippedFiles, ...cappedSkips] };
}

// 5. HTML to PDF converter using Puppeteer Core with Brave/Chrome
let puppeteerModule = null;
let browserInstance = null;

async function getBrowser() {
  if (browserInstance) return browserInstance;
  const browserPath = findBrowserExecutable();
  if (!browserPath) {
    throw new Error('Chrome or Brave executable not found. Please install Chrome or Brave.');
  }

  if (!puppeteerModule) {
    puppeteerModule = await import('puppeteer-core');
  }

  browserInstance = await puppeteerModule.default.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  return browserInstance;
}

async function convertHtmlToPdf(htmlFilePath) {
  if (!fs.existsSync(convertedDir)) {
    fs.mkdirSync(convertedDir, { recursive: true });
  }

  const hash = getFileHash(htmlFilePath);
  const outPdfPath = path.join(convertedDir, `${hash}.pdf`);

  if (fs.existsSync(outPdfPath)) {
    return outPdfPath; // Return cached conversion
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const fileUrl = `file://${path.resolve(htmlFilePath).replace(/\\/g, '/')}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000)); // Font loading guard

    await page.pdf({
      path: outPdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
    });

    return outPdfPath;
  } finally {
    await page.close();
  }
}

// 6. Rollback execution
async function executeRollback() {
  console.log('\n--- EXECUTING ROLLBACK ---');
  if (!fs.existsSync(manifestPath)) {
    console.log('No manifest file found at scripts/.import-manifest.json. Nothing to rollback.');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = Object.values(manifest);

  if (entries.length === 0) {
    console.log('Manifest is empty. Nothing to rollback.');
    return;
  }

  if (!env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY.includes('your-supabase')) {
    console.error('[Error] Please set a valid SUPABASE_SECRET_KEY in scripts/.env.import to rollback.');
    process.exit(1);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  console.log(`Found ${entries.length} items in manifest to delete...`);

  let deletedCount = 0;
  for (const item of entries) {
    try {
      if (item.noteId) {
        await supabase.from('notes').delete().eq('id', item.noteId);
      }
      if (item.storagePath) {
        await supabase.storage.from('notes-files').remove([item.storagePath]);
      }
      deletedCount++;
      console.log(`[Deleted] Note ${item.noteId || ''} (${item.cleanedTitle})`);
    } catch (err) {
      console.error(`[Rollback Error] Failed to delete ${item.cleanedTitle}:`, err.message);
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify({}, null, 2));
  console.log(`\n✓ Rollback complete. Successfully removed ${deletedCount} records.`);
}

// 7. Main Execution: Plan / Dry-Run / Commit
async function main() {
  if (isRollback) {
    await executeRollback();
    return;
  }

  console.log('================================================================');
  console.log(' NOTES HUB: BULK IMPORT PLANNER & ENGINE');
  console.log('================================================================');
  console.log(`Mode: ${isCommit ? '🚀 COMMIT (Live Database Insert)' : '🔍 DRY-RUN (Validation & Planning)'}`);

  const { planItems, skippedFiles } = collectSourceFiles();

  // Deduplicate planItems by source hash
  const seenHashes = new Set();
  const dedupedPlan = [];
  for (const item of planItems) {
    const hash = getFileHash(item.sourcePath);
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      item.hash = hash;
      dedupedPlan.push(item);
    }
  }

  // Calculate total payload size
  let totalPayloadBytes = 0;
  for (const item of dedupedPlan) {
    totalPayloadBytes += item.size;
  }
  const totalPayloadMB = (totalPayloadBytes / (1024 * 1024)).toFixed(2);

  // Safety Stop Threshold Check
  const maxLimitMB = config.maxTotalPayloadMB || 700;
  if (parseFloat(totalPayloadMB) > maxLimitMB) {
    console.error(`\n[SAFETY ABORT] Total upload payload (${totalPayloadMB} MB) exceeds safety threshold of ${maxLimitMB} MB!`);
    process.exit(1);
  }

  // Save Plan to JSON
  fs.writeFileSync(
    planPath,
    JSON.stringify(
      {
        totalFiles: dedupedPlan.length,
        totalPayloadMB,
        generatedAt: new Date().toISOString(),
        plan: dedupedPlan,
        skippedCount: skippedFiles.length,
      },
      null,
      2
    )
  );

  // Print Summary Table
  console.log(`\nPlanned Notes for Import (${dedupedPlan.length} files, ${totalPayloadMB} MB):`);
  console.log('--------------------------------------------------------------------------------------------------------------------');
  console.log(
    '#'.padEnd(4) +
    'Sem'.padEnd(5) +
    'Subject'.padEnd(34) +
    'Action'.padEnd(10) +
    'Size'.padEnd(10) +
    'Uploader'.padEnd(24) +
    'Cleaned Title'
  );
  console.log('--------------------------------------------------------------------------------------------------------------------');

  dedupedPlan.forEach((item, idx) => {
    const sizeStr = `${(item.size / (1024 * 1024)).toFixed(2)} MB`;
    console.log(
      `${(idx + 1).toString().padEnd(4)}` +
      `S${item.semester.toString().padEnd(4)}` +
      `${item.subject.slice(0, 32).padEnd(34)}` +
      `${item.action.padEnd(10)}` +
      `${sizeStr.padEnd(10)}` +
      `${item.uploaderEmail.split('@')[0].padEnd(24)}` +
      `${item.cleanedTitle.slice(0, 40)}`
    );
  });

  console.log('--------------------------------------------------------------------------------------------------------------------');
  console.log(`\nSUMMARY:`);
  console.log(`• Direct File Uploads (PDF/Image): ${dedupedPlan.filter(i => i.action === 'upload').length}`);
  console.log(`• HTML to PDF Conversions:        ${dedupedPlan.filter(i => i.action === 'convert').length}`);
  console.log(`• Total Items to Import:          ${dedupedPlan.length}`);
  console.log(`• Total Upload Size:              ${totalPayloadMB} MB (Free plan limit: 1000 MB)`);
  console.log(`• Total Skipped Files:            ${skippedFiles.length} (Size > 10MB or unsupported format)`);
  console.log(`• Detailed Plan written to:       scripts/import-plan.json`);

  if (isDryRun) {
    console.log('\n================================================================');
    console.log(' ✓ DRY RUN COMPLETE — ZERO DATABASE OR STORAGE MUTATIONS OCCURRED');
    console.log('================================================================');
    console.log('Review the plan above. To execute live upload and database inserts:');
    console.log('  1. Ensure SUPABASE_SECRET_KEY is configured in scripts/.env.import');
    console.log('  2. Run: node scripts/import-notes.mjs --commit');
    console.log('================================================================\n');
    return;
  }

  // --- COMMIT MODE EXECUTION ---
  if (!env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY.includes('your-supabase')) {
    console.error('\n[Error] SUPABASE_SECRET_KEY is not set in scripts/.env.import.');
    console.error('Please add your Supabase service_role secret key to scripts/.env.import before running --commit.');
    process.exit(1);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

  // Verify and fetch uploader profiles
  console.log('\nVerifying uploader accounts in Supabase profiles...');
  const uploaderEmails = [...new Set(dedupedPlan.map(i => i.uploaderEmail))];
  const uploaderProfiles = {};

  for (const email of uploaderEmails) {
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', email)
      .maybeSingle();

    if (pErr) throw pErr;

    if (!profile) {
      if (isCreateMissing) {
        console.log(`Profile for ${email} missing. Creating user via Admin API...`);
        const { data: authUser, error: aErr } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: email.split('@')[0], role: 'student' }
        });
        if (aErr) throw aErr;
        uploaderProfiles[email] = authUser.user.id;
      } else {
        console.error(`[Error] Uploader profile for ${email} does not exist in public.profiles.`);
        console.error(`Please ask that user to register/login once, or pass --create-missing to auto-provision.`);
        process.exit(1);
      }
    } else {
      uploaderProfiles[email] = profile.id;
      console.log(`  ✓ Found profile: ${email} (${profile.id})`);
    }
  }

  // Load existing manifest for idempotency
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      manifest = {};
    }
  }

  console.log('\nStarting Live Import (Bucket: "notes-files", Table: "notes")...');
  let uploadedCount = 0;
  let skippedManifestCount = 0;
  let failedCount = 0;

  for (let idx = 0; idx < dedupedPlan.length; idx++) {
    const item = dedupedPlan[idx];
    const prefix = `[${idx + 1}/${dedupedPlan.length}]`;

    // Check manifest for idempotency
    if (manifest[item.hash]) {
      console.log(`${prefix} [Skipped - Already in Manifest] ${item.cleanedTitle}`);
      skippedManifestCount++;
      continue;
    }

    let filePathToUpload = item.sourcePath;
    let safeName = sanitizeStorageFileName(item.fileName);

    // Convert HTML to PDF if needed
    if (item.action === 'convert') {
      try {
        console.log(`${prefix} [Converting HTML -> PDF] ${item.fileName}...`);
        filePathToUpload = await convertHtmlToPdf(item.sourcePath);
        safeName = sanitizeStorageFileName(`${path.parse(item.fileName).name}.pdf`);
      } catch (cErr) {
        console.error(`${prefix} [Conversion Failed] ${item.fileName}:`, cErr.message);
        failedCount++;
        continue;
      }
    }

    const uploaderId = uploaderProfiles[item.uploaderEmail];
    const timestamp = Date.now();
    const storagePath = `${uploaderId}/${timestamp}-${safeName}`;

    // Read binary file
    const fileBuffer = fs.readFileSync(filePathToUpload);
    const contentType = item.ext === '.png' ? 'image/png' : item.ext === '.jpg' || item.ext === '.jpeg' ? 'image/jpeg' : 'application/pdf';

    // Retry upload logic (up to 3 attempts)
    let uploadSuccess = false;
    let insertedNote = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('notes-files')
          .upload(storagePath, fileBuffer, {
            contentType,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // 2. Generate public URL
        const { data: publicUrlData } = supabase.storage
          .from('notes-files')
          .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        // 3. Insert row into notes table
        const { data: noteRow, error: insertError } = await supabase
          .from('notes')
          .insert({
            title: item.cleanedTitle,
            subject: item.subject,
            semester: String(item.semester),
            description: `${item.subject} study notes for Semester ${item.semester}.`,
            file_url: publicUrl,
            uploaded_by: uploaderId,
            score: 0,
            verified: false,
          })
          .select()
          .single();

        if (insertError) {
          // Clean up orphan file if DB insert fails
          await supabase.storage.from('notes-files').remove([storagePath]);
          throw insertError;
        }

        insertedNote = noteRow;
        uploadSuccess = true;
        break;
      } catch (retryErr) {
        console.warn(`  Attempt ${attempt} failed for ${item.cleanedTitle}: ${retryErr.message}`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }
    }

    if (uploadSuccess && insertedNote) {
      manifest[item.hash] = {
        sourcePath: item.sourcePath,
        storagePath,
        noteId: insertedNote.id,
        cleanedTitle: item.cleanedTitle,
        subject: item.subject,
        semester: item.semester,
        uploader: item.uploaderEmail,
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      uploadedCount++;
      console.log(`${prefix} ✓ [Imported] ${item.cleanedTitle} (ID: ${insertedNote.id})`);
    } else {
      failedCount++;
      console.error(`${prefix} ✗ [Failed After 3 Attempts] ${item.cleanedTitle}`);
    }
  }

  if (browserInstance) {
    await browserInstance.close();
  }

  console.log('\n================================================================');
  console.log(' IMPORT EXECUTION COMPLETE');
  console.log('================================================================');
  console.log(`• Successfully Uploaded & Inserted: ${uploadedCount}`);
  console.log(`• Skipped (Already in Manifest):   ${skippedManifestCount}`);
  console.log(`• Failed:                          ${failedCount}`);
  console.log(`• Manifest Recorded in:            scripts/.import-manifest.json`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
