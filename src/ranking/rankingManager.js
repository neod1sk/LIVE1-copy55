
import { supabase } from './supabaseClient.js';

const TABLE_NAME = 'rankings';
const LOCAL_STORAGE_KEY = 'my_ranking_ids_v2'; // Changed key to avoid conflict with old format

export const rankingManager = {
    async getRankings(limit = 20) {
        // Explicitly select columns to be safe, though RLS should enforce it too
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, nickname, x_id, score')
            .order('score', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching rankings:', error);
            return [];
        }
        return data;
    },

    async submitScore(nickname, xId, score) {
        // Clean xId
        let cleanedXId = xId ? xId.trim() : null;
        if (cleanedXId && cleanedXId.startsWith('@')) {
            cleanedXId = cleanedXId.substring(1);
        }
        if (cleanedXId === '') cleanedXId = null;

        // Generate a secret key for deletion
        const secretKey = this._generateSecret();

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([
                { nickname, x_id: cleanedXId, score, secret_key: secretKey }
            ])
            .select('id, nickname, x_id, score'); // Do not select secret_key back

        if (error) {
            console.error('Error submitting score:', error);
            throw error;
        }

        if (data && data.length > 0) {
            this.saveMyRankingId(data[0].id, secretKey);
        }

        return data;
    },

    async deleteScore(id) {
        const secret = this.getMySecret(id);
        if (!secret) {
            console.error('No secret found for this score');
            throw new Error('Cannot delete score: secret not found');
        }

        // Use RPC for secure deletion
        const { error } = await supabase
            .rpc('delete_ranking', { target_id: id, secret: secret });

        if (error) {
            console.error('Error deleting score:', error);
            throw error;
        }

        this.removeMyRankingId(id);
    },

    saveMyRankingId(id, secret) {
        const items = this.getMyRankingItems();
        items.push({ id, secret });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    },

    removeMyRankingId(id) {
        let items = this.getMyRankingItems();
        items = items.filter(item => item.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    },

    getMyRankingItems() {
        const json = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!json) return [];
        try {
            return JSON.parse(json);
        } catch (e) {
            return [];
        }
    },

    getMySecret(id) {
        const items = this.getMyRankingItems();
        const item = items.find(i => i.id === id);
        return item ? item.secret : null;
    },

    isMyScore(id) {
        const items = this.getMyRankingItems();
        return items.some(item => item.id === id);
    },

    _generateSecret() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
};
