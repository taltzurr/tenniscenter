const admin = require('firebase-admin');

// Initialize with project
admin.initializeApp({ projectId: 'tennis-training-app-gemini' });
const db = admin.firestore();

// Mapping from old numeric values to new string values
const DIFFICULTY_MAP = {
    1: 'beginners',
    2: 'beginners',
    3: 'all_levels',
    4: 'advanced',
    5: 'very_advanced',
};

async function migrateDifficulty() {
    const snapshot = await db.collection('exercises').get();
    console.log(`Found ${snapshot.size} exercises`);

    let updated = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const currentDiff = data.difficulty;

        // Skip if already a string value
        if (typeof currentDiff === 'string') {
            console.log(`  SKIP "${data.title}" - already string: "${currentDiff}"`);
            skipped++;
            continue;
        }

        const newValue = DIFFICULTY_MAP[currentDiff];
        if (!newValue) {
            console.log(`  WARN "${data.title}" - unknown difficulty: ${currentDiff}, defaulting to all_levels`);
            await doc.ref.update({ difficulty: 'all_levels' });
            updated++;
            continue;
        }

        console.log(`  UPDATE "${data.title}": ${currentDiff} → "${newValue}"`);
        await doc.ref.update({ difficulty: newValue });
        updated++;
    }

    console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
}

migrateDifficulty().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
