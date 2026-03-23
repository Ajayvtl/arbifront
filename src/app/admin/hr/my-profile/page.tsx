"use client";

import { useAuth } from '@/context/AuthContext';
import { UserCircleIcon } from '@heroicons/react/24/solid';

export default function MyProfilePage() {
    const { user, currentHotel } = useAuth();
    const organizationName = currentHotel?.hotel_name || 'Main Company (System)';
    const roleLabel = user?.role_name || currentHotel?.role_name || 'Staff';

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 dark:text-white">My Profile</h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-emerald-600 h-32 w-full"></div>
                <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <div className="bg-white dark:bg-slate-800 p-1 rounded-full">
                            <UserCircleIcon className="w-24 h-24 text-gray-300 bg-white rounded-full" />
                        </div>
                        <div className="mb-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                                {roleLabel}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{user?.name}</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">{user?.email}</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                                    <p className="text-gray-900 dark:text-white">{user?.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Employee ID</label>
                                    <p className="text-gray-900 dark:text-white">EMP-{user?.id?.toString().padStart(4, '0')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 pb-2">Organization</h3>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Department</label>
                                <p className="text-gray-900 dark:text-white">General</p>
                                {/* Todo: Fetch real dept if available */}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Hotel / Branch</label>
                                <p className="text-gray-900 dark:text-white">{organizationName}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Joined Date</label>
                                <p className="text-gray-900 dark:text-white">{new Date().toLocaleDateString()}</p>
                                {/* Todo: Fetch real joined date */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
