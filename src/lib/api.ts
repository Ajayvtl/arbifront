import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    // 1. Inject Token
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Inject Active Hotel Context (For SaaS Data Isolation)
    let isTenantContext = false;
    const currentHotel = localStorage.getItem('currentHotel');
    if (currentHotel && currentHotel !== 'undefined' && currentHotel !== 'null') {
        try {
            const hotel = JSON.parse(currentHotel);
            if (hotel && hotel.hotel_id) {
                config.headers['x-hotel-id'] = hotel.hotel_id;
                isTenantContext = true;
            }
        } catch (e) {
            console.error('Failed to parse currentHotel for header injection', e);
        }
    }
    
    // Explicitly signal system-scope requests when no active tenant is validly selected.
    if (!isTenantContext) {
        config.headers['x-app-scope'] = 'system';
    }

    return config;
});
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access (e.g., token expired)
            // But be careful not to trigger circular redirects
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default api;
