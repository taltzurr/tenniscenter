import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
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

async function createUser({ email, password, displayName, role, extra }) {
    try {
        console.log(`\nיוצר משתמש: ${email}...`);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        console.log(`  ✅ Auth נוצר: ${uid}`);

        await setDoc(doc(db, "users", uid), {
            email,
            displayName,
            role,
            isActive: true,
            createdAt: new Date().toISOString(),
            ...extra
        });
        console.log(`  ✅ Firestore נוצר (role: ${role})`);
        return true;
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log(`  ⚠️  המשתמש כבר קיים: ${email}`);
        } else {
            console.error(`  ❌ שגיאה: ${error.message}`);
        }
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
