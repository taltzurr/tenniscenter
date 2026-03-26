/**
 * One-time script to re-categorize exercises based on the CSV "מצב משחק" column.
 * New categories: serving, returning, two_behind, approaching, passing, practice_games
 * Run: GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/talzur07_gmail_com_application_default_credentials.json node recategorizeExercises.js
 */

const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'tennis-training-app-gemini'
});

const db = admin.firestore();

// Mapping: exercise title → new category based on CSV "מצב משחק" data
const CATEGORY_MAP = {
  // 👬 שניים מאחור exercises
  'חזרה למרכז אפשרויות על יבש': 'two_behind', // has both variants, first is שניים מאחור
  'תרגיל דיוק': 'two_behind',
  'טניס עם ידיים': 'two_behind',
  '1 מוסר 1 חובט': 'two_behind',
  'מסירה חבטה - תפנית': 'two_behind',
  'מסירה חבטה - קפיצות': 'two_behind',
  'מוסר חובט - ספליט': 'two_behind',
  'התקפה הגנה': 'two_behind',
  'ראלי אינטנסיבי': 'two_behind',
  'תרגיל מחייב': 'two_behind',
  'תרגיל עומקים': 'two_behind',
  '2 אלכסון 1 ישר': 'two_behind',
  'שניים אלכסון, אחד ישר': 'two_behind',

  // ⬅️ שחקן מתקרב exercises
  'משחק עליה לרשת': 'approaching',
  'כניסה לוולי עם כדור קצר': 'approaching',

  // ↖️ שחקן מעביר exercises
  'שמירת כדור': 'passing', // The one with שחקן מעביר tag

  // 🆚 משחקי אימון exercises
  'נקודות בהובלה / פיגור': 'practice_games',
  'משחק זריזות': 'practice_games',
  'משחק 7': 'practice_games',
  'הגנה התקפה - זוגות': 'practice_games',
  'משחק העומקים': 'practice_games',

  // Default for exercises without clear מצב משחק
  'שמירת כדור עומקים': 'practice_games',
  'קפיצות בחבל': 'practice_games',
};

async function recategorize() {
  const snapshot = await db.collection('exercises').get();
  console.log(`Found ${snapshot.size} exercises`);

  const batch = db.batch();
  let updateCount = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const title = data.title;
    const newCategory = CATEGORY_MAP[title];

    if (newCategory) {
      console.log(`  ✓ "${title}": ${data.category} → ${newCategory}`);
      batch.update(doc.ref, {
        category: newCategory,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      updateCount++;
    } else {
      // For exercises not in map, check tags to determine category
      const tags = data.tags || [];
      let guessedCategory = 'practice_games'; // default

      if (tags.includes('שניים מאחור')) guessedCategory = 'two_behind';
      else if (tags.includes('שחקן מתקרב')) guessedCategory = 'approaching';
      else if (tags.includes('שחקן מעביר')) guessedCategory = 'passing';
      else if (tags.includes('שחקן מחזיר')) guessedCategory = 'returning';
      else if (tags.includes('משחקי אימון')) guessedCategory = 'practice_games';

      if (data.category !== guessedCategory) {
        console.log(`  ~ "${title}": ${data.category} → ${guessedCategory} (guessed from tags)`);
        batch.update(doc.ref, {
          category: guessedCategory,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
      } else {
        console.log(`  - "${title}": already ${data.category}`);
      }
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`\n✅ Updated ${updateCount} exercises`);
  } else {
    console.log('\nNo updates needed.');
  }

  process.exit(0);
}

recategorize().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
