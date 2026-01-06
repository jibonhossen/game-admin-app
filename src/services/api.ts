import axios from 'axios';

// Template Types (client-side uses camelCase)
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

// Server template type (snake_case)
interface ServerMatchTemplate {
    id: string;
    name: string;
    created_at: string;
    title: string;
    match_type: 'Solo' | 'Duo' | 'Squad';
    category: string;
    map: string;
    entry_fee: number;
    prize_pool: number;
    per_kill: number;
    total_slots: number;
    prize_details: string;
}

// Convert server template to client format
const toClientTemplate = (t: ServerMatchTemplate): MatchTemplate => ({
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
    title: t.title,
    matchType: t.match_type,
    category: t.category,
    map: t.map,
    entryFee: t.entry_fee,
    prizePool: t.prize_pool,
    perKill: t.per_kill,
    totalSlots: t.total_slots,
    prizeDetails: t.prize_details,
});

// Convert client template to server format
const toServerTemplate = (t: Omit<MatchTemplate, 'id' | 'createdAt'>): Omit<ServerMatchTemplate, 'id' | 'created_at'> => ({
    name: t.name,
    title: t.title,
    match_type: t.matchType,
    category: t.category,
    map: t.map,
    entry_fee: t.entryFee,
    prize_pool: t.prizePool,
    per_kill: t.perKill,
    total_slots: t.totalSlots,
    prize_details: t.prizeDetails,
});

// Prize History Service (EC2) - defined early for templateApi
const HISTORY_URL = process.env.EXPO_PUBLIC_PRIZE_API;
const historyAxios = axios.create({
    baseURL: HISTORY_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Template API (Server-side)
export const templateApi = {
    getAll: async (): Promise<MatchTemplate[]> => {
        try {
            const response = await historyAxios.get('/api/templates');
            return response.data.map(toClientTemplate);
        } catch (error) {
            console.error('Failed to get templates:', error);
            return [];
        }
    },

    create: async (template: Omit<MatchTemplate, 'id' | 'createdAt'>): Promise<MatchTemplate> => {
        const serverTemplate = toServerTemplate(template);
        const response = await historyAxios.post('/api/templates', serverTemplate);
        console.log('Template saved successfully:', template.name);
        return toClientTemplate(response.data);
    },

    update: async (id: string, updates: Partial<MatchTemplate>): Promise<MatchTemplate | null> => {
        try {
            // Convert only the fields that are being updated
            const serverUpdates: any = {};
            if (updates.name !== undefined) serverUpdates.name = updates.name;
            if (updates.title !== undefined) serverUpdates.title = updates.title;
            if (updates.matchType !== undefined) serverUpdates.match_type = updates.matchType;
            if (updates.category !== undefined) serverUpdates.category = updates.category;
            if (updates.map !== undefined) serverUpdates.map = updates.map;
            if (updates.entryFee !== undefined) serverUpdates.entry_fee = updates.entryFee;
            if (updates.prizePool !== undefined) serverUpdates.prize_pool = updates.prizePool;
            if (updates.perKill !== undefined) serverUpdates.per_kill = updates.perKill;
            if (updates.totalSlots !== undefined) serverUpdates.total_slots = updates.totalSlots;
            if (updates.prizeDetails !== undefined) serverUpdates.prize_details = updates.prizeDetails;

            const response = await historyAxios.put(`/api/templates/${id}`, serverUpdates);
            console.log('Template updated successfully:', response.data.name);
            return toClientTemplate(response.data);
        } catch (error) {
            console.error('Failed to update template:', error);
            return null;
        }
    },

    delete: async (id: string): Promise<boolean> => {
        await historyAxios.delete(`/api/templates/${id}`);
        console.log('Template deleted successfully:', id);
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
    refundParticipants: async (data: { matchId: string; refunds: { uid: string; amount: number }[] }) => {
        const response = await matchAxios.post('/match/admin/refund', data);
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


// historyApi uses historyAxios defined above

export const historyApi = {
    getRules: async () => {
        const response = await historyAxios.get('/api/rules');
        return response.data;
    },
    createRule: async (rule: any) => {
        const response = await historyAxios.post('/api/rules', rule);
        return response.data;
    },
    updateRule: async (id: string, rule: any) => {
        const response = await historyAxios.put(`/api/rules/${id}`, rule);
        return response.data;
    },
    deleteRule: async (id: string) => {
        const response = await historyAxios.delete(`/api/rules/${id}`);
        return response.data;
    },
    logMatch: async (log: any) => {
        const response = await historyAxios.post('/api/history', log);
        return response.data;
    },
};

export default api;

