import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Event {
  id: string;
  name: string;
  type: string;
  date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Nugoot {
  id: string;
  event_id?: string;
  name: string;
  amount?: number;
  type: 'cash' | 'gift';
  gift_description?: string;
  notes?: string;
  date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  direction: 'incoming' | 'outgoing';
  reciprocated_at?: string;
}