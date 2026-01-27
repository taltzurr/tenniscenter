/**
 * Seed Script - Create initial data in Firebase
 *
 * Usage:
 * 1. Download service account key from Firebase Console
 * 2. Save as scripts/serviceAccountKey.json
 * 3. Run: npx ts-node scripts/seed-data.ts
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Initialize Firebase Admin
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');

console.log('Looking for service account at:', serviceAccountPath);

try {
  const serviceAccountContent = readFileSync(serviceAccountPath, 'utf-8');
  const serviceAccount = JSON.parse(serviceAccountContent) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✓ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error);
  console.log('\nPlease download the service account key:');
  console.log('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save the file as: scripts/serviceAccountKey.json');
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

// ============================================
// SEED DATA
// ============================================

const CENTERS = [
  { id: 'center-tel-aviv', name: 'מרכז תל אביב', isActive: true },
  { id: 'center-jerusalem', name: 'מרכז ירושלים', isActive: true },
  { id: 'center-haifa', name: 'מרכז חיפה', isActive: true },
];

const GROUP_TYPES = [
  { id: 'competitive-14-16', name: 'תחרותי 14-16', sortOrder: 1 },
  { id: 'competitive-12-14', name: 'תחרותי 12-14', sortOrder: 2 },
  { id: 'beginners', name: 'מתחילים', sortOrder: 3 },
  { id: 'intermediate', name: 'מתקדמים', sortOrder: 4 },
  { id: 'advanced', name: 'מתקדמים מאוד', sortOrder: 5 },
];

const TEST_USERS = [
  {
    email: 'coach@test.com',
    password: 'Test123!',
    displayName: 'יוסי מאמן',
    role: 'coach',
    centerIds: ['center-tel-aviv'],
  },
  {
    email: 'manager@test.com',
    password: 'Test123!',
    displayName: 'דנה מנהלת',
    role: 'center_manager',
    centerIds: ['center-tel-aviv'],
  },
  {
    email: 'admin@test.com',
    password: 'Test123!',
    displayName: 'אבי מנהל מקצועי',
    role: 'supervisor',
    centerIds: ['center-tel-aviv', 'center-jerusalem', 'center-haifa'],
  },
];

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedCenters() {
  console.log('📍 Creating centers...');

  for (const center of CENTERS) {
    await db.collection('centers').doc(center.id).set({
      name: center.name,
      isActive: center.isActive,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ ${center.name}`);
  }
}

async function seedGroupTypes() {
  console.log('📋 Creating group types...');

  for (const type of GROUP_TYPES) {
    await db.collection('groupTypes').doc(type.id).set({
      name: type.name,
      sortOrder: type.sortOrder,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ ${type.name}`);
  }
}

async function seedUsers() {
  console.log('👤 Creating users...');

  for (const userData of TEST_USERS) {
    try {
      // Check if user already exists
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(userData.email);
        console.log(`   ⚠ User ${userData.email} already exists, updating...`);
      } catch {
        // User doesn't exist, create new
        userRecord = await auth.createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName,
        });
        console.log(`   ✓ Created auth user: ${userData.email}`);
      }

      // Create/update user document in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        centerIds: userData.centerIds,
        isActive: true,
        fcmTokens: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'seed-script',
      });
      console.log(`   ✓ Created Firestore user: ${userData.displayName} (${userData.role})`);

      // If coach, also create coach document
      if (userData.role === 'coach') {
        await db.collection('coaches').doc(userRecord.uid).set({
          userId: userRecord.uid,
          email: userData.email,
          displayName: userData.displayName,
          centerIds: userData.centerIds,
          isActive: true,
          isArchived: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✓ Created coach document`);
      }

    } catch (error) {
      console.error(`   ❌ Error creating user ${userData.email}:`, error);
    }
  }
}

async function seedGroups() {
  console.log('👥 Creating sample groups...');

  // Get the coach user
  const coachSnapshot = await db.collection('coaches').limit(1).get();
  if (coachSnapshot.empty) {
    console.log('   ⚠ No coach found, skipping groups');
    return;
  }

  const coach = coachSnapshot.docs[0];
  const coachId = coach.id;
  const coachData = coach.data();

  const sampleGroups = [
    {
      name: 'קבוצת תחרות בוגרים',
      groupTypeId: 'competitive-14-16',
      birthYearLow: 2010,
      birthYearHigh: 2012,
    },
    {
      name: 'קבוצת מתקדמים א',
      groupTypeId: 'intermediate',
      birthYearLow: 2014,
      birthYearHigh: 2016,
    },
    {
      name: 'קבוצת מתחילים',
      groupTypeId: 'beginners',
      birthYearLow: 2016,
      birthYearHigh: 2018,
    },
  ];

  for (const group of sampleGroups) {
    const groupRef = db.collection('groups').doc();
    await groupRef.set({
      name: group.name,
      centerId: 'center-tel-aviv',
      coachId: coachId,
      groupTypeId: group.groupTypeId,
      birthYearLow: group.birthYearLow,
      birthYearHigh: group.birthYearHigh,
      isActive: true,
      coachHistory: [{
        coachId: coachId,
        coachName: coachData.displayName,
        fromDate: admin.firestore.FieldValue.serverTimestamp(),
      }],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ ${group.name}`);
  }
}

async function seedSettings() {
  console.log('⚙️ Creating global settings...');

  await db.collection('settings').doc('global').set({
    monthlyPlanDeadlineDay: 1,
    allowedEmailDomain: '',  // Empty = allow all for testing
    organizationName: 'מרכזי הטניס והתנועה בישראל',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'seed-script',
  });
  console.log('   ✓ Global settings created');
}

async function seedExercises() {
  console.log('🎾 Creating sample exercises...');

  const exercises = [
    {
      name: 'רצף פורהנד קרוס',
      description: 'תרגיל לשיפור דיוק הפורהנד. השחקן מכה סדרה של 10 כדורים לכיוון קרוס, מתמקד בעקביות ובעומק.',
      skillLevels: ['intermediate', 'advanced'],
      gameStates: ['both_baseline'],
      topics: ['direction', 'stability'],
      duration: 15,
      isGlobal: true,
      isActive: true,
    },
    {
      name: 'סרב ווולי',
      description: 'תרגיל משולב של הגשה ועלייה לרשת. המאמן מחזיר את ההגשה והשחקן עולה לווולי.',
      skillLevels: ['intermediate', 'advanced'],
      gameStates: ['serving', 'approaching'],
      topics: ['match_play', 'agility'],
      duration: 20,
      isGlobal: true,
      isActive: true,
    },
    {
      name: 'משחק נקודות 11',
      description: 'משחק אימון עד 11 נקודות. מתחילים מהגשה, משחק חופשי.',
      skillLevels: ['beginner', 'intermediate', 'advanced'],
      gameStates: ['match_play'],
      topics: ['match_play'],
      duration: 15,
      isGlobal: true,
      isActive: true,
    },
    {
      name: 'תרגיל זריזות - סולם',
      description: 'תרגיל זריזות רגליים עם סולם ריצה. 5 חזרות של כל תבנית.',
      skillLevels: ['beginner', 'intermediate', 'advanced'],
      gameStates: ['both_baseline'],
      topics: ['agility'],
      duration: 10,
      isGlobal: true,
      isActive: true,
    },
  ];

  for (const exercise of exercises) {
    await db.collection('exercises').add({
      ...exercise,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ ${exercise.name}`);
  }
}

async function seedMonthlyValues() {
  console.log('💡 Creating monthly values...');

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const values = [
    { name: 'משמעת', description: 'הגעה בזמן, ציוד מסודר, הקשבה להוראות', priority: 'high', sortOrder: 1 },
    { name: 'הנאה מאימון', description: 'לשמור על גישה חיובית גם כשקשה', priority: 'medium', sortOrder: 2 },
    { name: 'עבודת צוות', description: 'לעזור לחברים, לעודד, להיות חלק מהקבוצה', priority: 'medium', sortOrder: 3 },
  ];

  for (const value of values) {
    await db.collection('values').add({
      ...value,
      month: currentMonth,
      createdBy: 'seed-script',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ ${value.name}`);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n🚀 Starting seed process...\n');

  try {
    await seedCenters();
    await seedGroupTypes();
    await seedSettings();
    await seedUsers();
    await seedGroups();
    await seedExercises();
    await seedMonthlyValues();

    console.log('\n✅ Seed completed successfully!\n');
    console.log('Test accounts created:');
    console.log('  📧 coach@test.com / Test123! (מאמן)');
    console.log('  📧 manager@test.com / Test123! (מנהל מרכז)');
    console.log('  📧 admin@test.com / Test123! (מנהל מקצועי)\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
