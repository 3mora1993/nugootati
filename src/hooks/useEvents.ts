import { useState, useEffect } from 'react';
import supabase, { Event } from '../lib/supabase.tsx';
import { User } from '@supabase/supabase-js';

export const useEvents = (user: User) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (eventData: { name: string; type: string }) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            ...eventData,
            user_id: user.id,
            date: new Date().toISOString().split('T')[0]
          }
        ])
        .select()
        .single();

      if (error) throw error;
      setEvents(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateEvent = async (id: string, updates: Partial<Event>) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setEvents(prev => prev.map(event => event.id === id ? data : event));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setEvents(prev => prev.filter(event => event.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user.id]);

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents
  };
};