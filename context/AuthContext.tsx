"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { User } from "@/types";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isSupervisor: boolean;
    isManager: boolean;
    isCoach: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isSupervisor: false,
    isManager: false,
    isCoach: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Fetch additional user data from Firestore (role, centerId, etc.)
                    const userDocRef = doc(db, "users", firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data() as User;
                        setUser({ ...userData, uid: firebaseUser.uid, email: firebaseUser.email! });
                    } else {
                        // Fallback if user document doesn't exist yet (should be handled in registration)
                        console.warn("User document not found in Firestore");
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email!,
                            displayName: firebaseUser.displayName || "",
                            role: "coach", // Default safe fallback
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const isSupervisor = user?.role === "supervisor";
    const isManager = user?.role === "manager";
    const isCoach = user?.role === "coach";

    return (
        <AuthContext.Provider value={{ user, loading, isSupervisor, isManager, isCoach }}>
            {children}
        </AuthContext.Provider>
    );
};
