
import { db } from './src/services/firebase.js'; // Adjust path if needed, usually running from root
import { collection, addDoc } from 'firebase/firestore';

async function seedExercise() {
    try {
        const docRef = await addDoc(collection(db, 'exercises'), {
            name: 'פורהנד קרוס (דוגמה)',
            category: 'Technique',
            difficulty: 'Intermediate',
            description: 'תרגיל בסיס לשיפור דיוק בחבטת כף יד.',
            defaultDuration: '10'
        });
        console.log('Document written with ID: ', docRef.id);
    } catch (e) {
        console.error('Error adding document: ', e);
    }
    process.exit(0);
}

seedExercise();
