export type UserRole = 'supervisor' | 'manager' | 'coach';

export interface User {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    centerId?: string; // For managers and coaches
    photoURL?: string;
}

export interface Center {
    id: string;
    name: string;
    logoUrl?: string;
    active: boolean;
}

export interface Group {
    id: string;
    name: string;
    centerId: string;
    coachId: string;
    ageCategory: 'competitive_14_16' | 'competitive_12_14' | 'beginners' | 'advanced' | 'pro';
    birthYearMin: number;
    birthYearMax: number;
}

export interface Player {
    id: string;
    name: string;
    groupId: string;
    // potentially other fields like ranking, etc.
}

export type PeriodType = 'general_prep' | 'specific_prep' | 'competition' | 'transition' | 'reinforcement' | 'testing';
export type GameState = 'serving' | 'returning' | 'baseline_both' | 'approaching' | 'passing' | 'simulation';
export type GameComponent = 'technical' | 'tactical';

export interface Drill {
    id: string;
    name: string;
    description: string;
    level: ('beginner' | 'advanced' | 'pro')[];
    gameState: GameState[];
    topics: string[];
    videoUrl?: string;
    durationMinutes: number;
    authorId: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
}

export interface TrainingSession {
    id: string;
    date: Date; // Timestamp in Firestore
    groupId: string;
    coachId: string;
    periodType: PeriodType;
    gameState: GameState;
    gameComponent: GameComponent;
    topics: string[];
    details: string;
    drills: {
        drillId: string; // Reference to Drill
        customDrill?: { // Or a custom ad-hoc drill
            name: string;
            description: string;
        };
        durationMinutes: number;
        notes?: string;
    }[];
}

export interface Goal {
    id: string;
    description: string;
    targetMonth: string; // YYYY-MM
    isAchieved: boolean;
    assignedTo: string; // Group ID or Player ID
    type: 'group' | 'player' | 'center';
}

export interface Value {
    id: string;
    name: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
}
