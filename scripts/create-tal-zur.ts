/**
 * Create Tal Zur as Coach in מרכז יפו
 *
 * Usage:
 * 1. Download service account key from Firebase Console:
 *    Firebase Console → Project Settings → Service Accounts → Generate new private key
 * 2. Save the file as: scripts/serviceAccountKey.json
 * 3. Run: npx tsx scripts/create-tal-zur.ts
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccountContent = readFileSync(serviceAccountPath, 'utf-8');
  const serviceAccount = JSON.parse(serviceAccountContent) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✓ Firebase Admin initialized');
} catch {
  console.error('❌ Could not find serviceAccountKey.json');
  console.log('\nSteps to get it:');
  console.log('1. Open Firebase Console → Project Settings → Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save as: scripts/serviceAccountKey.json');
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

const EMAIL = 'talzur07@gmail.com';
const DISPLAY_NAME = 'טל צור';
const CENTER_NAME = 'מרכז יפו';
const CENTER_ID = 'center-yafo';

async function run() {
  console.log('\n🚀 Creating Tal Zur as coach in מרכז יפו...\n');

  // Step 1: Get or create the יפו center
  console.log(`📍 Checking if ${CENTER_NAME} exists...`);
  const centerRef = db.collection('centers').doc(CENTER_ID);
  const centerDoc = await centerRef.get();

  if (!centerDoc.exists) {
    await centerRef.set({
      name: CENTER_NAME,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ Created center: ${CENTER_NAME}`);
  } else {
    console.log(`   ✓ Center already exists: ${CENTER_NAME}`);
  }

  // Step 2: Get user from Firebase Auth
  console.log(`\n👤 Looking up ${EMAIL} in Firebase Auth...`);
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await auth.getUserByEmail(EMAIL);
    console.log(`   ✓ Found user: UID = ${userRecord.uid}`);
  } catch {
    console.error(`   ❌ User ${EMAIL} not found in Firebase Auth`);
    console.log('   Please make sure the user has signed up first.');
    process.exit(1);
  }

  const uid = userRecord.uid;

  // Step 3: Create/update user document in Firestore
  console.log(`\n📄 Creating user document in Firestore...`);
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    console.log('   ⚠ User document already exists, updating...');
    await userRef.set({
      email: EMAIL,
      displayName: DISPLAY_NAME,
      role: 'coach',
      centerIds: [CENTER_ID],
      isActive: true,
      fcmTokens: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } else {
    await userRef.set({
      email: EMAIL,
      displayName: DISPLAY_NAME,
      role: 'coach',
      centerIds: [CENTER_ID],
      isActive: true,
      fcmTokens: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'admin-script',
    });
  }
  console.log(`   ✓ User document created: ${DISPLAY_NAME} (coach)`);

  // Step 4: Create/update coach document in Firestore
  console.log(`\n🎾 Creating coach document in Firestore...`);
  const coachRef = db.collection('coaches').doc(uid);
  const coachDoc = await coachRef.get();

  if (coachDoc.exists) {
    console.log('   ⚠ Coach document already exists, updating...');
    await coachRef.set({
      userId: uid,
      email: EMAIL,
      displayName: DISPLAY_NAME,
      centerIds: [CENTER_ID],
      isActive: true,
      isArchived: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } else {
    await coachRef.set({
      userId: uid,
      email: EMAIL,
      displayName: DISPLAY_NAME,
      centerIds: [CENTER_ID],
      isActive: true,
      isArchived: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log(`   ✓ Coach document created: ${DISPLAY_NAME}`);

  console.log('\n✅ Done! Tal Zur has been set up as a coach in מרכז יפו.');
  console.log(`\n   Email: ${EMAIL}`);
  console.log(`   Name: ${DISPLAY_NAME}`);
  console.log(`   Role: מאמן (coach)`);
  console.log(`   Center: ${CENTER_NAME}\n`);

  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Script failed:', err);
  process.exit(1);
});
