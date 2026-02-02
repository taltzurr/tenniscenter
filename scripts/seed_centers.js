
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCIHkBvIHT7gyupq8R-5P5iIQSJ4US8JCE",
    authDomain: "tennis-training-app-gemini.firebaseapp.com",
    projectId: "tennis-training-app-gemini",
    storageBucket: "tennis-training-app-gemini.firebasestorage.app",
    messagingSenderId: "850752571739",
    appId: "1:850752571739:web:433dcbb020afe269acb27e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USER_CENTERS = [
    "אופקים",
    "אשקלון",
    "באר שבע",
    "חיפה",
    "טבריה",
    "יפו",
    "יקנעם",
    "ירושלים",
    "מרכזי הטניס - כללי",
    "נהריה",
    "סאג'ור",
    "עכו",
    "ערד",
    "קריית שמונה",
    "קרית אונו",
    "רמת השרון",
    "תל אביב"
];

async function seed() {
    console.log("Syncing centers...");
    const centersRef = collection(db, "centers");
    const snapshot = await getDocs(centersRef);
    const existingCenters = new Set();
    const batch = writeBatch(db);

    snapshot.forEach(doc => {
        const data = doc.data();
        existingCenters.add(data.name);
    });

    let addedCount = 0;
    for (const name of USER_CENTERS) {
        if (!existingCenters.has(name)) { // Simple check, or "מרכז הטניס " + name?
            // The user gave names like "אופקים". 
            // Previous ones were "מרכז הטניס אופקים".
            // I should probably stick to exactly what user gave, OR prefix them?
            // "This is the list of centers: Ofakim..." 
            // Usually it's "Tennis Center Ofakim".
            // But looking at the list, "מרכזי הטניס - כללי" implies these are the display names.
            // I will use them as is.

            await addDoc(centersRef, {
                name: name,
                address: name, // Default address for now
                active: true,
                createdAt: new Date()
            });
            console.log(`Added ${name}`);
            addedCount++;
        } else {
            console.log(`Exists: ${name}`);
        }
    }

    console.log(`Done. Added ${addedCount} new centers.`);
}

seed();
