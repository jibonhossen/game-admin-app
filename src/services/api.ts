import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Template Types
export interface MatchTemplate {
    id: string;
    name: string;
    createdAt: string;
    title: string;
    matchType: 'Solo' | 'Duo' | 'Squad';
    category: string;
    map: string;
    entryFee: number;
    prizePool: number;
    perKill: number;
    totalSlots: number;
    prizeDetails: string;
}

const TEMPLATES_STORAGE_KEY = '@match_templates';

// Template API (Local Storage)
export const templateApi = {
    getAll: async (): Promise<MatchTemplate[]> => {
        try {
            const data = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get templates:', error);
            return [];
        }
    },

    create: async (template: Omit<MatchTemplate, 'id' | 'createdAt'>): Promise<MatchTemplate> => {
        const templates = await templateApi.getAll();
        const newTemplate: MatchTemplate = {
            ...template,
            id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
        };
        templates.push(newTemplate);
        await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
        return newTemplate;
    },

    update: async (id: string, updates: Partial<MatchTemplate>): Promise<MatchTemplate | null> => {
        const templates = await templateApi.getAll();
        const index = templates.findIndex(t => t.id === id);
        if (index === -1) return null;

        templates[index] = { ...templates[index], ...updates };
        await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
        return templates[index];
    },

    delete: async (id: string): Promise<boolean> => {
        const templates = await templateApi.getAll();
        const filtered = templates.filter(t => t.id !== id);
        await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
        return true;
    },
};

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
    changeMatchStatus: async (id: string, status: 'Open' | 'Full' | 'Closed' | 'Completed') => {
        if (status === 'Completed') {
            const response = await matchAxios.put(`/match/admin/complete/${id}`);
            return response.data;
        }
        const response = await matchAxios.put(`/match/status/${id}`, { status });
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
    /**
     * Check which users have registered tokens
     */
    checkPushTokens: async (userIds: string[]) => {
        const response = await notificationAxios.post('/api/check-tokens', { userIds });
        return response.data;
    },
};

// Auth API
export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export const authApi = {
    login: async (credentials: any) => {
        const response = await api.post('/api/auth/admin/login', credentials);
        return response.data;
    },
    getMe: async () => {
        const response = await api.get('/api/auth/admin/me');
        return response.data;
    },
    createSubAdmin: async (data: any) => {
        const response = await api.post('/api/auth/admin/create-subadmin', data);
        return response.data;
    },
    getSubAdmins: async () => {
        const response = await api.get('/api/auth/admin/subadmins');
        return response.data;
    },
    updateSubAdmin: async (id: string, data: { name?: string; allowedCategories?: string[] }) => {
        const response = await api.put(`/api/auth/admin/subadmin/${id}`, data);
        return response.data;
    },
    deleteSubAdmin: async (id: string) => {
        const response = await api.delete(`/api/auth/admin/subadmin/${id}`);
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

// Prize History Service (EC2)
const HISTORY_URL = process.env.EXPO_PUBLIC_PRIZE_API || 'http://localhost:3001'; // Fallback to local
const historyAxios = axios.create({
    baseURL: HISTORY_URL,
    headers: { 'Content-Type': 'application/json' },
});

export const historyApi = {
    getRules: async () => {
        const response = await historyAxios.get('/api/rules');
        return response.data;
    },
    createRule: async (rule: any) => {
        const response = await historyAxios.post('/api/rules', rule);
        return response.data;
    },
    logMatch: async (log: any) => {
        const response = await historyAxios.post('/api/history', log);
        return response.data;
    },
};

export default api;

