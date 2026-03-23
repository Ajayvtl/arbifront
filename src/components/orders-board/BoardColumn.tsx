import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { OrderCard } from './OrderCard';

interface BoardColumnProps {
    id: string;
    title: string;
    orders: any[];
    color?: string;
}

export const BoardColumn = ({ id, title, orders, color = 'bg-slate-100' }: BoardColumnProps) => {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div className="flex flex-col min-w-[280px] w-[280px] h-full shrink-0">
            <div className={`flex items-center justify-between p-3 rounded-t-xl border-t-4 ${color} bg-white dark:bg-slate-800 border-b border-b-slate-100 dark:border-b-slate-700 shadow-sm mb-3`}>
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">
                    {title}
                </h3>
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    {orders.length}
                </span>
            </div>

            <div ref={setNodeRef} className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-2 min-h-[500px]">
                <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {orders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                    ))}
                </SortableContext>
                {orders.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs italic p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        Drop items here
                    </div>
                )}
            </div>
        </div>
    );
};
