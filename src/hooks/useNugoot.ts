import { useState, useEffect } from 'react';
import { supabase, Nugoot } from '../lib/supabase.tsx';
import { User } from '@supabase/supabase-js';

export const useNugoot = (user: User, eventId?: string, direction?: 'incoming' | 'outgoing') => {
  const [nugoot, setNugoot] = useState<Nugoot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNugoot = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('nugoot')
        .select('*')
        .eq('user_id', user.id);

      if (eventId) {
        query = query.eq('event_id', eventId);
      } else if (direction === 'outgoing') {
        // للنقوط الصادر العالمي، نجلب النقوط التي لا ترتبط بمناسبة
        query = query.is('event_id', null);
      }

      if (direction) {
        query = query.eq('direction', direction);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setNugoot(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addNugoot = async (nugootData: {
    event_id?: string;
    name: string;
    amount?: string;
    type: 'cash' | 'gift';
    gift_description?: string;
    notes?: string;
    date: string;
    direction: 'incoming' | 'outgoing';
  }) => {
    try {
      const { data, error } = await supabase
        .from('nugoot')
        .insert([
          {
            ...nugootData,
            amount: nugootData.amount ? parseFloat(nugootData.amount) : 0,
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      setNugoot(prev => [data, ...prev]);
      
      // إذا كان النقوط صادر، نحدث النقوط الواردة المطابقة
      if (nugootData.direction === 'outgoing') {
        await markIncomingNugootAsReciprocated(nugootData.name);
      }
      
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const markIncomingNugootAsReciprocated = async (name: string) => {
    try {
      const { error } = await supabase
        .from('nugoot')
        .update({ reciprocated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('direction', 'incoming')
        .eq('name', name)
        .is('reciprocated_at', null);

      if (error) throw error;
      
      // إعادة جلب البيانات لتحديث الحالة
      await fetchNugoot();
    } catch (err: any) {
      console.error('Error marking nugoot as reciprocated:', err.message);
    }
  };

  const updateNugoot = async (id: string, updates: Partial<Nugoot>) => {
    try {
      const { data, error } = await supabase
        .from('nugoot')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setNugoot(prev => prev.map(item => item.id === id ? data : item));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteNugoot = async (id: string) => {
    try {
      // جلب معلومات النقوط قبل حذفه
      const { data: nugootToDelete, error: fetchError } = await supabase
        .from('nugoot')
        .select('name, direction')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('nugoot')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // إذا كان النقوط المحذوف صادراً، تحقق من وجود نقوط صادر آخر لنفس الشخص
      if (nugootToDelete.direction === 'outgoing') {
        const { count, error: countError } = await supabase
          .from('nugoot')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('direction', 'outgoing')
          .eq('name', nugootToDelete.name);

        if (countError) throw countError;

        // إذا لم يعد هناك أي نقوط صادر لهذا الشخص، إزالة علامة "تم الرد عليه"
        if (count === 0) {
          const { error: updateError } = await supabase
            .from('nugoot')
            .update({ reciprocated_at: null })
            .eq('user_id', user.id)
            .eq('direction', 'incoming')
            .eq('name', nugootToDelete.name);

          if (updateError) {
            console.error('Error updating reciprocated status:', updateError);
            // لا نرمي الخطأ هنا لأن الحذف تم بنجاح
          }
        }
      }

      setNugoot(prev => prev.filter(item => item.id !== id));
      
      // إعادة جلب البيانات لتحديث الحالة (بدون انتظار لتجنب التأخير)
      fetchNugoot().catch(console.error);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const getEventNugoot = (eventId: string, filterDirection?: 'incoming' | 'outgoing') => {
    let filtered = nugoot.filter(n => n.event_id === eventId);
    if (filterDirection) {
      filtered = filtered.filter(n => n.direction === filterDirection);
    }
    return filtered;
  };

  const getFilteredNugoot = (eventId: string, searchTerm: string, sortBy: string, filterDirection?: 'incoming' | 'outgoing') => {
    const eventNugoot = getEventNugoot(eventId, filterDirection);
    let filtered = eventNugoot.filter(n => 
      n.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'highest':
        return filtered.sort((a, b) => (b.amount || 0) - (a.amount || 0));
      case 'alphabetical':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return filtered;
    }
  };

  const getStatistics = (eventId: string, filterDirection?: 'incoming' | 'outgoing') => {
    const eventNugoot = getEventNugoot(eventId, filterDirection);
    const cashNugoot = eventNugoot.filter(n => n.type === 'cash' && n.amount);
    const totalAmount = cashNugoot.reduce((sum, n) => sum + (n.amount || 0), 0);
    const giftCount = eventNugoot.filter(n => n.type === 'gift').length;
    const avgAmount = cashNugoot.length > 0 ? totalAmount / cashNugoot.length : 0;
    const topNugoot = cashNugoot.sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 5);

    return {
      totalAmount,
      totalPeople: eventNugoot.length,
      giftCount,
      avgAmount,
      topNugoot
    };
  };

  const getIncomingNames = (eventId?: string) => {
    let incomingNugoot;
    if (eventId) {
      incomingNugoot = getEventNugoot(eventId, 'incoming');
    } else {
      // جلب جميع الأسماء من النقوط الواردة عبر جميع المناسبات
      incomingNugoot = nugoot.filter(n => n.direction === 'incoming');
    }
    return [...new Set(incomingNugoot.map(n => n.name))].sort();
  };

  const getGlobalOutgoingNugoot = () => {
    return nugoot.filter(n => n.direction === 'outgoing' && !n.event_id);
  };

  const getGlobalOutgoingStatistics = () => {
    const globalOutgoing = getGlobalOutgoingNugoot();
    const cashNugoot = globalOutgoing.filter(n => n.type === 'cash' && n.amount);
    const totalAmount = cashNugoot.reduce((sum, n) => sum + (n.amount || 0), 0);
    const giftCount = globalOutgoing.filter(n => n.type === 'gift').length;
    const avgAmount = cashNugoot.length > 0 ? totalAmount / cashNugoot.length : 0;

    return {
      totalAmount,
      totalPeople: globalOutgoing.length,
      giftCount,
      avgAmount
    };
  };

  useEffect(() => {
    fetchNugoot();
  }, [user.id, eventId, direction]);

  return {
    nugoot,
    loading,
    error,
    addNugoot,
    updateNugoot,
    deleteNugoot,
    getEventNugoot,
    getFilteredNugoot,
    getStatistics,
    getIncomingNames,
    getGlobalOutgoingNugoot,
    getGlobalOutgoingStatistics,
    markIncomingNugootAsReciprocated,
    refetch: fetchNugoot
  };
};