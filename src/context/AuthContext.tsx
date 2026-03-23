"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export interface User {
    id: number;
    name: string;
    email: string;
    role_id: number;
    role_name?: string;
    avatar?: string;
    phone?: string;
    is_active?: boolean;
    permissions?: string[];
}

export interface Hotel {
    hotel_id: number;
    hotel_name: string;
    subdomain: string;
    role_id: number;
    role_name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    availableHotels: Hotel[];
    currentHotel: Hotel | null;
    selectHotel: (hotelId: number) => void;
    login: (token: string, user: User, hotels: Hotel[], permissions?: string[]) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [availableHotels, setAvailableHotels] = useState<Hotel[]>([]);
    const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Hydrate from Storage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedHotels = localStorage.getItem('availableHotels');
        const storedCurrentHotel = localStorage.getItem('currentHotel');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            if (storedHotels) setAvailableHotels(JSON.parse(storedHotels));
            if (storedCurrentHotel) setCurrentHotel(JSON.parse(storedCurrentHotel));
        }
        setIsLoading(false);
    }, []);

    const login = (newToken: string, newUser: User, hotels: Hotel[], permissions: string[] = []) => {
        setToken(newToken);
        // Merge permissions into user object for easy access
        const userWithPermissions = { ...newUser, permissions };
        setUser(userWithPermissions);
        setAvailableHotels(hotels);

        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userWithPermissions));
        localStorage.setItem('availableHotels', JSON.stringify(hotels));

        // Logic: Redirect based on Hotel Availability
        if (newUser.role_id === 1) { // Super Admin
            setCurrentHotel(null);
            localStorage.removeItem('currentHotel');
            router.push('/admin/dashboard');
            toast.success('Welcome Super Admin!');
        } else if (hotels.length === 0) {
            // System Staff (Sales, Support, etc.) - No Hotel Assigned
            setCurrentHotel(null);
            localStorage.removeItem('currentHotel');
            router.push('/admin/dashboard');
            toast.success(`Welcome ${newUser.name}`);
        } else if (hotels.length === 1) {
            // Auto Select Single Hotel (Fix: Use local variable to avoid race condition)
            const hotel = hotels[0];
            setCurrentHotel(hotel);
            localStorage.setItem('currentHotel', JSON.stringify(hotel));
            router.push('/');
            toast.success(`Welcome to ${hotel.hotel_name}`);
        } else if (hotels.length > 1) {
            // Multiple Hotels -> Select Screen
            router.push('/select-hotel');
        }
    };

    const selectHotel = (hotelId: number) => {
        console.log("Attempting to select hotel:", hotelId, "from", availableHotels);
        const hotel = availableHotels.find(h => h.hotel_id === hotelId);
        if (hotel) {
            setCurrentHotel(hotel);
            localStorage.setItem('currentHotel', JSON.stringify(hotel));
            router.push('/'); // Go to Main Dashboard
        } else {
            console.error("Hotel not found in availability list");
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setAvailableHotels([]);
        setCurrentHotel(null);

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('availableHotels');
        localStorage.removeItem('currentHotel');

        toast.success('Logged out successfully');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, availableHotels, currentHotel, selectHotel, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
