import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import 'dotenv/config';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const USERS = [
    {
        email: "admin@tennis.com",
        password: "Admin123!",
        displayName: "אדמין ראשי",
        role: "supervisor",
        extra: { centerIds: [] }
    },
    {
        email: "manager@tennis.com",
        password: "Manager123!",
        displayName: "מנהל מרכז",
        role: "centerManager",
        extra: { managedCenterId: "center-1" }
    }
];

async function upsertFirestoreDoc(uid, { email, displayName, role, extra }) {
    const ref = doc(db, "users", uid);
    const existing = await getDoc(ref);
    if (existing.exists()) {
        console.log(`  ℹ️  Firestore doc כבר קיים (role: ${existing.data().role})`);
        return;
    }
    await setDoc(ref, {
        email,
        displayName,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
        ...extra
    });
    console.log(`  ✅ Firestore נוצר (role: ${role})`);
}

async function createUser({ email, password, displayName, role, extra }) {
    console.log(`\nמעבד משתמש: ${email}...`);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        console.log(`  ✅ Auth נוצר: ${uid}`);
        await upsertFirestoreDoc(uid, { email, displayName, role, extra });
        return true;
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log(`  ℹ️  Auth כבר קיים – מוודא Firestore...`);
            // Sign in to get the uid of the existing user, then upsert the doc
            const cred = await signInWithEmailAndPassword(auth, email, password);
            await upsertFirestoreDoc(cred.user.uid, { email, displayName, role, extra });
            return true;
        }
        console.error(`  ❌ שגיאה: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log("=== יוצר משתמשי מערכת ===");
    for (const user of USERS) {
        await createUser(user);
    }
    console.log("\n=== סיום ===");
    console.log("פרטי התחברות:");
    for (const user of USERS) {
        console.log(`  ${user.role}: ${user.email} / ${user.password}`);
    }
    process.exit(0);
}

main();
