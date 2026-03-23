"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Loader2, MapPin, Trash2, Search, Save, Edit2, Upload, Download, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import * as XLSX from 'xlsx';

export default function LocationsPage() {
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('states');
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        state_id: '',
        city_id: '',
        pincode: '',
        status: 'active'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'states') {
                const response = await api.get('/locations/states');
                setStates(response.data.data);
            } else if (activeTab === 'cities') {
                const [citiesRes, statesRes] = await Promise.all([
                    api.get('/locations/cities'),
                    api.get('/locations/states')
                ]);
                setCities(citiesRes.data.data);
                setStates(statesRes.data.data);
            } else if (activeTab === 'areas') {
                const [areasRes, citiesRes] = await Promise.all([
                    api.get('/locations/areas'),
                    api.get('/locations/cities')
                ]);
                setAreas(areasRes.data.data);
                setCities(citiesRes.data.data);
            }
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const endpoint = `/locations/${activeTab}`;
            if (editingItem) {
                await api.put(`${endpoint}/${editingItem.id}`, formData);
                toast.success("Updated successfully");
            } else {
                await api.post(endpoint, formData);
                toast.success("Created successfully");
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(`Are you sure you want to delete this item?`)) return;
        try {
            await api.delete(`/locations/${activeTab}/${id}`);
            toast.success("Deleted successfully");
            fetchData();
        } catch (error: any) {
            toast.error("Failed to delete");
        }
    };

    const openEdit = (item: any) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            code: item.code || '',
            state_id: item.state_id || '',
            city_id: item.city_id || '',
            pincode: item.pincode || '',
            status: item.status
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingItem(null);
        setFormData({ name: '', code: '', state_id: '', city_id: '', pincode: '', status: 'active' });
    };

    // --- Import Logic ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error("No data found in file");
                    return;
                }

                // Send to backend
                await api.post('/locations/import', { type: activeTab, data });
                toast.success("Import successful");
                setShowImportModal(false);
                fetchData();
            } catch (error) {
                console.error(error);
                toast.error("Failed to process file");
            }
        };
        reader.readAsBinaryString(file);
    };

    const downloadSample = () => {
        let data: any[] = [];
        if (activeTab === 'states') data = [{ name: 'California', code: 'CA', status: 'active' }];
        else if (activeTab === 'cities') data = [{ name: 'Los Angeles', state_name: 'California', code: 'LA', status: 'active' }];
        else if (activeTab === 'areas') data = [{ name: 'Downtown', city_name: 'Los Angeles', pincode: '90001', status: 'active' }];

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sample");
        XLSX.writeFile(wb, `${activeTab}_sample.xlsx`);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Locations</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage states, cities, and areas</p>
                </div>
                <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    {['states', 'cities', 'areas'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <Upload size={18} />
                            Import
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            <Plus size={18} />
                            Add {activeTab.slice(0, -1)}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            {activeTab === 'states' && <TableHead>Code</TableHead>}
                            {activeTab === 'cities' && <TableHead>State</TableHead>}
                            {activeTab === 'cities' && <TableHead>Code</TableHead>}
                            {activeTab === 'areas' && <TableHead>City</TableHead>}
                            {activeTab === 'areas' && <TableHead>Pincode</TableHead>}
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableHeader>
                        <TableBody>
                            {(activeTab === 'states' ? states : activeTab === 'cities' ? cities : areas).map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="text-slate-500 dark:text-slate-400">{item.id}</TableCell>
                                    <TableCell className="font-medium text-slate-800 dark:text-white">{item.name}</TableCell>
                                    {activeTab === 'states' && <TableCell className="text-slate-600 dark:text-slate-400">{item.code}</TableCell>}
                                    {activeTab === 'cities' && <TableCell className="text-slate-600 dark:text-slate-400">{item.state_name}</TableCell>}
                                    {activeTab === 'cities' && <TableCell className="text-slate-600 dark:text-slate-400">{item.code}</TableCell>}
                                    {activeTab === 'areas' && <TableCell className="text-slate-600 dark:text-slate-400">{item.city_name}</TableCell>}
                                    {activeTab === 'areas' && <TableCell className="text-slate-600 dark:text-slate-400">{item.pincode}</TableCell>}
                                    <TableCell>
                                        <Badge variant={item.status === 'active' ? 'success' : 'neutral'}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(activeTab === 'states' ? states : activeTab === 'cities' ? cities : areas).length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">No data found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 capitalize">{editingItem ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* City Form: State Selection First */}
                            {activeTab === 'cities' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                        value={formData.state_id}
                                        onChange={e => setFormData({ ...formData, state_id: e.target.value })}
                                    >
                                        <option value="">Select State</option>
                                        {states.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Area Form: City Selection First */}
                            {activeTab === 'areas' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                        value={formData.city_id}
                                        onChange={e => setFormData({ ...formData, city_id: e.target.value })}
                                    >
                                        <option value="">Select City</option>
                                        {cities.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {(activeTab === 'states' || activeTab === 'cities') && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        placeholder={activeTab === 'states' ? 'e.g. CA' : 'e.g. LA'}
                                    />
                                </div>
                            )}

                            {activeTab === 'areas' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                        value={formData.pincode}
                                        onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex justify-center items-center gap-2"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <FileSpreadsheet className="text-emerald-600" />
                                Import {activeTab}
                            </h2>
                            <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                                <Trash2 size={18} className="rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-2 text-sm">Step 1: Download Sample</h3>
                                <p className="text-xs text-slate-500 mb-3">Download the sample Excel file to see the required format.</p>
                                <button
                                    onClick={downloadSample}
                                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                                >
                                    <Download size={14} /> Download Sample
                                </button>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-2 text-sm">Step 2: Upload File</h3>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
