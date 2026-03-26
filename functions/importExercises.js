/**
 * One-time script to import approved exercises from CSV into Firestore.
 * Run from the functions/ directory:
 *   node importExercises.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (uses default project from firebase CLI login)
admin.initializeApp({
  projectId: 'tennis-training-app-gemini'
});

const db = admin.firestore();

// ---- CSV Parser (handles quoted fields with commas) ----
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text) {
  // Split by newlines, handle multi-line quoted fields
  const rows = [];
  let currentLine = '';
  let inQuotes = false;

  for (const line of text.split('\n')) {
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
    }
    currentLine += (currentLine ? '\n' : '') + line;
    if (!inQuotes) {
      rows.push(currentLine);
      currentLine = '';
    }
  }
  if (currentLine) rows.push(currentLine);

  return rows.filter(r => r.trim()).map(r => parseCSVLine(r));
}

// ---- Mapping helpers ----

// Map Hebrew difficulty levels to numeric (1-5)
function mapDifficulty(level) {
  if (!level) return 3; // default to intermediate
  const l = level.trim();
  if (l.includes('מתקדמים מאוד') || l.includes('🔴')) return 5;
  if (l.includes('מתקדמים') || l.includes('🟡')) return 4;
  if (l.includes('מתחילים') || l.includes('🟢')) return 2;
  if (l.includes('כל הרמות')) return 3;
  // Handle combined levels like "🟡 מתקדמים, 🟢 מתחילים"
  if (l.includes('🟡') && l.includes('🟢')) return 3;
  return 3;
}

// Map exercise topic to closest category
function mapCategory(topic, description) {
  if (!topic && !description) return 'strategy';
  const combined = `${topic || ''} ${description || ''}`.toLowerCase();

  if (combined.includes('חימום') || combined.includes('יבש')) return 'warmup';
  if (combined.includes('וולי') || combined.includes('רשת')) return 'volley';
  if (combined.includes('הגשה') || combined.includes('סרב') || combined.includes('מגיש')) return 'serve';
  if (combined.includes('פורהנד') && !combined.includes('בקהנד')) return 'forehand';
  if (combined.includes('בקהנד') && !combined.includes('פורהנד')) return 'backhand';
  if (combined.includes('רגליים') || combined.includes('ריצה') || combined.includes('קפיצ')) return 'footwork';
  if (combined.includes('שחרור') || combined.includes('מתיחות')) return 'cooldown';
  return 'strategy'; // Default for tactical, game drills, etc.
}

// Split comma-separated values and clean them
function splitValues(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

// Clean emoji prefixes from game situations
function cleanTag(tag) {
  return tag.replace(/[🔴🟡🟢👬⬅️↖️↩️🆚🌐]/g, '').trim();
}

// ---- Main import logic ----
async function importExercises() {
  const csvPath = path.join(
    '/Users/taltzur/Downloads/ExportBlock-e7a3729f-b1d1-4547-b0d4-032e9a295874-Part-1',
    'תרגילי טניס - יפו',
    'תרגילים מאושרים.csv'
  );

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvText);

  // First row is header
  // Columns: שם התרגיל / משחק, רמת משחק, מצב משחק, נושא התרגיל, מרכיב משחק, הסבר, סרטון, שם כותב התרגיל
  const [header, ...dataRows] = rows;
  console.log('Header:', header);
  console.log(`Found ${dataRows.length} rows`);

  const exercises = [];
  const skipped = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const [title, level, situation, topic, component, description, videoUrl, author] = row;

    // Skip rows without title or test rows
    if (!title || title.trim() === '') {
      skipped.push({ row: i + 2, reason: 'empty title' });
      continue;
    }
    if (title.includes('בדיקה בדיקה')) {
      skipped.push({ row: i + 2, reason: 'test data', title });
      continue;
    }

    // Build tags from various columns
    const tags = [];

    // Add game situation tags
    if (situation) {
      splitValues(situation).forEach(s => {
        const clean = cleanTag(s);
        if (clean) tags.push(clean);
      });
    }

    // Add topic tags
    if (topic) {
      splitValues(topic).forEach(t => {
        const clean = cleanTag(t);
        if (clean) tags.push(clean);
      });
    }

    // Add component tags
    if (component) {
      splitValues(component).forEach(c => {
        const clean = cleanTag(c);
        if (clean) tags.push(clean);
      });
    }

    // Add level as tag
    if (level) {
      const cleanLevel = cleanTag(level);
      if (cleanLevel) tags.push(cleanLevel);
    }

    const exercise = {
      title: title.trim(),
      description: (description || '').trim(),
      category: mapCategory(topic, description),
      difficulty: mapDifficulty(level),
      duration: 15, // Default 15 minutes
      ageGroups: [], // Not specified in CSV
      equipment: [],
      tags: [...new Set(tags)], // Deduplicate
      videoUrl: videoUrl ? decodeURIComponent(videoUrl).trim() : '',
      createdBy: 'system-import',
      createdByName: author ? author.trim() : 'איגוד הטניס',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    exercises.push(exercise);
  }

  console.log(`\nWill import ${exercises.length} exercises (skipped ${skipped.length}):`);
  skipped.forEach(s => console.log(`  Skipped row ${s.row}: ${s.reason} ${s.title || ''}`));
  console.log('\nExercises to import:');
  exercises.forEach((ex, i) => {
    console.log(`  ${i + 1}. "${ex.title}" [${ex.category}] diff=${ex.difficulty} tags=[${ex.tags.join(', ')}]`);
  });

  // Check for duplicates in Firestore
  console.log('\nChecking for existing exercises...');
  const existingSnapshot = await db.collection('exercises').get();
  const existingTitles = new Set(existingSnapshot.docs.map(d => d.data().title));
  console.log(`Found ${existingTitles.size} existing exercises in Firestore`);

  const toImport = exercises.filter(ex => {
    if (existingTitles.has(ex.title)) {
      console.log(`  SKIP (already exists): "${ex.title}"`);
      return false;
    }
    return true;
  });

  if (toImport.length === 0) {
    console.log('\nAll exercises already exist. Nothing to import.');
    process.exit(0);
  }

  console.log(`\nImporting ${toImport.length} new exercises...`);

  // Batch write (max 500 per batch)
  const batch = db.batch();
  for (const exercise of toImport) {
    const ref = db.collection('exercises').doc();
    batch.set(ref, exercise);
  }

  await batch.commit();
  console.log(`\n✅ Successfully imported ${toImport.length} exercises!`);
  process.exit(0);
}

importExercises().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
