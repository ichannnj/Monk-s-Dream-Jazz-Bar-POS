import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  CalendarDays,
  Plus,
  Share2,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  List,
  Columns,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react-native';
import { useEventStore } from '../../application/useEventStore';
import { MonthCalendarGrid } from '../components/MonthCalendarGrid';
import { WeekScheduleView } from '../components/WeekScheduleView';
import { AgendaListView } from '../components/AgendaListView';
import { EventDetailModal } from '../components/EventDetailModal';
import { CreateEditEventModal } from '../components/CreateEditEventModal';
import { ShareCalendarModal } from '../components/ShareCalendarModal';
import { TodaysEventBanner } from '../components/TodaysEventBanner';
import { generateMonthScheduleIcs, triggerIcsDownload } from '../../utils/eventIcsExport';
import { exportEventsScheduleToExcel } from '@/features/admin/utils/readingExcelExport';
import { toast } from '@/features/shared/toast/useToastStore';
import { useWindowVisibilitySync } from '@/features/shared';

export const AdminEventsView: React.FC = () => {
  const {
    events,
    currentDate,
    viewMode,
    selectedEvent,
    editingEvent,
    isCreateModalOpen,
    isDetailModalOpen,
    isShareModalOpen,
    initialCreateDate,
    loadEvents,
    nextPeriod,
    prevPeriod,
    goToToday,
    setViewMode,
    openEventDetail,
    closeEventDetail,
    openCreateModal,
    openEditModal,
    closeCreateEditModal,
    openShareModal,
    closeShareModal,
    saveEvent,
    deleteEvent,
    initRealtimeSubscription,
  } = useEventStore();

  useWindowVisibilitySync(loadEvents);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(() => {
      loadEvents();
    }, 10000);
    const unsub = initRealtimeSubscription();
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [loadEvents, initRealtimeSubscription]);

  const currentPeriodTitle = () => {
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportMonthIcs = () => {
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const ics = generateMonthScheduleIcs(events, `Monk's Dream Jazz Calendar - ${monthYear}`);
    triggerIcsDownload(ics, `Monks_Dream_Calendar_${monthYear.replace(/\s+/g, '_')}.ics`);
    toast.success(`Downloaded ${monthYear} schedule (.ics)`);
  };

  return (
    <ScrollView
      className="flex-1 min-w-0 bg-[#fcf9f9] p-3 sm:p-6 lg:p-8"
      showsVerticalScrollIndicator={false}
    >
      <View className="w-full min-w-0 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12">
        {/* Today's Event Live Highlight Banner */}
        <TodaysEventBanner />

        {/* View Header & Toolbar Card */}
        <View className="flex flex-col gap-3.5 border-b border-stone-200/80 pb-4 sm:pb-5">
          {/* Top Row: Title + Main CTA */}
          <View className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <View className="flex flex-row items-center gap-3">
              <View className="h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#800020] shadow-sm flex-shrink-0">
                <CalendarDays size={20} color="#ffffff" />
              </View>
              <View className="flex-1 min-w-0">
                <Text
                  className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-stone-900"
                  numberOfLines={1}
                >
                  Event Logistics & Calendar
                </Text>
                <Text className="text-xs sm:text-sm text-stone-500" numberOfLines={1}>
                  Schedule gigs, manage artist line-ups, hero posters, and run-of-show.
                </Text>
              </View>
            </View>

            {/* Schedule Event Button (Prominent) */}
            <Pressable
              onPress={() => openCreateModal()}
              className="flex flex-row items-center justify-center gap-2 rounded-xl bg-[#800020] px-4 py-2.5 sm:py-2 text-white font-bold hover:bg-[#66001a] transition-colors shadow-xs active:opacity-90"
            >
              <Plus size={16} color="#ffffff" />
              <Text className="text-xs sm:text-sm font-bold text-white">Schedule Event</Text>
            </Pressable>
          </View>

          {/* Controls Bar: Navigation + Views + Tools */}
          <View className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Left Controls: Date Nav + View Switcher */}
            <View className="flex flex-row flex-wrap items-center gap-2">
              {/* Date Navigation Strip */}
              <View className="flex flex-row items-center rounded-xl border border-stone-200 bg-white p-1 shadow-xs">
                <Pressable
                  onPress={prevPeriod}
                  className="h-8 w-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"
                  accessibilityLabel="Previous Period"
                >
                  <ChevronLeft size={16} color="#44403c" />
                </Pressable>

                <Pressable
                  onPress={goToToday}
                  className="px-2.5 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <Text className="text-xs font-bold text-stone-700">Today</Text>
                </Pressable>

                <Pressable
                  onPress={nextPeriod}
                  className="h-8 w-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"
                  accessibilityLabel="Next Period"
                >
                  <ChevronRight size={16} color="#44403c" />
                </Pressable>

                <Text className="px-2 text-xs sm:text-sm font-bold text-stone-900 whitespace-nowrap">
                  {currentPeriodTitle()}
                </Text>
              </View>

              {/* View Mode Switcher */}
              <View className="flex flex-row rounded-xl border border-stone-200 bg-white p-1 shadow-xs">
                <Pressable
                  onPress={() => setViewMode('month')}
                  className={`flex flex-row items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${
                    viewMode === 'month'
                      ? 'bg-[#800020] text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <CalendarDays size={14} color={viewMode === 'month' ? '#ffffff' : '#57534e'} />
                  <Text
                    className={`text-xs font-bold ${
                      viewMode === 'month' ? 'text-white' : 'text-stone-600'
                    }`}
                  >
                    Month
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setViewMode('week')}
                  className={`flex flex-row items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${
                    viewMode === 'week'
                      ? 'bg-[#800020] text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Columns size={14} color={viewMode === 'week' ? '#ffffff' : '#57534e'} />
                  <Text
                    className={`text-xs font-bold ${
                      viewMode === 'week' ? 'text-white' : 'text-stone-600'
                    }`}
                  >
                    Week
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setViewMode('agenda')}
                  className={`flex flex-row items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${
                    viewMode === 'agenda'
                      ? 'bg-[#800020] text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <List size={14} color={viewMode === 'agenda' ? '#ffffff' : '#57534e'} />
                  <Text
                    className={`text-xs font-bold ${
                      viewMode === 'agenda' ? 'text-white' : 'text-stone-600'
                    }`}
                  >
                    Agenda
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Right Tools: Print, Excel Export, ICS, Share */}
            <View className="flex flex-row items-center gap-2 self-start sm:self-auto">
              {/* Print Calendar */}
              <Pressable
                onPress={handlePrint}
                className="flex flex-row items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 sm:py-2 text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
              >
                <Printer size={14} color="#57534e" />
                <Text className="text-xs font-semibold text-stone-700">Print</Text>
              </Pressable>

              {/* Export Excel (.xls) */}
              <Pressable
                onPress={() => {
                  try {
                    exportEventsScheduleToExcel(events, currentPeriodTitle());
                    toast.success('Event run-of-show exported to Excel (.xls)', {
                      title: 'Excel Export Ready',
                    });
                  } catch (err) {
                    console.error('[AdminEventsView] Excel export error:', err);
                    toast.error('Failed to export event spreadsheet', { title: 'Export Error' });
                  }
                }}
                className="flex flex-row items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 sm:py-2 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
                accessibilityLabel="Export Event Schedule to Excel"
              >
                <FileSpreadsheet size={14} color="#047857" />
                <Text className="text-xs font-bold text-emerald-800">Excel</Text>
              </Pressable>

              {/* Export .ICS */}
              <Pressable
                onPress={handleExportMonthIcs}
                className="flex flex-row items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 sm:py-2 text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
              >
                <Download size={14} color="#57534e" />
                <Text className="text-xs font-semibold text-stone-700">iCal</Text>
              </Pressable>

              {/* Share Live Link */}
              <Pressable
                onPress={openShareModal}
                className="flex flex-row items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 sm:py-2 text-[#800020] hover:bg-rose-100 transition-colors shadow-xs"
              >
                <Share2 size={14} color="#800020" />
                <Text className="text-xs font-bold text-[#800020]">Share</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Calendar View Area */}
        {viewMode === 'month' && (
          <MonthCalendarGrid
            currentDate={currentDate}
            events={events}
            onSelectEvent={openEventDetail}
            onAddEvent={(dateStr) => openCreateModal(dateStr)}
            isAdmin={true}
          />
        )}

        {viewMode === 'week' && (
          <WeekScheduleView
            currentDate={currentDate}
            events={events}
            onSelectEvent={openEventDetail}
            onAddEvent={(dateStr) => openCreateModal(dateStr)}
            isAdmin={true}
          />
        )}

        {viewMode === 'agenda' && (
          <AgendaListView events={events} onSelectEvent={openEventDetail} isAdmin={true} />
        )}
      </View>

      {/* Modals */}
      <CreateEditEventModal
        isOpen={isCreateModalOpen}
        event={editingEvent}
        initialDate={initialCreateDate}
        onClose={closeCreateEditModal}
        onSave={saveEvent}
      />

      <EventDetailModal
        isOpen={isDetailModalOpen}
        event={selectedEvent}
        onClose={closeEventDetail}
        onEdit={(ev) => openEditModal(ev)}
        onDelete={deleteEvent}
        isAdmin={true}
      />

      <ShareCalendarModal
        isOpen={isShareModalOpen}
        onClose={closeShareModal}
        events={events}
        currentDate={currentDate}
      />
    </ScrollView>
  );
};
