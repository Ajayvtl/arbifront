"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Loader2, AlertTriangle, Check, X, Edit2, Save } from "lucide-react";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

interface ImportReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'categories' | 'subcategories' | 'services';
    analysisData: { valid: any[], duplicates: any[], errors: any[], status?: string, message?: string };
    onSuccess: () => void;
}

export default function ImportReviewModal({ isOpen, onClose, type, analysisData, onSuccess }: ImportReviewModalProps) {
    // Combine all items into a single state for editing/approving
    const [scannedItems, setScannedItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [subcategories, setSubcategories] = useState<any[]>([]);

    useEffect(() => {
        if (type === 'subcategories' || type === 'services') {
            api.get('/lab-catalog/categories').then(res => setCategories(res.data.data)).catch(console.error);
        }
        if (type === 'services') {
            api.get('/lab-catalog/subcategories').then(res => setSubcategories(res.data.data)).catch(console.error);
        }
    }, [type]);

    useEffect(() => {
        console.log('[ImportModal] Received analysisData:', analysisData);
        if (analysisData) {
            setScannedItems([
                ...(analysisData.errors || []).map((i: any) => ({ ...i.item, status: 'error', reason: i.reason, selected: false })),
                ...(analysisData.duplicates || []).map((i: any) => ({ ...i.item, status: 'duplicate', reason: i.reason, match: i.match, selected: false })),
                ...(analysisData.valid || []).map((i: any) => ({ ...i, status: 'valid', reason: 'Ready', selected: true }))
            ]);
        }
    }, [analysisData]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    if (!isOpen) return null;

    const toggleSelect = (index: number) => {
        const newItems = [...scannedItems];
        newItems[index].selected = !newItems[index].selected;
        setScannedItems(newItems);
    };

    const handleEdit = (index: number, item: any) => {
        setEditingId(index);
        setEditForm({ ...item });
    };

    const saveEdit = (index: number) => {
        const newItems = [...scannedItems];
        newItems[index] = { ...newItems[index], ...editForm, status: 'valid', reason: 'Manually Corrected', selected: true }; // Assume valid after edit
        setScannedItems(newItems);
        setEditingId(null);
    };

    const handleConfirm = async () => {
        const itemsToImport = scannedItems.filter(i => i.selected).map(i => {
            // Strip UI flags
            const { status, reason, match, selected, _row, ...data } = i;
            return data;
        });

        if (itemsToImport.length === 0) {
            toast.error("No items selected to import");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post('/lab-catalog/confirm-import', {
                type,
                items: itemsToImport
            });
            toast.success(`Successfully imported ${res.data.data.count} items`);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Import failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-100 dark:border-slate-700">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Review Import ({type})</h2>
                        <p className="text-sm text-slate-500">Please review conflicts and errors before confirming.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <Table>
                        <TableHeader>
                            <TableHead className="w-12">
                                <input type="checkbox"
                                    checked={scannedItems.every(i => i.selected)}
                                    onChange={(e) => setScannedItems(scannedItems.map(i => ({ ...i, selected: e.target.checked })))}
                                />
                            </TableHead>
                            <TableHead>Row</TableHead>
                            <TableHead>Name</TableHead>
                            {type === 'services' && <TableHead>Price</TableHead>}
                            {(type === 'subcategories' || type === 'services') && <TableHead>Category</TableHead>}
                            {type === 'services' && <TableHead>Subcategory</TableHead>}
                            <TableHead>Status</TableHead>
                            <TableHead>Issue / Reason</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableHeader>
                        <TableBody>
                            {scannedItems.length === 0 || analysisData.status === 'invalid_format' ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <AlertTriangle size={32} className="text-amber-500" />
                                            <p className="font-medium text-slate-800 dark:text-white">
                                                {analysisData.message || "No valid data found."}
                                            </p>
                                            <p className="text-sm">Please ensure you uploaded a valid <strong>Excel (.xlsx)</strong> or <strong>CSV</strong> file.</p>
                                            <p className="text-xs text-slate-400">Image files (.png, .jpg) are NOT supported.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                scannedItems.map((item, idx) => (
                                    <TableRow key={idx} className={item.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' : item.status === 'duplicate' ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                                        <TableCell>
                                            <input type="checkbox" checked={item.selected} onChange={() => toggleSelect(idx)} disabled={item.status === 'error' && editingId !== idx} />
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{item._row}</TableCell>

                                        {/* Editable Name Field */}
                                        <TableCell>
                                            {editingId === idx ? (
                                                <input
                                                    className="w-full px-2 py-1 rounded border"
                                                    value={editForm[type === 'categories' ? 'category_name' : type === 'subcategories' ? 'subcategory_name' : 'test_name'] || ''}
                                                    onChange={e => setEditForm({ ...editForm, [type === 'categories' ? 'category_name' : type === 'subcategories' ? 'subcategory_name' : 'test_name']: e.target.value })}
                                                />
                                            ) : (
                                                <span className={item.status === 'duplicate' ? 'font-bold' : ''}>
                                                    {type === 'categories' ? item.category_name : type === 'subcategories' ? item.subcategory_name : item.test_name}
                                                    {/* Fallback for when test_name is detected as price */}
                                                    {type === 'services' && !item.test_name && item.price && isNaN(Number(item.price)) ? item.price : ''}
                                                </span>
                                            )}
                                        </TableCell>

                                        {type === 'services' && <TableCell>
                                            {editingId === idx ? (
                                                <input type="number" className="w-20 px-2 py-1 rounded border" value={editForm.price || ''} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
                                            ) : (
                                                item.price
                                            )}
                                        </TableCell>}

                                        {(type === 'subcategories' || type === 'services') && <TableCell>
                                            {editingId === idx ? (
                                                <div className="relative">
                                                    <input
                                                        list={`cat-options-${idx}`}
                                                        className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-900"
                                                        placeholder="Search Category..."
                                                        value={editForm.temp_category_name !== undefined ? editForm.temp_category_name : (categories.find(c => c.category_id == editForm.category_id)?.category_name || '')}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            const match = categories.find(c => c.category_name === val);
                                                            setEditForm({
                                                                ...editForm,
                                                                temp_category_name: val,
                                                                category_id: match ? match.category_id : editForm.category_id,
                                                                subcategory_id: '' // Reset subcategory when category changes
                                                            });
                                                        }}
                                                    />
                                                    <datalist id={`cat-options-${idx}`}>
                                                        {categories.map((c: any) => (
                                                            <option key={c.category_id} value={c.category_name} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">
                                                        {categories.find(c => c.category_id == item.category_id)?.category_name || <span className="text-red-500 italic">Unknown ({item.category_id})</span>}
                                                    </span>
                                                </div>
                                            )}
                                        </TableCell>}

                                        {type === 'services' && <TableCell>
                                            {editingId === idx ? (
                                                <select
                                                    className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-900"
                                                    value={editForm.subcategory_id || ''}
                                                    onChange={e => setEditForm({ ...editForm, subcategory_id: e.target.value })}
                                                >
                                                    <option value="">Select Subcategory</option>
                                                    {subcategories
                                                        .filter(s => s.category_id == editForm.category_id)
                                                        .map(s => (
                                                            <option key={s.subcategory_id} value={s.subcategory_id}>{s.subcategory_name}</option>
                                                        ))}
                                                </select>
                                            ) : (
                                                <span className="font-mono text-xs">
                                                    {subcategories.find(s => s.subcategory_id == item.subcategory_id)?.subcategory_name || (item.subcategory_id ? item.subcategory_id : '-')}
                                                </span>
                                            )}
                                        </TableCell>}
                                        <TableCell>
                                            {item.status === 'duplicate' && <Badge variant="warning">Duplicate</Badge>}
                                            {item.status === 'error' && <Badge variant="danger">Error</Badge>}
                                            {item.status === 'valid' && <Badge variant="success">Valid</Badge>}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 max-w-xs truncate" title={item.reason}>
                                            {item.reason}
                                        </TableCell>
                                        <TableCell>
                                            {editingId === idx ? (
                                                <button onClick={() => saveEdit(idx)} className="text-emerald-600 hover:text-emerald-700"><Save size={18} /></button>
                                            ) : (
                                                <button onClick={() => handleEdit(idx, item)} className="text-slate-400 hover:text-slate-600"><Edit2 size={16} /></button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium">
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting || scannedItems.filter(i => i.selected).length === 0}
                        className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-emerald-500/20"
                    >
                        {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                        Confirm Import ({scannedItems.filter(i => i.selected).length})
                    </button>
                </div>
            </div>
        </div>
    );
}
