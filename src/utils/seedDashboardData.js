import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ROLES, PLAN_STATUS } from '../config/constants';

// Demo Coaches Data
const DEMO_COACHES = [
    {
        displayName: 'דני רופ',
        email: 'danny@demo.com',
        role: ROLES.COACH,
        active: true,
        phone: '050-1111111',
        createdAt: Timestamp.now()
    },
    {
        displayName: 'מיכל אנסקי',
        email: 'michal@demo.com',
        role: ROLES.COACH,
        active: true,
        phone: '050-2222222',
        createdAt: Timestamp.now()
    },
    {
        displayName: 'אסי עזר',
        email: 'assi@demo.com',
        role: ROLES.COACH,
        active: true,
        phone: '050-3333333',
        createdAt: Timestamp.now()
    },
    {
        displayName: 'רותם סלע',
        email: 'rotem@demo.com',
        role: ROLES.COACH,
        active: true,
        phone: '050-4444444',
        createdAt: Timestamp.now()
    }
];

// Helper to create a fake plan
const createPlan = async (groupId, groupName, coachId, status, year, month) => {
    // Only create if status is not 'missing'
    if (status === 'missing') return;

    const planData = {
        groupId,
        groupName,
        coachId,
        year,
        month,
        monthlyGoals: `מטרות לחודש ${month + 1} לקבוצת ${groupName}`,
        status: status,
        weeks: {
            week1: { theme: 'פורהנד', subTopics: [] },
            week2: { theme: 'בקהנד', subTopics: [] },
            week3: { theme: 'סרב', subTopics: [] },
            week4: { theme: 'משחק רשת', subTopics: [] }
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    await addDoc(collection(db, 'monthlyPlans'), planData);
};

export const seedManagerDashboardData = async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    try {
        for (const coachData of DEMO_COACHES) {
            // 1. Create Coach
            const userRef = await addDoc(collection(db, 'users'), coachData);
            const coachId = userRef.id;

            // 2. Create 3 Groups for this coach
            const groupTypes = ['תחרותי', 'עתודה', 'מתחילים'];

            for (let i = 0; i < 3; i++) {
                const groupName = `${groupTypes[i]} - ${coachData.displayName.split(' ')[0]}`;
                const groupRef = await addDoc(collection(db, 'groups'), {
                    name: groupName,
                    coachId: coachId,
                    type: groupTypes[i],
                    active: true,
                    createdAt: Timestamp.now()
                });
                const groupId = groupRef.id;

                // 3. Create Plan with pseudo-random status
                // Coach 1: All Approved (Complete)
                // Coach 2: Mixed (Partial)
                // Coach 3: None (Empty)
                // Coach 4: All Submitted

                let status = 'missing';
                if (coachData.displayName.includes('דני')) { // Complete Approved
                    status = PLAN_STATUS.APPROVED;
                } else if (coachData.displayName.includes('מיכל')) { // Partial
                    if (i === 0) status = PLAN_STATUS.APPROVED;
                    if (i === 1) status = PLAN_STATUS.SUBMITTED;
                    if (i === 2) status = 'missing';
                } else if (coachData.displayName.includes('אסי')) { // Empty
                    status = 'missing';
                } else if (coachData.displayName.includes('רותם')) { // All Submitted
                    status = PLAN_STATUS.SUBMITTED;
                }

                await createPlan(groupId, groupName, coachId, status, currentYear, currentMonth);
            }
        }
        return true;
    } catch (error) {
        console.error('Error seeding data:', error);
        return false;
    }
};
