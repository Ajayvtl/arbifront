import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/Badge';
import { Calendar, User, DollarSign } from 'lucide-react';

interface OrderCardProps {
    order: any;
}

export const OrderCard = ({ order }: OrderCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: order.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing mb-3 group ${isDragging ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
        >
            <div className="flex justify-between items-start mb-3">
                <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
                    {order.order_number}
                </span>
                <span className="text-xs font-medium text-slate-500">
                    {new Date(order.created_at).toLocaleDateString()}
                </span>
            </div>

            <div className="mb-3">
                <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <User size={14} className="text-slate-400" />
                    {order.user_name || order.patient_name || 'Guest'}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={12} />
                    {order.collection_slot ? new Date(order.collection_slot).toLocaleString() : 'No Slot'}
                </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <DollarSign size={14} className="text-emerald-500" />
                    {order.total_amount}
                </span>
            </div>
        </div>
    );
};
