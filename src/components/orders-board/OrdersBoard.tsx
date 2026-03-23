import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BoardColumn } from './BoardColumn';
import { OrderCard } from './OrderCard';

interface OrdersBoardProps {
    orders: any[];
    onStatusChange: (orderId: number, newStatus: string) => void;
}

const COLUMNS = [
    { id: 'placed', title: 'Order Placed', color: 'border-blue-500' },
    { id: 'assigned', title: 'Phlebo Assigned', color: 'border-indigo-500' },
    { id: 'out_for_collection', title: 'Out For Collection', color: 'border-yellow-500' },
    { id: 'collected', title: 'Sample Collected', color: 'border-orange-500' },
    { id: 'processing', title: 'Lab Processing', color: 'border-purple-500' },
    { id: 'report_ready', title: 'Report Ready', color: 'border-emerald-500' },
    { id: 'completed', title: 'Completed', color: 'border-green-600' },
];

export default function OrdersBoard({ orders, onStatusChange }: OrdersBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const getOrdersByStatus = (status: string) => {
        return orders.filter(order => {
            if (order.status === 'confirmed' && status === 'placed') return true;
            if (order.status === 'lab_received' && status === 'processing') return true;
            return order.status === status;
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(String(active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeIdStr = String(active.id); // Ensure string for robust comparison
        const overIdStr = String(over.id);

        const isOverColumn = COLUMNS.some(col => col.id === overIdStr);

        let newStatus = '';

        if (isOverColumn) {
            newStatus = overIdStr;
        } else {
            // Dropped on another card -> find that card to get its status
            const overOrder = orders.find(o => String(o.id) === overIdStr);
            if (overOrder) {
                newStatus = overOrder.status;
                if (newStatus === 'confirmed') newStatus = 'placed';
                if (newStatus === 'lab_received') newStatus = 'processing';
            }
        }

        const activeOrder = orders.find(o => String(o.id) === activeIdStr);

        if (activeOrder && newStatus && activeOrder.status !== newStatus) {
            onStatusChange(activeOrder.id, newStatus);
        }

        setActiveId(null);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
                {COLUMNS.map((col) => (
                    <BoardColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        orders={getOrdersByStatus(col.id)}
                        color={col.color}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeId ? (
                    <div className="transform rotate-3 cursor-grabbing opacity-90">
                        <OrderCard order={orders.find(o => String(o.id) === activeId)} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
