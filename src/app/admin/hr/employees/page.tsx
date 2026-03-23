"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { UserIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Added icons

export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingEmp, setEditingEmp] = useState<any>(null); // For Edit Modal

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/hr/employees');
            setEmployees(data.data);
        } catch (error) {
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = (id: number, name: string) => {
        // Direct link to download
        // We use window.open or fetch blob. Best to use direct URL for simple download.
        const token = localStorage.getItem('token');
        // Using fetch to handle auth header, then blob
        api.get(`/hr/export/${id}`, { responseType: 'blob' })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Employee_${name.replace(/ /g, '_')}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            })
            .catch(() => toast.error('Download failed'));
    };

    const handleExportAll = () => {
        const token = localStorage.getItem('token');
        api.get(`/hr/export/all`, { responseType: 'blob' })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `All_Staff.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            })
            .catch(() => toast.error('Export failed'));
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        try {
            const formData = new FormData(e.target);
            const payload = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                role_id: Number(formData.get('role_id')),
                is_active: formData.get('is_active') === '1' ? 1 : 0
            };

            await api.put(`/hr/employees/${editingEmp.id}`, payload);
            toast.success('Employee updated');
            setEditingEmp(null);
            fetchEmployees();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const filtered = employees.filter((e: any) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                    <UserIcon className="w-8 h-8 text-blue-500" /> Staff Directory
                </h1>
                <div className="flex gap-4">
                    <button
                        onClick={handleExportAll}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" /> Export All
                    </button>
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            className="pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No staff found.</td></tr>
                        ) : (
                            filtered.map((emp: any) => (
                                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</div>
                                                <div className="text-xs text-gray-500">ID: {emp.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-gray-300">{emp.email}</div>
                                        <div className="text-sm text-gray-500">{emp.phone || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {emp.role_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {emp.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2 justify-end">
                                        <button
                                            onClick={() => setEditingEmp(emp)}
                                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                            title="Edit Details"
                                        >
                                            <PencilSquareIcon className="w-4 h-4" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleExport(emp.id, emp.name)}
                                            className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1 ml-auto"
                                            title="Export Profile"
                                        >
                                            <ArrowDownTrayIcon className="w-4 h-4" /> Export
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold dark:text-white">Edit Employee</h3>
                            <button onClick={() => setEditingEmp(null)}><XMarkIcon className="w-6 h-6 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Name</label>
                                <input name="name" defaultValue={editingEmp.name} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Phone</label>
                                <input name="phone" defaultValue={editingEmp.phone} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Role ID (Temp)</label>
                                <input name="role_id" type="number" defaultValue={editingEmp.role_id} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
                                <select name="is_active" defaultValue={editingEmp.is_active ? '1' : '0'} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white">
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setEditingEmp(null)} className="px-4 py-2 text-gray-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
