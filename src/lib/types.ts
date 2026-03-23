export interface ServiceRequest {
    id: number;
    request_type: string; // 'housekeeping', 'food', 'maintainence'
    item_name: string; // 'Towels', 'Burger'
    room_number?: string;
    guest_name?: string;
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'critical';
    created_at: string;
    sla_minutes: number;
}
