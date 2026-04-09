"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export interface User {
    id: number;
    name: string;
    email: string;
    role_id: number;
    role?: string;
    company_id?: number | null;
    role_name?: string;
    avatar?: string;
    phone?: string;
    is_active?: boolean;
    permissions?: string[];
    walletAddress?: string;
    wallet_address?: string;
    referral_code?: string;
    wallet_usdt_bnb?: string;
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

interface EthereumEventProvider {
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwtPayload(token: string): { exp?: number } | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const json = atob(padded);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSec;
}

function parseStoredJson<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

function readInitialSession() {
    if (typeof window === 'undefined') {
        return {
            token: null as string | null,
            user: null as User | null,
            hotels: [] as Hotel[],
            currentHotel: null as Hotel | null,
        };
    }

    const token = localStorage.getItem('token');
    if (!token || isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('availableHotels');
        localStorage.removeItem('currentHotel');
        return {
            token: null as string | null,
            user: null as User | null,
            hotels: [] as Hotel[],
            currentHotel: null as Hotel | null,
        };
    }

    return {
        token,
        user: parseStoredJson<User | null>(localStorage.getItem('user'), null),
        hotels: parseStoredJson<Hotel[]>(localStorage.getItem('availableHotels'), []),
        currentHotel: parseStoredJson<Hotel | null>(localStorage.getItem('currentHotel'), null),
    };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session] = useState(() => readInitialSession());
    const [user, setUser] = useState<User | null>(session.user);
    const [token, setToken] = useState<string | null>(session.token);
    const [availableHotels, setAvailableHotels] = useState<Hotel[]>(session.hotels);
    const [currentHotel, setCurrentHotel] = useState<Hotel | null>(session.currentHotel);
    const [isLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (typeof window === 'undefined' || !user || user.role !== 'USER') return;

        const handleAccountsChanged = (...args: unknown[]) => {
            const accounts = (args[0] as string[]) || [];
            if (accounts.length === 0) {
                logout();
            } else {
                const connectedAddress = accounts[0].toLowerCase();
                const userAddress = (user.walletAddress || user.wallet_address || '').toLowerCase();
                if (userAddress && connectedAddress !== userAddress) {
                    logout();
                    toast.error("Wallet account changed. Please log in again.");
                }
            }
        };

        const handleDisconnect = () => {
            logout();
            toast.error("Wallet disconnected.");
        };

        const eth = (window as Window & { ethereum?: EthereumEventProvider }).ethereum;
        if (eth?.on) {
            eth.on('accountsChanged', handleAccountsChanged);
            eth.on('disconnect', handleDisconnect);
        }

        return () => {
            if (eth?.removeListener) {
                eth.removeListener('accountsChanged', handleAccountsChanged);
                eth.removeListener('disconnect', handleDisconnect);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const login = (newToken: string, newUser: User, hotels: Hotel[], permissions: string[] = []) => {
        setToken(newToken);
        // Merge permissions into user object for easy access
        const userWithPermissions = { ...newUser, permissions };
        setUser(userWithPermissions);
        setAvailableHotels(hotels);

        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userWithPermissions));
        localStorage.setItem('availableHotels', JSON.stringify(hotels));

        if (newUser.role === 'USER') {
            setCurrentHotel(null);
            localStorage.removeItem('currentHotel');
            const pendingRedirect = typeof window !== 'undefined' ? sessionStorage.getItem('postLoginRedirect') : null;
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('postLoginRedirect');
            }
            const targetRoute = pendingRedirect && pendingRedirect.startsWith('/dapp/')
                ? pendingRedirect
                : '/dapp/dashboard';
            router.push(targetRoute);
            toast.success(`Welcome ${newUser.name || 'User'}`);
            return;
        }

        // Logic: Redirect based on Hotel Availability
        if (newUser.role_id === 1 || newUser.role === 'SUPER_ADMIN') { // Super Admin
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
        const isEndUser = user?.role === 'USER';
        setToken(null);
        setUser(null);
        setAvailableHotels([]);
        setCurrentHotel(null);

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('availableHotels');
        localStorage.removeItem('currentHotel');

        toast.success('Logged out successfully');
        router.push(isEndUser ? '/dapp/login' : '/login');
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
