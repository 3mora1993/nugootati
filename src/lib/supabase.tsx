import React, { useState } from 'react';
import AuthWrapper from '../components/AuthWrapper';
import { useEvents } from '../hooks/useEvents';
import { useNugoot } from '../hooks/useNugoot';
import { Event } from './lib/supabase';
import { 
  Plus, 
  Calendar, 
  Users, 
  Gift, 
  DollarSign, 
  Search, 
  Filter,
  Download,
  Edit3,
  Trash2,
  Save,
  X,
  MoreVertical,
  Check,
  Undo2,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  return (
    <AuthWrapper>
      {(user) => (
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
          <MainApp user={user} />
        </div>
      )}
    </AuthWrapper>
  );
};

const MainApp: React.FC<{ user: any }> = ({ user }) => {
  const { events, loading: eventsLoading, addEvent, updateEvent, deleteEvent } = useEvents(user);
  const { nugoot, addNugoot, updateNugoot, deleteNugoot, getFilteredNugoot, getStatistics, getIncomingNames } = useNugoot(user);
  
  const [currentView, setCurrentView] = useState<'events' | 'event-details'>('events');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentDirection, setCurrentDirection] = useState<'incoming' | 'outgoing'>('incoming');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddNugoot, setShowAddNugoot] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingNugoot, setEditingNugoot] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showEventMenu, setShowEventMenu] = useState<string | null>(null);
  const [showImportNugoot, setShowImportNugoot] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

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
      await updateEvent(editingEvent.id, {
        name: eventForm.name,
        type: eventForm.type
      });
      setEditingEvent(null);
      setEventForm({ name: '', type: 'عرس' });
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المناسبة؟ سيتم حذف جميع النقوط المرتبطة بها.')) {
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

  const startEditingEvent = (event: Event) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      type: event.type
    });
    setShowEventMenu(null);
  };

  const cancelEditingEvent = () => {
    setEditingEvent(null);
    setEventForm({ name: '', type: 'عرس' });
  };

  const handleAddNugoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    try {
      await addNugoot({
        ...nugootForm,
        event_id: selectedEvent.id
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

  const handleUpdateNugoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNugoot) return;

    try {
      await updateNugoot(editingNugoot.id, {
        name: nugootForm.name,
        amount: nugootForm.amount ? parseFloat(nugootForm.amount) : 0,
        type: nugootForm.type,
        gift_description: nugootForm.gift_description,
        notes: nugootForm.notes,
        date: nugootForm.date,
        direction: nugootForm.direction
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
    } catch (error) {
      console.error('Error updating nugoot:', error);
    }
  };

  const startEditingNugoot = (nugoot: any) => {
    setEditingNugoot(nugoot);
    setNugootForm({
      name: nugoot.name,
      amount: nugoot.amount?.toString() || '',
      type: nugoot.type,
      gift_description: nugoot.gift_description || '',
      notes: nugoot.notes || '',
      date: nugoot.date,
      direction: nugoot.direction || 'incoming'
    });
  };

  const cancelEditingNugoot = () => {
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
  };

  const handleImportNugoot = async (file: File) => {
    if (!selectedEvent) return;

    setImportError('');
    setImportSuccess('');

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          let successCount = 0;
          let errorCount = 0;

          for (const row of jsonData as any[]) {
            try {
              // تحويل أسماء الأعمدة المختلفة إلى التنسيق المطلوب
              const name = row['الاسم'] || row['Name'] || row['name'] || row['اسم'] || '';
              const amount = row['المبلغ'] || row['Amount'] || row['amount'] || row['مبلغ'] || '';
              const type = row['النوع'] || row['Type'] || row['type'] || row['نوع'] || 'cash';
              const giftDescription = row['وصف الهدية'] || row['Gift Description'] || row['gift_description'] || row['هدية'] || '';
              const notes = row['ملاحظات'] || row['Notes'] || row['notes'] || row['ملاحظة'] || '';
              const date = row['التاريخ'] || row['Date'] || row['date'] || row['تاريخ'] || new Date().toISOString().split('T')[0];

              if (!name || name.toString().trim() === '') {
                errorCount++;
                continue;
              }

              // تحويل النوع إلى التنسيق المطلوب
              let nugootType: 'cash' | 'gift' = 'cash';
              if (type.toString().toLowerCase() === 'gift' || 
                  type.toString() === 'هدية' || 
                  type.toString() === 'هديه') {
                nugootType = 'gift';
              }

              // تحويل التاريخ
              let formattedDate = new Date().toISOString().split('T')[0];
              if (date) {
                try {
                  const parsedDate = new Date(date);
                  if (!isNaN(parsedDate.getTime())) {
                    formattedDate = parsedDate.toISOString().split('T')[0];
                  }
                } catch {
                  // استخدام التاريخ الافتراضي
                }
              }

              await addNugoot({
                event_id: selectedEvent.id,
                name: name.toString().trim(),
                amount: amount ? amount.toString() : '',
                type: nugootType,
                gift_description: giftDescription.toString(),
                notes: notes.toString(),
                date: formattedDate,
                direction: 'incoming' // الاستيراد افتراضياً للنقوط الواردة
              });

              successCount++;
            } catch (error) {
              console.error('Error adding nugoot row:', error);
              errorCount++;
            }
          }

          if (successCount > 0) {
            setImportSuccess(`تم استيراد ${successCount} نقوط بنجاح${errorCount > 0 ? ` (${errorCount} أخطاء)` : ''}`);
            setTimeout(() => {
              setShowImportNugoot(false);
              setImportSuccess('');
            }, 2000);
          } else {
            setImportError('لم يتم استيراد أي نقوط. تأكد من صحة البيانات في الملف.');
          }
        } catch (error) {
          console.error('Error processing file:', error);
          setImportError('خطأ في معالجة الملف. تأكد من أن الملف بتنسيق Excel صحيح.');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setImportError('خطأ في قراءة الملف. حاول مرة أخرى.');
    }
  };

  const exportToExcel = () => {
    if (!selectedEvent) return;

    const incomingNugoot = getFilteredNugoot(selectedEvent.id, '', 'newest', 'incoming');
    const outgoingNugoot = getFilteredNugoot(selectedEvent.id, '', 'newest', 'outgoing');
    const incomingStats = getStatistics(selectedEvent.id, 'incoming');
    const outgoingStats = getStatistics(selectedEvent.id, 'outgoing');

    const worksheetData = [
      ['تقرير النقوط - ' + selectedEvent.name],
      [''],
      ['إحصائيات النقوط الواردة'],
      ['إجمالي المبلغ الوارد', incomingStats.totalAmount + ' شيكل'],
      ['عدد الأشخاص (وارد)', incomingStats.totalPeople],
      ['متوسط المبلغ الوارد', incomingStats.avgAmount.toFixed(2) + ' شيكل'],
      [''],
      ['إحصائيات النقوط الصادرة'],
      ['إجمالي المبلغ الصادر', outgoingStats.totalAmount + ' شيكل'],
      ['عدد الأشخاص (صادر)', outgoingStats.totalPeople],
      ['متوسط المبلغ الصادر', outgoingStats.avgAmount.toFixed(2) + ' شيكل'],
      [''],
      ['النقوط الواردة'],
      ['الاسم', 'المبلغ', 'النوع', 'وصف الهدية', 'ملاحظات', 'التاريخ'],
      ...incomingNugoot.map(n => [
        n.name,
        n.type === 'cash' ? (n.amount || 0) + ' شيكل' : '-',
        n.type === 'cash' ? 'نقد' : 'هدية',
        n.gift_description || '-',
        n.notes || '-',
        new Date(n.date).toLocaleDateString('ar')
      ]),
      [''],
      ['النقوط الصادرة'],
      ['الاسم', 'المبلغ', 'النوع', 'وصف الهدية', 'ملاحظات', 'التاريخ'],
      ...outgoingNugoot.map(n => [
        n.name,
        n.type === 'cash' ? (n.amount || 0) + ' شيكل' : '-',
        n.type === 'cash' ? 'نقد' : 'هدية',
        n.gift_description || '-',
        n.notes || '-',
        new Date(n.date).toLocaleDateString('ar')
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'النقوط');
    XLSX.writeFile(workbook, `نقوط_${selectedEvent.name}.xlsx`);
  };

  const downloadNugootTemplate = () => {
    const templateData = [
      ['الاسم', 'المبلغ', 'النوع', 'وصف الهدية', 'ملاحظات', 'التاريخ', 'الاتجاه'],
      ['أحمد محمد', '100', 'نقد', '', 'صديق العائلة', '2024-01-15', 'وارد'],
      ['فاطمة علي', '', 'هدية', 'طقم ذهب', 'من الأقارب', '2024-01-15', 'وارد'],
      ['محمد حسن', '200', 'نقد', '', '', '2024-01-16', 'صادر'],
      ['سارة أحمد', '', 'هدية', 'أجهزة منزلية', 'هدية قيمة', '2024-01-16', 'صادر']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب النقوط');
    XLSX.writeFile(workbook, 'قالب_النقوط.xlsx');
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

  if (currentView === 'events') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6">
            <h1 className="text-2xl font-bold text-center mb-2">نقوطاتي 💎</h1>
            <p className="text-slate-200 text-center text-sm">إدارة مناسباتك ونقوطك بسهولة</p>
          </div>

          {/* Events List */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">مناسباتي</h2>
              <button
                onClick={() => setShowAddEvent(true)}
                className="bg-slate-600 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
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
                  className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  أضف مناسبة جديدة
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedEvent(event);
                          setCurrentView('event-details');
                        }}
                      >
                        <h3 className="font-semibold text-slate-800 mb-1">{event.name}</h3>
                        <p className="text-slate-600 text-sm mb-2">{event.type}</p>
                        <p className="text-slate-500 text-xs">
                          {new Date(event.date).toLocaleDateString('ar')}
                        </p>
                      </div>
                      
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEventMenu(showEventMenu === event.id ? null : event.id);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {showEventMenu === event.id && (
                          <div className="absolute left-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                            <button
                              onClick={() => startEditingEvent(event)}
                              className="w-full text-right px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit3 size={14} />
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="w-full text-right px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Event Modal */}
          {showAddEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">إضافة مناسبة جديدة</h3>
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">اسم المناسبة</label>
                    <input
                      type="text"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      placeholder="مثال: عرس أحمد"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">نوع المناسبة</label>
                    <select
                      value={eventForm.type}
                      onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                    >
                      <option value="عرس">عرس</option>
                      <option value="خطوبة">خطوبة</option>
                      <option value="عقيقة">عقيقة</option>
                      <option value="عيد ميلاد">عيد ميلاد</option>
                      <option value="تخرج">تخرج</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors font-semibold"
                    >
                      إضافة
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEvent(false)}
                      className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Event Modal */}
          {editingEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">تعديل المناسبة</h3>
                <form onSubmit={handleUpdateEvent} className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">اسم المناسبة</label>
                    <input
                      type="text"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      placeholder="مثال: عرس أحمد"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">نوع المناسبة</label>
                    <select
                      value={eventForm.type}
                      onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                    >
                      <option value="عرس">عرس</option>
                      <option value="خطوبة">خطوبة</option>
                      <option value="عقيقة">عقيقة</option>
                      <option value="عيد ميلاد">عيد ميلاد</option>
                      <option value="تخرج">تخرج</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      حفظ
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingEvent}
                      className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg hover:bg-slate-300 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Event Details View
  if (currentView === 'event-details' && selectedEvent) {
    const eventNugoot = getFilteredNugoot(selectedEvent.id, searchTerm, sortBy, currentDirection);
    const stats = getStatistics(selectedEvent.id, currentDirection);
    const incomingNames = getIncomingNames(selectedEvent.id);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentView('events')}
                className="text-white hover:text-slate-200 transition-colors"
              >
                ← العودة
              </button>
            </div>
            <h1 className="text-xl font-bold mb-1">{selectedEvent.name}</h1>
            <p className="text-slate-200 text-sm">{selectedEvent.type}</p>
          </div>

          {/* Direction Toggle */}
          <div className="p-4 bg-slate-100 border-b border-slate-200">
            <div className="flex rounded-lg overflow-hidden border border-slate-300">
              <button
                onClick={() => setCurrentDirection('incoming')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  currentDirection === 'incoming'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                النقوط الواردة ↓
              </button>
              <button
                onClick={() => setCurrentDirection('outgoing')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  currentDirection === 'outgoing'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                النقوط الصادرة ↑
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              إحصائيات {currentDirection === 'incoming' ? 'النقوط الواردة' : 'النقوط الصادرة'}
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className={`flex items-center justify-center mb-1`}>
                  <DollarSign className={`ml-1 ${currentDirection === 'incoming' ? 'text-green-600' : 'text-red-600'}`} size={16} />
                  <span className="text-lg font-bold text-slate-800">{stats.totalAmount}</span>
                </div>
                <p className="text-slate-600 text-xs">إجمالي المبلغ</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="text-blue-600 ml-1" size={16} />
                  <span className="text-lg font-bold text-slate-800">{stats.totalPeople}</span>
                </div>
                <p className="text-slate-600 text-xs">عدد الأشخاص</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <DollarSign className="text-purple-600 ml-1" size={16} />
                  <span className="text-lg font-bold text-slate-800">{stats.avgAmount.toFixed(0)}</span>
                </div>
                <p className="text-slate-600 text-xs">متوسط المبلغ</p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-3 py-2 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none text-sm"
                  placeholder="البحث في النقوط..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNugootForm(prev => ({ ...prev, direction: currentDirection }));
                    setShowAddNugoot(true);
                  }}
                  className={`text-white p-2 rounded-lg transition-colors ${
                    currentDirection === 'incoming' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title="إضافة نقوط"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => setShowImportNugoot(true)}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                  title="استيراد من Excel"
                >
                  <Download className="rotate-180" size={16} />
                </button>
                <button
                  onClick={exportToExcel}
                  className="bg-slate-600 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                  title="تصدير إلى Excel"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Filter className="text-slate-400 mt-1" size={16} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-slate-300 rounded px-2 py-1 focus:border-slate-500 focus:outline-none"
              >
                <option value="newest">الأحدث</option>
                <option value="highest">الأعلى مبلغاً</option>
                <option value="alphabetical">أبجدياً</option>
              </select>
            </div>
          </div>

          {/* Nugoot List */}
          <div className="p-4">
            {eventNugoot.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-600 mb-4">
                  {searchTerm 
                    ? 'لا توجد نتائج للبحث' 
                    : `لا توجد نقوط ${currentDirection === 'incoming' ? 'واردة' : 'صادرة'} بعد`
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => {
                      setNugootForm(prev => ({ ...prev, direction: currentDirection }));
                      setShowAddNugoot(true);
                    }}
                    className={`text-white px-6 py-2 rounded-lg transition-colors ${
                      currentDirection === 'incoming' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    أضف نقوط {currentDirection === 'incoming' ? 'واردة' : 'صادرة'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {eventNugoot.map((nugootItem) => (
                  <div key={nugootItem.id} className={`rounded-lg p-4 border transition-all ${
                    nugootItem.direction === 'incoming' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-slate-800">{nugootItem.name}</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditingNugoot(nugootItem)}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف هذا النقوط؟')) {
                              deleteNugoot(nugootItem.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        nugootItem.direction === 'incoming'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {nugootItem.direction === 'incoming' ? 'وارد ↓' : 'صادر ↑'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        nugootItem.type === 'cash' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {nugootItem.type === 'cash' ? 'نقد' : 'هدية'}
                      </span>
                      {nugootItem.type === 'cash' && nugootItem.amount && (
                        <span className={`font-semibold ${
                          nugootItem.direction === 'incoming' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {nugootItem.amount} شيكل
                        </span>
                      )}
                    </div>

                    {nugootItem.gift_description && (
                      <p className="text-slate-600 text-sm mb-1">
                        <strong>الهدية:</strong> {nugootItem.gift_description}
                      </p>
                    )}
                    
                    {nugootItem.notes && (
                      <p className="text-slate-600 text-sm mb-1">
                        <strong>ملاحظات:</strong> {nugootItem.notes}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>
                        تاريخ النقوط: {new Date(nugootItem.date).toLocaleDateString('ar')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Nugoot Modal */}
          {showAddNugoot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  إضافة نقوط {nugootForm.direction === 'incoming' ? 'وارد' : 'صادر'}
                </h3>
                <form onSubmit={handleAddNugoot} className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">نوع النقوط</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, direction: 'incoming' })}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          nugootForm.direction === 'incoming'
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        وارد ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, direction: 'outgoing' })}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          nugootForm.direction === 'outgoing'
                            ? 'bg-red-100 border-red-500 text-red-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        صادر ↑
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">الاسم</label>
                    {nugootForm.direction === 'outgoing' && incomingNames.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          value={nugootForm.name}
                          onChange={(e) => setNugootForm({ ...nugootForm, name: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                        >
                          <option value="">اختر من النقوط الواردة أو اكتب اسم جديد</option>
                          {incomingNames.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={nugootForm.name}
                          onChange={(e) => setNugootForm({ ...nugootForm, name: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                          placeholder="أو اكتب اسم جديد"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={nugootForm.name}
                        onChange={(e) => setNugootForm({ ...nugootForm, name: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                        placeholder="اسم الشخص"
                        required
                      />
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">النوع</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, type: 'cash' })}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          nugootForm.type === 'cash'
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        نقد
                      </button>
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, type: 'gift' })}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          nugootForm.type === 'gift'
                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        هدية
                      </button>
                    </div>
                  </div>

                  {nugootForm.type === 'cash' && (
                    <div>
                      <label className="block text-slate-700 font-medium mb-2">المبلغ (شيكل)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={nugootForm.amount}
                        onChange={(e) => setNugootForm({ ...nugootForm, amount: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                        placeholder="0.000"
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
                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                        placeholder="مثال: ذهب، أجهزة منزلية..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">التاريخ</label>
                    <input
                      type="date"
                      value={nugootForm.date}
                      onChange={(e) => setNugootForm({ ...nugootForm, date: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">ملاحظات (اختياري)</label>
                    <textarea
                      value={nugootForm.notes}
                      onChange={(e) => setNugootForm({ ...nugootForm, notes: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      placeholder="أي ملاحظات إضافية..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className={`flex-1 text-white py-3 rounded-lg transition-colors font-semibold ${
                        nugootForm.direction === 'incoming'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      إضافة
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddNugoot(false)}
                      className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Nugoot Modal */}
          {editingNugoot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-800 mb-4">تعديل النقوط</h3>
                <form onSubmit={handleUpdateNugoot} className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">نوع النقوط</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, direction: 'incoming' })}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          nugootForm.direction === 'incoming'
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        وارد ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, direction: 'outgoing' })}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          nugootForm.direction === 'outgoing'
                            ? 'bg-red-100 border-red-500 text-red-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        صادر ↑
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">الاسم</label>
                    <input
                      type="text"
                      value={nugootForm.name}
                      onChange={(e) => setNugootForm({ ...nugootForm, name: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      placeholder="اسم الشخص"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">النوع</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, type: 'cash' })}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          nugootForm.type === 'cash'
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        نقد
                      </button>
                      <button
                        type="button"
                        onClick={() => setNugootForm({ ...nugootForm, type: 'gift' })}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          nugootForm.type === 'gift'
                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        هدية
                      </button>
                    </div>
                  </div>

                  {nugootForm.type === 'cash' && (
                    <div>
                      <label className="block text-slate-700 font-medium mb-2">المبلغ (شيكل)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={nugootForm.amount}
                        onChange={(e) => setNugootForm({ ...nugootForm, amount: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                        placeholder="0.000"
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
                        className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                        placeholder="مثال: ذهب، أجهزة منزلية..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">التاريخ</label>
                    <input
                      type="date"
                      value={nugootForm.date}
                      onChange={(e) => setNugootForm({ ...nugootForm, date: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2">ملاحظات (اختياري)</label>
                    <textarea
                      value={nugootForm.notes}
                      onChange={(e) => setNugootForm({ ...nugootForm, notes: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none"
                      placeholder="أي ملاحظات إضافية..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      حفظ
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingNugoot}
                      className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg hover:bg-slate-300 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Import Nugoot Modal */}
          {showImportNugoot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">استيراد النقوط من Excel</h3>
                
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    💡 <strong>نصيحة:</strong> حمّل القالب الجاهز لتسهيل عملية الاستيراد
                  </p>
                  <button
                    onClick={downloadNugootTemplate}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    تحميل القالب الجاهز
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-3">
                    اختر ملف Excel يحتوي على النقوط. يجب أن يحتوي الملف على الأعمدة التالية:
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1 mb-4">
                    <li>• الاسم (مطلوب)</li>
                    <li>• المبلغ (للنقد فقط)</li>
                    <li>• النوع (نقد/هدية)</li>
                    <li>• وصف الهدية (للهدايا)</li>
                    <li>• ملاحظات (اختياري)</li>
                    <li>• التاريخ (اختياري)</li>
                    <li>• الاتجاه (وارد/صادر)</li>
                  </ul>
                </div>

                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportNugoot(file);
                    }
                  }}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none mb-4"
                />

                {importError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-700 text-sm">{importError}</p>
                  </div>
                )}

                {importSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-green-700 text-sm">{importSuccess}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowImportNugoot(false);
                      setImportError('');
                      setImportSuccess('');
                    }}
                    className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default App;