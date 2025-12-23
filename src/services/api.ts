import axios from 'axios';

// Main API (Account, etc.)
const BASE_URL = process.env.EXPO_PUBLIC_API || 'https://my-gamezoneapp.jibonhossen-dev.workers.dev';
// Match API (Match Worker)
const MATCH_URL = process.env.EXPO_PUBLIC_MATCH_API || 'https://match-worker.jibonhossen-dev.workers.dev';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

const matchAxios = axios.create({
    baseURL: MATCH_URL,
    headers: { 'Content-Type': 'application/json' },
});

export const matchApi = {
    // Admin Endpoints
    getAllMatches: async () => {
        const response = await matchAxios.get('/match/admin/all');
        return response.data;
    },
    getParticipants: async (matchId: string) => {
        const response = await matchAxios.get(`/match/admin/participants/${matchId}`);
        return response.data;
    },
    distributePrizes: async (data: { matchId: string; winners: { uid: string; amount: number }[] }) => {
        const response = await matchAxios.post('/match/admin/distribute', data);
        return response.data;
    },
    getMatchConfig: async () => {
        // match-worker has /config routes mounted at /config (check index.ts), NOT /match/config?
        // Let's check match-worker/src/index.ts
        // app.route('/config', configRoutes);
        // app.route('/match', matchRoutes);
        // So config is at /config endpoints.
        // BUT original code called /match/admin/config.
        // I should assume I need to call the new config endpoints.
        // Let's look at config.routes.ts
        const response = await matchAxios.get('/config'); // Assuming GET /config returns list
        return response.data;
    },
    addConfig: async (data: { type: 'map' | 'category' | 'match_type'; value: string; label?: string }) => {
        const response = await matchAxios.post('/config/add', data);
        return response.data;
    },
    deleteConfig: async (id: string) => {
        const response = await matchAxios.delete(`/config/${id}`);
        return response.data;
    },
    // Standard Endpoints
    createMatch: async (matchData: any) => {
        const response = await matchAxios.post('/match/create', matchData);
        return response.data;
    },
    updateMatch: async (id: string, updates: any) => {
        const response = await matchAxios.put(`/match/update/${id}`, updates);
        return response.data;
    },
    changeAdminStatus: async (id: string, adminStatus: 'inactive' | 'active' | 'closed') => {
        const response = await matchAxios.put(`/match/admin/status/${id}`, { adminStatus });
        return response.data;
    },
    deleteMatch: async (id: string) => {
        const response = await matchAxios.delete(`/match/admin/delete/${id}`);
        return response.data;
    },
};

// Notification API
const NOTIFICATION_URL = 'https://notification-worker.jibonhossen-dev.workers.dev';

const notificationAxios = axios.create({
    baseURL: NOTIFICATION_URL,
    headers: { 'Content-Type': 'application/json' },
});

export const notificationApi = {
    /**
     * Send push notification to specific users or all users
     */
    sendNotification: async (data: {
        title: string;
        body: string;
        imageUrl?: string;
        data?: Record<string, unknown>;
        targetType: 'all' | 'specific';
        userIds?: string[];
        skipSave?: boolean; // Skip saving to DB (for match notifications)
    }) => {
        const response = await notificationAxios.post('/api/send', data);
        return response.data;
    },
};

export const userApi = {
    getAllUsers: async () => {
        const response = await api.get('/api/admin/users');
        return response.data;
    },
    updateUserStatus: async (userId: string, status: 'active' | 'blocked') => {
        const response = await api.put(`/api/admin/user-status/${userId}`, { status });
        return response.data;
    },
};

export default api;

