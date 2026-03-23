"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
    isDarkMode: boolean;
    toggleTheme: () => void;
    fontSize: number;
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [fontSize, setFontSize] = useState(16); // Base font size in px
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        // Check local storage or system preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        setIsDarkMode(prev => {
            const newMode = !prev;
            if (newMode) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return newMode;
        });
    };

    const increaseFontSize = () => {
        setFontSize(prev => Math.min(prev + 2, 24));
        document.documentElement.style.fontSize = `${Math.min(fontSize + 2, 24)}px`;
    };

    const decreaseFontSize = () => {
        setFontSize(prev => Math.max(prev - 2, 12));
        document.documentElement.style.fontSize = `${Math.max(fontSize - 2, 12)}px`;
    };

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{
            isDarkMode, toggleTheme,
            fontSize, increaseFontSize, decreaseFontSize,
            sidebarCollapsed, toggleSidebar
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
