import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import {
  CalendarDays,
  Columns,
  List,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Music,
  Share2,
} from 'lucide-react-native';
import { useEventStore } from '../../application/useEventStore';
import { MonthCalendarGrid } from '../components/MonthCalendarGrid';
import { WeekScheduleView } from '../components/WeekScheduleView';
import { AgendaListView } from '../components/AgendaListView';
import { EventDetailModal } from '../components/EventDetailModal';
import { TodaysEventBanner } from '../components/TodaysEventBanner';
import { generateMonthScheduleIcs, triggerIcsDownload } from '../../utils/eventIcsExport';
import { toast } from '@/features/shared/toast/useToastStore';

export const PublicEventCalendarScreen: React.FC = () => {
  const {
    events,
    currentDate,
    viewMode,
    selectedEvent,
    isDetailModalOpen,
    loadEvents,
    nextPeriod,
    prevPeriod,
    goToToday,
    setViewMode,
    openEventDetail,
    closeEventDetail,
    initRealtimeSubscription,
  } = useEventStore();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadEvents();
    const unsub = initRealtimeSubscription();
    return () => unsub();
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

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success('Live calendar link copied!');
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fcf9f9' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fcf9f9" />

      <ScrollView className="flex-1 bg-[#fcf9f9]" showsVerticalScrollIndicator={false}>
        {/* Top Venue Brand Bar */}
        <View className="border-b border-stone-200 bg-white px-4 md:px-8 py-3.5 shadow-xs">
          <View className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <View className="flex flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-2xl bg-[#800020] flex items-center justify-center text-white shadow-xs">
                <Music size={20} color="#ffffff" />
              </View>
              <View>
                <View className="flex flex-row items-center gap-2">
                  <Text className="text-base font-extrabold text-stone-900 tracking-wide uppercase">
                    Monk's Dream Jazz Bar
                  </Text>
                  <View className="flex flex-row items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                    <View className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <Text className="text-[10px] font-bold text-emerald-700">Live Sync Active</Text>
                  </View>
                </View>
                <Text className="text-xs text-stone-500">
                  Gig Schedule & Performance Run-of-Show
                </Text>
              </View>
            </View>

            {/* Public Quick Actions */}
            <View className="flex flex-row items-center gap-2">
              <Pressable
                onPress={handleCopyLink}
                className="flex flex-row items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
              >
                <Share2 size={13} color="#57534e" />
                <Text className="text-xs font-semibold text-stone-700">
                  {copied ? 'Copied' : 'Share'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handlePrint}
                className="flex flex-row items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
              >
                <Printer size={13} color="#57534e" />
                <Text className="text-xs font-semibold text-stone-700">Print</Text>
              </Pressable>

              <Pressable
                onPress={handleExportMonthIcs}
                className="flex flex-row items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-[#800020] hover:bg-rose-100 transition-colors shadow-xs"
              >
                <Download size={13} color="#800020" />
                <Text className="text-xs font-bold text-[#800020]">Export .ICS</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Main Content Area */}
        <View className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-12">
          {/* Today's Event Live Banner */}
          <TodaysEventBanner />

          {/* Navigation & View Mode Strip */}
          <View className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-4">
            {/* Date Nav Controls */}
            <View className="flex flex-row items-center rounded-xl border border-stone-200 bg-white p-1 shadow-xs self-start">
              <Pressable
                onPress={prevPeriod}
                className="h-8 w-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"
              >
                <ChevronLeft size={16} color="#44403c" />
              </Pressable>

              <Pressable
                onPress={goToToday}
                className="px-3 py-1 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <Text className="text-xs font-bold text-stone-700">Today</Text>
              </Pressable>

              <Pressable
                onPress={nextPeriod}
                className="h-8 w-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"
              >
                <ChevronRight size={16} color="#44403c" />
              </Pressable>

              <Text className="px-2.5 text-sm font-bold text-stone-900">
                {currentPeriodTitle()}
              </Text>
            </View>

            {/* View Mode Toggle */}
            <View className="flex flex-row rounded-xl border border-stone-200 bg-white p-1 shadow-xs self-start">
              <Pressable
                onPress={() => setViewMode('month')}
                className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
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
                className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
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
                className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
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

          {/* Calendar Views (Read-Only) */}
          {viewMode === 'month' && (
            <MonthCalendarGrid
              currentDate={currentDate}
              events={events}
              onSelectEvent={openEventDetail}
              isAdmin={false}
            />
          )}

          {viewMode === 'week' && (
            <WeekScheduleView
              currentDate={currentDate}
              events={events}
              onSelectEvent={openEventDetail}
              isAdmin={false}
            />
          )}

          {viewMode === 'agenda' && (
            <AgendaListView events={events} onSelectEvent={openEventDetail} isAdmin={false} />
          )}
        </View>
      </ScrollView>

      {/* Read-Only Event Detail Modal */}
      <EventDetailModal
        isOpen={isDetailModalOpen}
        event={selectedEvent}
        onClose={closeEventDetail}
        isAdmin={false}
      />
    </SafeAreaView>
  );
};
