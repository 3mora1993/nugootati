import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Gift, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Edit, 
  Trash2, 
  Download,
  ArrowLeft,
  Clock,
  Check,
  Undo2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import AuthWrapper from './components/AuthWrapper';
import { useEvents } from './hooks/useEvents';
import { useNugoot } from './hooks/useNugoot';

const App: React.FC = () => {
  return (
    <AuthWrapper>
      {(user: User) => <MainApp user={user} />}
    </AuthWrapper>
  );
};

const MainApp: React.FC<{ user: User }> = ({ user }) => {
  const { events, loading: eventsLoading, addEvent, updateEvent, deleteEvent } = useEvents(user);
  const { nugoot, addNugoot, updateNugoot, deleteNugoot, getEventNugoot, getFilteredNugoot, getStatistics, getIncomingNames, getGlobalOutgoingNugoot, getGlobalOutgoingStatistics } = useNugoot(user);

  const [currentView, setCurrentView] = useState<'events' | 'event-detail' | 'global-outgoing'>('events');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddNugoot, setShowAddNugoot] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingNugoot, setEditingNugoot] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterDirection, setFilterDirection] = useState<'all' | 'incoming' | 'outgoing'>('incoming');

  const [eventForm, setEventForm] = useState({
    name: '',
    type: 'عرس'
  });

  const [nugootForm, setNugootForm] = useState({
    name: '',
    amount: '',
    type: 'cash' as 'cash' | 'gift',
    gift_description: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    direction: 'incoming' as 'incoming' | 'outgoing'
  });

  const eventTypes = ['عرس', 'خطوبة', 'عقيقة', 'تخرج', 'عيد ميلاد', 'أخرى'];

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addEvent(eventForm);
      setEventForm({ name: '', type: 'عرس' });
      setShowAddEvent(false);
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    try {
      await updateEvent(editingEvent.id, eventForm);
      setEditingEvent(null);
      setEventForm({ name: '', type: 'عرس' });
      setShowAddEvent(false);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المناسبة؟ سيتم حذف جميع النقوط المرتبطة بها.')) {
      try {
        await deleteEvent(eventId);
        if (selectedEvent?.id === eventId) {
          setCurrentView('events');
          setSelectedEvent(null);
        }
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleAddNugoot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nugootData = {
        event_id: nugootForm.direction === 'outgoing' ? undefined : selectedEvent?.id,
        ...nugootForm
      };
      await addNugoot(nugootData);
      setNugootForm({
        name: '',
        amount: '',
        type: 'cash',
        gift_description: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        direction: 'incoming'
      });
      setShowAddNugoot(false);
    } catch (error) {
      console.error('Error adding nugoot:', error);
    }
  };

  const handleUpdateNugoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNugoot) return;
    try {
      await updateNugoot(editingNugoot.id, {
        ...nugootForm,
        amount: nugootForm.amount ? parseFloat(nugootForm.amount) : 0
      });
      setEditingNugoot(null);
      setNugootForm({
        name: '',
        amount: '',
        type: 'cash',
        gift_description: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        direction: 'incoming'
      });
      setShowAddNugoot(false);
    } catch (error) {
      console.error('Error updating nugoot:', error);
    }
  };

  const handleDeleteNugoot = async (nugootId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا النقوط؟')) {
      try {
        await deleteNugoot(nugootId);
      } catch (error) {
        console.error('Error deleting nugoot:', error);
      }
    }
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setEventForm({ name: event.name, type: event.type });
    setShowAddEvent(true);
  };

  const handleEditNugoot = (nugootItem: any) => {
    setEditingNugoot(nugootItem);
    setNugootForm({
      name: nugootItem.name,
      amount: nugootItem.amount?.toString() || '',
      type: nugootItem.type,
      gift_description: nugootItem.gift_description || '',
      notes: nugootItem.notes || '',
      date: nugootItem.date,
      direction: nugootItem.direction
    });
    setShowAddNugoot(true);
  };

  const handleReciprocateNugoot = (nugootItem: any) => {
    setNugootForm({
      name: nugootItem.name,
      amount: nugootItem.amount?.toString() || '',
      type: nugootItem.type,
      gift_description: nugootItem.gift_description || '',
      notes: `رد على نقوط ${nugootItem.name}`,
      date: new Date().toISOString().split('T')[0],
      direction: 'outgoing'
    });
    setShowAddNugoot(true);
  };

  const exportToExcel = () => {
    let dataToExport;
    let filename;

    if (currentView === 'global-outgoing') {
      const globalOutgoing = getGlobalOutgoingNugoot();
      dataToExport = globalOutgoing.map(item => ({
        'الاسم': item.name,
        'المبلغ': item.type === 'cash' ? `${item.amount} ₪` : 'هدية',
        'النوع': item.type === 'cash' ? 'نقد' : 'هدية',
        'وصف الهدية': item.gift_description || '',
        'ملاحظات': item.notes || '',
        'التاريخ': new Date(item.date).toLocaleDateString('ar-SA'),
        'الاتجاه': 'صادر'
      }));
      filename = 'النقوط_الصادر_العام.xlsx';
    } else if (selectedEvent) {
      const eventNugoot = getEventNugoot(selectedEvent.id);
      dataToExport = eventNugoot.map(item => ({
        'الاسم': item.name,
        'المبلغ': item.type === 'cash' ? `${item.amount} ₪` : 'هدية',
        'النوع': item.type === 'cash' ? 'نقد' : 'هدية',
        'وصف الهدية': item.gift_description || '',
        'ملاحظات': item.notes || '',
        'التاريخ': new Date(item.date).toLocaleDateString('ar-SA'),
        'الاتجاه': item.direction === 'incoming' ? 'وارد' : 'صادر',
        'تم الرد عليه': item.reciprocated_at ? 'نعم' : 'لا'
      }));
      filename = `نقوط_${selectedEvent.name}.xlsx`;
    } else {
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'النقوط');
    XLSX.writeFile(wb, filename);
  };

  const resetForm = () => {
    setNugootForm({
      name: '',
      amount: '',
      type: 'cash',
      gift_description: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      direction: 'incoming'
    });
    setEditingNugoot(null);
  };

  const resetEventForm = () => {
    setEventForm({ name: '', type: 'عرس' });
    setEditingEvent(null);
  };

  // Get filtered nugoot based on current view
  const getDisplayNugoot = () => {
    if (currentView === 'global-outgoing') {
      return getGlobalOutgoingNugoot().filter(n => 
        n.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else if (selectedEvent) {
      const direction = filterDirection === 'all' ? undefined : filterDirection;
      return getFilteredNugoot(selectedEvent.id, searchTerm, sortBy, direction);
    }
    return [];
  };

  const getDisplayStatistics = () => {
    if (currentView === 'global-outgoing') {
      return getGlobalOutgoingStatistics();
    } else if (selectedEvent) {
      const direction = filterDirection === 'all' ? undefined : filterDirection;
      return getStatistics(selectedEvent.id, direction);
    }
    return { totalAmount: 0, totalPeople: 0, giftCount: 0, avgAmount: 0, topNugoot: [] };
  };

  if (eventsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-4">
          <div className="flex items-center justify-between">
            {currentView !== 'events' && (
              <button
                onClick={() => {
                  setCurrentView('events');
                  setSelectedEvent(null);
                  setSearchTerm('');
                  setFilterDirection('incoming');
                }}
                className="p-2 hover:bg-slate-500 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold">
                {currentView === 'events' ? 'نقوطاتي 💎' : 
                 currentView === 'global-outgoing' ? 'النقوط الصادر العام' :
                 selectedEvent?.name}
              </h1>
              {currentView === 'events' && (
                <p className="text-slate-200 text-sm">إدارة النقوط والهدايا</p>
              )}
            </div>
            {currentView !== 'events' && (
              <button
                onClick={exportToExcel}
                className="p-2 hover:bg-slate-500 rounded-lg transition-colors"
              >
                <Download size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Events List View */}
        {currentView === 'events' && (
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                إضافة مناسبة
              </button>
              <button
                onClick={() => setCurrentView('global-outgoing')}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
              >
                النقوط الصادر العام
              </button>
            </div>

            <div className="space-y-3">
              {events.map((event) => {
                const eventStats = getStatistics(event.id);
                return (
                  <div
                    key={event.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedEvent(event);
                      setCurrentView('event-detail');
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-800">{event.name}</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(event);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {event.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {eventStats.totalPeople}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={14} />
                        {eventStats.totalAmount} ₪
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {events.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-600 mb-4">لا توجد مناسبات بعد</p>
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  إضافة أول مناسبة
                </button>
              </div>
            )}
          </div>
        )}

        {/* Event Detail View */}
        {(currentView === 'event-detail' || currentView === 'global-outgoing') && (
          <div className="p-4">
            {/* Statistics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(() => {
                const stats = getDisplayStatistics();
                return (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <div className="text-green-600 font-bold text-lg">{stats.totalAmount} ₪</div>
                      <div className="text-green-700 text-sm">إجمالي المبلغ</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <div className="text-blue-600 font-bold text-lg">{stats.totalPeople}</div>
                      <div className="text-blue-700 text-sm">عدد الأشخاص</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                      <div className="text-purple-600 font-bold text-lg">{stats.giftCount}</div>
                      <div className="text-purple-700 text-sm">عدد الهدايا</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <div className="text-orange-600 font-bold text-lg">{Math.round(stats.avgAmount)} ₪</div>
                      <div className="text-orange-700 text-sm">متوسط المبلغ</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Controls */}
            <div className="space-y-3 mb-4">
              <button
                onClick={() => {
                  resetForm();
                  setShowAddNugoot(true);
                }}
                className="w-full bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                إضافة نقوط
              </button>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-3 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="البحث بالاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                >
                  <option value="newest">الأحدث</option>
                  <option value="highest">الأعلى مبلغاً</option>
                  <option value="alphabetical">أبجدياً</option>
                </select>

                {currentView !== 'global-outgoing' && (
                  <select
                    value={filterDirection}
                    onChange={(e) => setFilterDirection(e.target.value as 'all' | 'incoming' | 'outgoing')}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                  >
                    <option value="incoming">وارد</option>
                    <option value="outgoing">صادر</option>
                  </select>
                )}
              </div>
            </div>

            {/* Nugoot List */}
            <div className="space-y-3">
              {getDisplayNugoot().map((nugootItem) => (
                <div
                  key={nugootItem.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-800">{nugootItem.name}</h4>
                    <div className="flex gap-1">
                      {nugootItem.direction === 'incoming' && !nugootItem.reciprocated_at && (
                        <button
                          onClick={() => handleReciprocateNugoot(nugootItem)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="رد بالمثل"
                        >
                          <Undo2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditNugoot(nugootItem)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteNugoot(nugootItem.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      nugootItem.direction === 'incoming' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {nugootItem.direction === 'incoming' ? 'وارد ↓' : 'صادر ↑'}
                    </span>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      nugootItem.type === 'cash' 
                        ? 'bg-yellow-100 text-yellow-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {nugootItem.type === 'cash' ? 'نقد' : 'هدية'}
                    </span>

                    {nugootItem.reciprocated_at && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                        <Check size={12} />
                        تم الرد عليه
                      </span>
                    )}
                  </div>

                  <div className="text-slate-600 text-sm space-y-1">
                    {nugootItem.type === 'cash' && nugootItem.amount && (
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} />
                        <span className="font-semibold text-green-600">{nugootItem.amount} ₪</span>
                      </div>
                    )}
                    
                    {nugootItem.type === 'gift' && nugootItem.gift_description && (
                      <div className="flex items-center gap-1">
                        <Gift size={14} />
                        <span>{nugootItem.gift_description}</span>
                      </div>
                    )}
                    
                    {nugootItem.notes && (
                      <div className="text-slate-500 text-xs">
                        {nugootItem.notes}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock size={12} />
                      <span>{new Date(nugootItem.date).toLocaleDateString('ar-SA')}</span>
                    </div>

                    {nugootItem.reciprocated_at && (
                      <div className="flex items-center gap-1 text-green-600 text-xs">
                        <Check size={12} />
                        <span>تم الرد في: {new Date(nugootItem.reciprocated_at).toLocaleDateString('ar-SA')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {getDisplayNugoot().length === 0 && (
              <div className="text-center py-12">
                <Gift className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-600 mb-4">لا توجد نقوط بعد</p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddNugoot(true);
                  }}
                  className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  إضافة أول نقوط
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Event Modal */}
        {showAddEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingEvent ? 'تعديل المناسبة' : 'إضافة مناسبة جديدة'}
              </h3>
              <form onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">اسم المناسبة</label>
                    <input
                      type="text"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      placeholder="مثال: عرس أحمد"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">نوع المناسبة</label>
                    <select
                      value={eventForm.type}
                      onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                    >
                      {eventTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEvent(false);
                      resetEventForm();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {editingEvent ? 'تحديث' : 'إضافة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Nugoot Modal */}
        {showAddNugoot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {editingNugoot ? 'تعديل النقوط' : 'إضافة نقوط جديد'}
              </h3>
              <form onSubmit={editingNugoot ? handleUpdateNugoot : handleAddNugoot}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">الاسم</label>
                    <input
                      type="text"
                      value={nugootForm.name}
                      onChange={(e) => setNugootForm({ ...nugootForm, name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      placeholder="اسم الشخص"
                      required
                      list="incoming-names"
                    />
                    <datalist id="incoming-names">
                      {getIncomingNames(currentView === 'global-outgoing' ? undefined : selectedEvent?.id).map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">النوع</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, type: 'cash' })}
                        className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                          nugootForm.type === 'cash'
                            ? 'bg-slate-600 text-white border-slate-600'
                            : 'border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        نقد
                      </button>
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, type: 'gift' })}
                        className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                          nugootForm.type === 'gift'
                            ? 'bg-slate-600 text-white border-slate-600'
                            : 'border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        هدية
                      </button>
                    </div>
                  </div>

                  {nugootForm.type === 'cash' && (
                    <div>
                      <label className="block text-slate-700 font-medium mb-2">المبلغ (₪)</label>
                      <input
                        type="number"
                        value={nugootForm.amount}
                        onChange={(e) => setNugootForm({ ...nugootForm, amount: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}

                  {nugootForm.type === 'gift' && (
                    <div>
                      <label className="block text-slate-700 font-medium mb-2">وصف الهدية</label>
                      <input
                        type="text"
                        value={nugootForm.gift_description}
                        onChange={(e) => setNugootForm({ ...nugootForm, gift_description: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                        placeholder="مثال: مجموعة أكواب"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">الاتجاه</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, direction: 'incoming' })}
                        className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                          nugootForm.direction === 'incoming'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        وارد ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, direction: 'outgoing' })}
                        className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                          nugootForm.direction === 'outgoing'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        صادر ↑
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">التاريخ</label>
                    <input
                      type="date"
                      value={nugootForm.date}
                      onChange={(e) => setNugootForm({ ...nugootForm, date: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">ملاحظات</label>
                    <textarea
                      value={nugootForm.notes}
                      onChange={(e) => setNugootForm({ ...nugootForm, notes: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      placeholder="ملاحظات إضافية..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddNugoot(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {editingNugoot ? 'تحديث' : 'إضافة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;