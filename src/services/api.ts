import axios from 'axios';

// Use environment variable or fallback to localhost
const BASE_URL = process.env.EXPO_PUBLIC_API || 'http://localhost:3020';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const matchApi = {
    // Admin Endpoints
    getAllMatches: async () => {
        const response = await api.get('/match/admin/all');
        return response.data;
    },
    getParticipants: async (matchId: string) => {
        const response = await api.get(`/match/admin/participants/${matchId}`);
        return response.data;
    },
    distributePrizes: async (data: { matchId: string; winners: { uid: string; amount: number }[] }) => {
        const response = await api.post('/match/admin/distribute', data);
        return response.data;
    },
    getMatchConfig: async () => {
        const response = await api.get('/match/admin/config');
        return response.data;
    },
    // Standard Endpoints
    createMatch: async (matchData: any) => {
        const response = await api.post('/match/create', matchData);
        return response.data;
    },
    updateMatch: async (id: string, updates: any) => {
        const response = await api.put(`/match/update/${id}`, updates);
        return response.data;
    },
};

export default api;
