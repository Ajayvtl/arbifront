"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline'; // Requires Heroicons

export default function SelectHotelPage() {
    const { availableHotels, selectHotel, user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
                        Select Branch
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        You have access to the following properties
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    {availableHotels.map((hotel) => (
                        <button
                            key={hotel.hotel_id}
                            onClick={() => selectHotel(hotel.hotel_id)}
                            className="group relative flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all hover:border-blue-500 hover:bg-gray-750 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                        >
                            <div className="flex items-center space-x-4">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 group-hover:bg-blue-900 group-hover:text-blue-200 text-gray-300">
                                    <BuildingOffice2Icon className="h-6 w-6" />
                                </span>
                                <div className="text-left">
                                    <h3 className="text-lg font-medium text-white group-hover:text-blue-100">
                                        {hotel.hotel_name}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        Role: <span className="text-blue-400">{hotel.role_name}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className="text-gray-500 group-hover:text-white">→</span>
                            </div>
                        </button>
                    ))}

                    {availableHotels.length === 0 && (
                        <div className="rounded-md bg-red-900/50 p-4 text-center">
                            <p className="text-sm text-red-200">No active hotels found for your account.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
