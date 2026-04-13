import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
    const method = String(config.method || 'get').toLowerCase();
    const resolvedUrl = (() => {
        try {
            return new URL(config.url || '', config.baseURL || undefined);
        } catch {
            return null;
        }
    })();

    const hostname = resolvedUrl?.hostname || '';
    const isLocaLtHost = hostname.endsWith('loca.lt');
    const isTunnelHost =
        isLocaLtHost ||
        hostname.endsWith('ngrok.io') ||
        hostname.endsWith('ngrok-free.app') ||
        hostname.endsWith('trycloudflare.com');

    const isPublicSettingsRequest =
        method === 'get' && String(config.url || '').includes('/settings/public');

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

    // Explicitly signal system-scope requests when no active tenant is selected.
    // Keep GET requests "simple" to avoid unnecessary CORS preflight.
    if (!isTenantContext && method !== 'get') {
        config.headers['x-app-scope'] = 'system';
    }

    // Tunnel reminder-bypass headers can force CORS preflight. Avoid them for
    // simple/public GET endpoints and only add for tunneled non-GET requests.
    if (isLocaLtHost) {
        config.headers['Bypass-Tunnel-Reminder'] = 'true';
    }

    if (isTunnelHost && method !== 'get' && !isPublicSettingsRequest) {
        config.headers['Bypass-Tunnel-Reminder'] = 'true';
        config.headers['ngrok-skip-browser-warning'] = 'true';
    }

    return config;
});
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isBrowser = typeof window !== 'undefined';
            if (isBrowser) {
                const path = window.location.pathname || '';
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('availableHotels');
                localStorage.removeItem('currentHotel');

                if (path.startsWith('/dapp')) {
                    window.location.href = '/dapp/login';
                } else if (path !== '/login' && path !== '/developer/login') {
                    window.location.href = '/developer/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
