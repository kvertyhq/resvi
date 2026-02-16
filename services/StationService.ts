import { supabase } from '../supabaseClient';

export interface Station {
    id: string;
    restaurant_id: string;
    name: string;
    type: 'kitchen' | 'bar' | 'other';
    is_default: boolean;
    created_at?: string;
}

export const StationService = {
    async getStations(restaurantId: string): Promise<Station[]> {
        const { data, error } = await supabase
            .from('stations')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching stations:', error);
            throw error;
        }

        return data || [];
    },

    async createStation(station: Partial<Station>): Promise<Station> {
        // If setting as default, unset others first
        if (station.is_default && station.restaurant_id && station.type) {
            await this.unsetDefault(station.restaurant_id, station.type);
        }

        const { data, error } = await supabase
            .from('stations')
            .insert([station])
            .select()
            .single();

        if (error) {
            console.error('Error creating station:', error);
            throw error;
        }

        return data;
    },

    async updateStation(id: string, updates: Partial<Station>): Promise<Station> {
        // If setting as default, unset others first
        if (updates.is_default && updates.restaurant_id && updates.type) {
            await this.unsetDefault(updates.restaurant_id, updates.type);
        } else if (updates.is_default) {
            // If restaurant_id/type missing in updates, fetch current to know what to unset?
            // Or rely on UI passing full object? 
            // Ideally we should just do it at DB level via trigger, but client-side helpers work for now.
            // Let's assume restaurant_id is passed or we fetch it.
            // For safety, let's fetch the station if we don't have context.
            const { data: current } = await supabase.from('stations').select('restaurant_id, type').eq('id', id).single();
            if (current) {
                await this.unsetDefault(current.restaurant_id, current.type);
            }
        }

        const { data, error } = await supabase
            .from('stations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating station:', error);
            throw error;
        }

        return data;
    },

    async unsetDefault(restaurantId: string, type: string) {
        const { error } = await supabase
            .from('stations')
            .update({ is_default: false })
            .eq('restaurant_id', restaurantId)
            .eq('type', type)
            .eq('is_default', true); // Optimization: only update if true

        if (error) console.error('Error unsetting defaults:', error);
    },

    async deleteStation(id: string): Promise<void> {
        const { error } = await supabase
            .from('stations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting station:', error);
            throw error;
        }
    }
};
