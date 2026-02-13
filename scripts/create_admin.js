
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import 'dotenv/config'; // Load .env file

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

const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

async function createAdmin() {
    try {
        console.log(`Creating user ${EMAIL}...`);
        const userCredential = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
        const user = userCredential.user;
        console.log(`User created in Auth: ${user.uid}`);

        console.log("Creating Admin profile in Firestore...");
        await setDoc(doc(db, "users", user.uid), {
            email: EMAIL,
            displayName: "Tal Tzur",
            role: "supervisor", // This makes them a Super Admin
            isActive: true,
            createdAt: new Date().toISOString(),
            centerIds: [] // Supervisors have access to all
        });

        console.log("✅ Super Admin created successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error creating admin:", error.message);
        process.exit(1);
    }
}

createAdmin();
