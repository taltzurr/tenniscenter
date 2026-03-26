const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'tennis-training-app-gemini' });
const db = admin.firestore();

// Map old tag text to new topic values
const TAG_TO_TOPIC = {
    'מרכז אפשרויות': 'center_options',
    'משחק אימון': 'practice_game',
    'כיוון': 'direction',
    'יציבות': 'stability',
    'עומק': 'depth',
    'גובה': 'height',
    'חימום פיזי': 'physical_warmup',
    'זריזות': 'agility',
    'עוצמה': 'power',
    'סיבוביות': 'spins',
    'רגש בכדור': 'ball_feel',
    'מיומנות משחק': 'game_skill',
};

// Map old tag text to game component values
const TAG_TO_COMPONENT = {
    'טכני': 'technical',
    'פיזי': 'physical',
    'טקטי': 'tactical',
    'מנטלי': 'mental',
    'הכרתי': 'cognitive',
};

// Also map some common Hebrew tag variants
const EXTRA_TOPIC_MAP = {
    'שניים מאחור': 'center_options',
    'מתקדמים': null, // not a topic
};

async function migrate() {
    const snapshot = await db.collection('exercises').get();
    console.log(`Found ${snapshot.size} exercises\n`);

    let updated = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const oldTags = data.tags || [];

        if (oldTags.length === 0 && !data.topics) {
            console.log(`  SKIP "${data.title}" - no tags`);
            continue;
        }

        // Already migrated?
        if (data.topics && data.topics.length > 0) {
            console.log(`  SKIP "${data.title}" - already has topics`);
            continue;
        }

        const topics = new Set();
        const gameComponents = new Set();
        const unmapped = [];

        for (const tag of oldTags) {
            const trimmed = tag.trim();
            if (TAG_TO_TOPIC[trimmed]) {
                topics.add(TAG_TO_TOPIC[trimmed]);
            } else if (TAG_TO_COMPONENT[trimmed]) {
                gameComponents.add(TAG_TO_COMPONENT[trimmed]);
            } else if (EXTRA_TOPIC_MAP[trimmed] !== undefined) {
                if (EXTRA_TOPIC_MAP[trimmed]) topics.add(EXTRA_TOPIC_MAP[trimmed]);
            } else {
                unmapped.push(trimmed);
            }
        }

        const updateData = {
            topics: [...topics],
            gameComponents: [...gameComponents],
        };

        console.log(`  UPDATE "${data.title}"`);
        console.log(`    tags: [${oldTags.join(', ')}]`);
        console.log(`    → topics: [${updateData.topics.join(', ')}]`);
        console.log(`    → gameComponents: [${updateData.gameComponents.join(', ')}]`);
        if (unmapped.length > 0) {
            console.log(`    ⚠ unmapped: [${unmapped.join(', ')}]`);
        }

        await doc.ref.update(updateData);
        updated++;
    }

    console.log(`\nDone! Updated: ${updated}`);
}

migrate().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
