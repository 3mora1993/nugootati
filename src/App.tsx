import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  Plus, 
  Calendar, 
  Gift, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Search, 
  Filter,
  Edit2,
  Trash2,
  Download,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  AlertCircle,
  FileText,
  Star
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
  const [activeTab, setActiveTab] = useState<'events' | 'outgoing'>('events');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddNugoot, setShowAddNugoot] = useState(false);
  const [showAddOutgoing, setShowAddOutgoing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterDirection, setFilterDirection] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [editingNugoot, setEditingNugoot] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const { events, loading: eventsLoading, addEvent, updateEvent, deleteEvent } = useEvents(user);
  const { 
    nugoot, 
    loading: nugootLoading, 
    addNugoot, 
    updateNugoot, 
    deleteNugoot, 
    getFilteredNugoot, 
    getStatistics, 
    getIncomingNames,
    getGlobalOutgoingNugoot,
    getGlobalOutgoingStatistics
  } = useNugoot(user, selectedEvent || undefined, activeTab === 'outgoing' ? 'outgoing' : undefined);

  // Event form state
  const [eventForm, setEventForm] = useState({
    name: '',
    type: 'عرس'
  });

  // Nugoot form state
  const [nugootForm, setNugootForm] = useState({
    name: '',
    amount: '',
    type: 'cash' as 'cash' | 'gift',
    gift_description: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    direction: 'incoming' as 'incoming' | 'outgoing'
  });

  // Outgoing nugoot form state
  const [outgoingForm, setOutgoingForm] = useState({
    name: '',
    amount: '',
    type: 'cash' as 'cash' | 'gift',
    gift_description: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

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

  const handleAddNugoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    try {
      await addNugoot({
        ...nugootForm,
        event_id: selectedEvent
      });
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

  const handleAddOutgoing = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addNugoot({
        ...outgoingForm,
        direction: 'outgoing'
      });
      setOutgoingForm({
        name: '',
        amount: '',
        type: 'cash',
        gift_description: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddOutgoing(false);
    } catch (error) {
      console.error('Error adding outgoing nugoot:', error);
    }
  };

  const handleUpdateNugoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNugoot) return;

    try {
      await updateNugoot(editingNugoot.id, {
        name: editingNugoot.name,
        amount: editingNugoot.amount ? parseFloat(editingNugoot.amount) : 0,
        type: editingNugoot.type,
        gift_description: editingNugoot.gift_description,
        notes: editingNugoot.notes,
        date: editingNugoot.date
      });
      setEditingNugoot(null);
    } catch (error) {
      console.error('Error updating nugoot:', error);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      await updateEvent(editingEvent.id, {
        name: editingEvent.name,
        type: editingEvent.type,
        date: editingEvent.date
      });
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const exportToExcel = () => {
    if (!selectedEvent) return;
    
    const eventNugoot = getFilteredNugoot(selectedEvent, '', 'newest');
    const stats = getStatistics(selectedEvent);
    
    const worksheetData = [
      ['تقرير النقوط'],
      [''],
      ['إجمالي المبلغ:', stats.totalAmount],
      ['عدد الأشخاص:', stats.totalPeople],
      ['عدد الهدايا:', stats.giftCount],
      ['متوسط المبلغ:', stats.avgAmount.toFixed(2)],
      [''],
      ['الاسم', 'المبلغ', 'النوع', 'وصف الهدية', 'ملاحظات', 'التاريخ', 'الاتجاه']
    ];

    eventNugoot.forEach(item => {
      worksheetData.push([
        item.name,
        item.amount || 0,
        item.type === 'cash' ? 'نقدي' : 'هدية',
        item.gift_description || '',
        item.notes || '',
        item.date,
        item.direction === 'incoming' ? 'وارد' : 'صادر'
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'النقوط');
    
    const selectedEventData = events.find(e => e.id === selectedEvent);
    const fileName = `نقوط_${selectedEventData?.name || 'مناسبة'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEvent) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Skip header rows and process data
        const dataRows = jsonData.slice(8) as any[][];
        
        dataRows.forEach(async (row) => {
          if (row[0] && row[0].trim()) { // Check if name exists
            try {
              await addNugoot({
                event_id: selectedEvent,
                name: row[0].toString().trim(),
                amount: row[1] ? row[1].toString() : '0',
                type: row[2] === 'هدية' ? 'gift' : 'cash',
                gift_description: row[3] ? row[3].toString() : '',
                notes: row[4] ? row[4].toString() : '',
                date: row[5] ? new Date(row[5]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                direction: row[6] === 'صادر' ? 'outgoing' : 'incoming'
              });
            } catch (error) {
              console.error('Error importing row:', error);
            }
          }
        });
      } catch (error) {
        console.error('Error reading Excel file:', error);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
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

  const selectedEventData = events.find(e => e.id === selectedEvent);
  const eventNugoot = selectedEvent ? getFilteredNugoot(selectedEvent, searchTerm, sortBy, filterDirection === 'all' ? undefined : filterDirection) : [];
  const stats = selectedEvent ? getStatistics(selectedEvent, filterDirection === 'all' ? undefined : filterDirection) : null;
  const incomingNames = selectedEvent ? getIncomingNames(selectedEvent) : getIncomingNames();
  const globalOutgoingNugoot = getGlobalOutgoingNugoot();
  const globalOutgoingStats = getGlobalOutgoingStatistics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-4">
          <h1 className="text-xl font-bold text-center mb-4">نقوطاتي 💎</h1>
          
          {/* Tab Navigation */}
          <div className="flex bg-slate-500/30 rounded-lg p-1">
            <button
              onClick={() => {
                setActiveTab('events');
                setSelectedEvent(null);
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'events' 
                  ? 'bg-white text-slate-700' 
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              المناسبات
            </button>
            <button
              onClick={() => {
                setActiveTab('outgoing');
                setSelectedEvent(null);
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'outgoing' 
                  ? 'bg-white text-slate-700' 
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              النقوط الصادر
            </button>
          </div>
        </div>

        {/* Events Tab */}
        {activeTab === 'events' && !selectedEvent && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800">المناسبات</h2>
              <button
                onClick={() => setShowAddEvent(true)}
                className="bg-slate-600 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-600 mb-4">لا توجد مناسبات بعد</p>
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  إضافة أول مناسبة
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(event.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{event.name}</h3>
                        <p className="text-sm text-slate-600">{event.type}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(event.date).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEvent({ ...event });
                          }}
                          className="text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('هل أنت متأكد من حذف هذه المناسبة؟')) {
                              deleteEvent(event.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Outgoing Tab */}
        {activeTab === 'outgoing' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800">النقوط الصادر</h2>
              <button
                onClick={() => setShowAddOutgoing(true)}
                className="bg-slate-600 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Global Outgoing Statistics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-xs">إجمالي المبلغ</p>
                    <p className="text-lg font-bold">{globalOutgoingStats.totalAmount.toLocaleString()}</p>
                  </div>
                  <ArrowUp className="text-red-200" size={20} />
                </div>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-xs">عدد الأشخاص</p>
                    <p className="text-lg font-bold">{globalOutgoingStats.totalPeople}</p>
                  </div>
                  <Users className="text-orange-200" size={20} />
                </div>
              </div>
            </div>

            {globalOutgoingNugoot.length === 0 ? (
              <div className="text-center py-12">
                <ArrowUp className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-600 mb-4">لا يوجد نقوط صادر بعد</p>
                <button
                  onClick={() => setShowAddOutgoing(true)}
                  className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  إضافة أول نقوط صادر
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {globalOutgoingNugoot.map((item) => (
                  <div key={item.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{item.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <ArrowUp className="text-red-500" size={16} />
                          <span className="text-sm text-red-600">صادر</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingNugoot({ ...item, amount: item.amount?.toString() || '' })}
                          className="text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا النقوط؟')) {
                              deleteNugoot(item.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {item.type === 'cash' && item.amount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="text-green-600" size={16} />
                          <span className="text-green-700 font-semibold">{item.amount.toLocaleString()} ريال</span>
                        </div>
                      )}
                      
                      {item.type === 'gift' && (
                        <div className="flex items-center gap-2">
                          <Gift className="text-purple-600" size={16} />
                          <span className="text-purple-700">{item.gift_description || 'هدية'}</span>
                        </div>
                      )}
                      
                      <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString('ar-SA')}</p>
                      
                      {item.notes && (
                        <div className="flex items-start gap-2">
                          <FileText className="text-slate-400 mt-0.5" size={14} />
                          <p className="text-sm text-slate-600">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Event Details */}
        {activeTab === 'events' && selectedEvent && selectedEventData && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowUpDown size={20} />
              </button>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-800">{selectedEventData.name}</h2>
                <p className="text-sm text-slate-600">{selectedEventData.type}</p>
              </div>
              <button
                onClick={() => setShowStats(!showStats)}
                className="bg-slate-600 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <TrendingUp size={20} />
              </button>
            </div>

            {/* Statistics */}
            {showStats && stats && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3">إحصائيات المناسبة</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-slate-600">إجمالي المبلغ</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalPeople}</p>
                    <p className="text-xs text-slate-600">عدد الأشخاص</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.giftCount}</p>
                    <p className="text-xs text-slate-600">عدد الهدايا</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{stats.avgAmount.toFixed(0)}</p>
                    <p className="text-xs text-slate-600">متوسط المبلغ</p>
                  </div>
                </div>
                
                {stats.topNugoot.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">أعلى النقوط</h4>
                    <div className="space-y-1">
                      {stats.topNugoot.slice(0, 3).map((item, index) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Star className="text-yellow-500" size={14} />
                            <span>{item.name}</span>
                          </div>
                          <span className="font-semibold text-green-600">{item.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={exportToExcel}
                    className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    تصدير Excel
                  </button>
                  <label className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer">
                    <Upload size={16} />
                    استيراد Excel
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={importFromExcel}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="البحث بالاسم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none text-sm"
                >
                  <option value="newest">الأحدث</option>
                  <option value="highest">الأعلى مبلغاً</option>
                  <option value="alphabetical">أبجدياً</option>
                </select>
                
                <select
                  value={filterDirection}
                  onChange={(e) => setFilterDirection(e.target.value as 'all' | 'incoming' | 'outgoing')}
                  className="flex-1 p-2 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none text-sm"
                >
                  <option value="all">الكل</option>
                  <option value="incoming">وارد</option>
                  <option value="outgoing">صادر</option>
                </select>
              </div>
            </div>

            {/* Add Nugoot Button */}
            <button
              onClick={() => setShowAddNugoot(true)}
              className="w-full bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <Plus size={20} />
              إضافة نقوط
            </button>

            {/* Nugoot List */}
            {nugootLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-2"></div>
                <p className="text-slate-600 text-sm">جاري التحميل...</p>
              </div>
            ) : eventNugoot.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-600 mb-4">لا يوجد نقوط لهذه المناسبة بعد</p>
                <button
                  onClick={() => setShowAddNugoot(true)}
                  className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  إضافة أول نقوط
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {eventNugoot.map((item) => (
                  <div 
                    key={item.id} 
                    className={`rounded-lg p-4 border ${
                      item.direction === 'incoming' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    } ${item.reciprocated_at ? 'opacity-75' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{item.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {item.direction === 'incoming' ? (
                            <ArrowDown className="text-green-500" size={16} />
                          ) : (
                            <ArrowUp className="text-red-500" size={16} />
                          )}
                          <span className={`text-sm ${
                            item.direction === 'incoming' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.direction === 'incoming' ? 'وارد' : 'صادر'}
                          </span>
                          {item.reciprocated_at && (
                            <div className="flex items-center gap-1">
                              <Check className="text-blue-500" size={14} />
                              <span className="text-xs text-blue-600">تم الرد</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingNugoot({ ...item, amount: item.amount?.toString() || '' })}
                          className="text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا النقوط؟')) {
                              deleteNugoot(item.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {item.type === 'cash' && item.amount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="text-green-600" size={16} />
                          <span className="text-green-700 font-semibold">{item.amount.toLocaleString()} ريال</span>
                        </div>
                      )}
                      
                      {item.type === 'gift' && (
                        <div className="flex items-center gap-2">
                          <Gift className="text-purple-600" size={16} />
                          <span className="text-purple-700">{item.gift_description || 'هدية'}</span>
                        </div>
                      )}
                      
                      <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString('ar-SA')}</p>
                      
                      {item.notes && (
                        <div className="flex items-start gap-2">
                          <FileText className="text-slate-400 mt-0.5" size={14} />
                          <p className="text-sm text-slate-600">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Event Modal */}
        {showAddEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">إضافة مناسبة جديدة</h3>
                <button
                  onClick={() => setShowAddEvent(false)}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-2">اسم المناسبة</label>
                  <input
                    type="text"
                    value={eventForm.name}
                    onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    placeholder="مثال: عرس أحمد"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-slate-700 font-medium mb-2">نوع المناسبة</label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                  >
                    <option value="عرس">عرس</option>
                    <option value="خطوبة">خطوبة</option>
                    <option value="عقيقة">عقيقة</option>
                    <option value="تخرج">تخرج</option>
                    <option value="عيد ميلاد">عيد ميلاد</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddEvent(false)}
                    className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    إضافة
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">إضافة نقوط</h3>
                <button
                  onClick={() => setShowAddNugoot(false)}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddNugoot} className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-2">الاسم</label>
                  <input
                    type="text"
                    value={nugootForm.name}
                    onChange={(e) => setNugootForm({ ...nugootForm, name: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    placeholder="اسم الشخص"
                    required
                    list="incoming-names"
                  />
                  <datalist id="incoming-names">
                    {incomingNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">الاتجاه</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNugootForm({ ...nugootForm, direction: 'incoming' })}
                      className={`flex-1 p-3 rounded-lg border transition-colors ${
                        nugootForm.direction === 'incoming'
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ArrowDown size={16} />
                        وارد
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNugootForm({ ...nugootForm, direction: 'outgoing' })}
                      className={`flex-1 p-3 rounded-lg border transition-colors ${
                        nugootForm.direction === 'outgoing'
                          ? 'bg-red-100 border-red-300 text-red-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ArrowUp size={16} />
                        صادر
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">النوع</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNugootForm({ ...nugootForm, type: 'cash' })}
                      className={`flex-1 p-3 rounded-lg border transition-colors ${
                        nugootForm.type === 'cash'
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <DollarSign size={16} />
                        نقدي
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNugootForm({ ...nugootForm, type: 'gift' })}
                      className={`flex-1 p-3 rounded-lg border transition-colors ${
                        nugootForm.type === 'gift'
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Gift size={16} />
                        هدية
                      </div>
                    </button>
                  </div>
                </div>

                {nugootForm.type === 'cash' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">المبلغ</label>
                    <input
                      type="number"
                      value={nugootForm.amount}
                      onChange={(e) => setNugootForm({ ...nugootForm, amount: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
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
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                      placeholder="وصف الهدية"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-medium mb-2">التاريخ</label>
                  <input
                    type="date"
                    value={nugootForm.date}
                    onChange={(e) => setNugootForm({ ...nugootForm, date: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">ملاحظات</label>
                  <textarea
                    value={nugootForm.notes}
                    onChange={(e) => setNugootForm({ ...nugootForm, notes: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    placeholder="ملاحظات إضافية"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddNugoot(false)}
                    className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    إضافة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Outgoing Nugoot Modal */}
        {showAddOutgoing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">إضافة نقوط صادر</h3>
                <button
                  onClick={() => setShowAddOutgoing(false)}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddOutgoing} className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-2">الاسم</label>
                  <input
                    type="text"
                    value={outgoingForm.name}
                    onChange={(e) => setOutgoingForm({ ...outgoingForm, name: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    placeholder="اسم الشخص"
                    required
                    list="all-names"
                  />
                  <datalist id="all-names">
                    {incomingNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">النوع</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOutgoingForm({ ...outgoingForm, type: 'cash' })}
                      className={`flex-1 p-3 rounded-lg border transition-colors ${
                        outgoingForm.type === 'cash'
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <DollarSign size={16} />
                        نقدي
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutgoingForm({ ...outgoingForm, type: 'gift' })}
                      className={`flex-1 p-3 rounded-lg border transition-colors ${
                        outgoingForm.type === 'gift'
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Gift size={16} />
                        هدية
                      </div>
                    </button>
                  </div>
                </div>

                {outgoingForm.type === 'cash' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">المبلغ</label>
                    <input
                      type="number"
                      value={outgoingForm.amount}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, amount: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}

                {outgoingForm.type === 'gift' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">وصف الهدية</label>
                    <input
                      type="text"
                      value={outgoingForm.gift_description}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, gift_description: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                      placeholder="وصف الهدية"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-medium mb-2">التاريخ</label>
                  <input
                    type="date"
                    value={outgoingForm.date}
                    onChange={(e) => setOutgoingForm({ ...outgoingForm, date: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">ملاحظات</label>
                  <textarea
                    value={outgoingForm.notes}
                    onChange={(e) => setOutgoingForm({ ...outgoingForm, notes: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    placeholder="ملاحظات إضافية"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddOutgoing(false)}
                    className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    إضافة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Nugoot Modal */}
        {editingNugoot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">تعديل النقوط</h3>
                <button
                  onClick={() => setEditingNugoot(null)}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleUpdateNugoot} className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-2">الاسم</label>
                  <input
                    type="text"
                    value={editingNugoot.name}
                    onChange={(e) => setEditingNugoot({ ...editingNugoot, name: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">النوع</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingNugoot({ ...editingNugoot, type: 'cash' })}
                      className={`flex-1 p-3 rounded-lg border transition-colors ${
                        editingNugoot.type === 'cash'
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <DollarSign size={16} />
                        نقدي
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNugoot({ ...editingNugoot, type: 'gift' })}
                      className={`flex-1 p-3 rounded-lg border transition-colors ${
                        editingNugoot.type === 'gift'
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Gift size={16} />
                        هدية
                      </div>
                    </button>
                  </div>
                </div>

                {editingNugoot.type === 'cash' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">المبلغ</label>
                    <input
                      type="number"
                      value={editingNugoot.amount}
                      onChange={(e) => setEditingNugoot({ ...editingNugoot, amount: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}

                {editingNugoot.type === 'gift' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">وصف الهدية</label>
                    <input
                      type="text"
                      value={editingNugoot.gift_description || ''}
                      onChange={(e) => setEditingNugoot({ ...editingNugoot, gift_description: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-medium mb-2">التاريخ</label>
                  <input
                    type="date"
                    value={editingNugoot.date}
                    onChange={(e) => setEditingNugoot({ ...editingNugoot, date: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">ملاحظات</label>
                  <textarea
                    value={editingNugoot.notes || ''}
                    onChange={(e) => setEditingNugoot({ ...editingNugoot, notes: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingNugoot(null)}
                    className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    حفظ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {editingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">تعديل المناسبة</h3>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-2">اسم المناسبة</label>
                  <input
                    type="text"
                    value={editingEvent.name}
                    onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-slate-700 font-medium mb-2">نوع المناسبة</label>
                  <select
                    value={editingEvent.type}
                    onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                  >
                    <option value="عرس">عرس</option>
                    <option value="خطوبة">خطوبة</option>
                    <option value="عقيقة">عقيقة</option>
                    <option value="تخرج">تخرج</option>
                    <option value="عيد ميلاد">عيد ميلاد</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">التاريخ</label>
                  <input
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    حفظ
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