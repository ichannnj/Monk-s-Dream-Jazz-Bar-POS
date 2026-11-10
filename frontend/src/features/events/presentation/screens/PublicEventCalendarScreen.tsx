import React, { useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Music, Share2, Check } from 'lucide-react-native';
import { useEventStore } from '../../application/useEventStore';
import { MonthCalendarGrid } from '../components/MonthCalendarGrid';
import { WeekScheduleView } from '../components/WeekScheduleView';
import { AgendaListView } from '../components/AgendaListView';
import { EventDetailModal } from '../components/EventDetailModal';
import { TodaysEventBanner } from '../components/TodaysEventBanner';
import { EventCalendarShell } from '../components/EventCalendarShell';
import { EventCalendarControls } from '../components/EventCalendarControls';
import { EventActionMenu } from '../components/EventActionMenu';
import { generateMonthScheduleIcs, triggerIcsDownload } from '../../utils/eventIcsExport';
import { toast } from '@/features/shared/toast/useToastStore';
import { formatMonthYearTitle, formatWeekPeriodTitle } from '../utils/eventFormatters';

export const PublicEventCalendarScreen: React.FC = () => {
  const {
    events,
    currentDate,
    viewMode,
    selectedEvent,
    isDetailModalOpen,
    isLoading,
    loadEvents,
    nextPeriod,
    prevPeriod,
    goToToday,
    setViewMode,
    openEventDetail,
    closeEventDetail,
    initRealtimeSubscription,
  } = useEventStore();

  useEffect(() => {
    loadEvents();
    const unsub = initRealtimeSubscription();
    return () => unsub();
  }, [loadEvents, initRealtimeSubscription]);

  const currentPeriodTitle = () => {
    if (viewMode === 'week') {
      return formatWeekPeriodTitle(currentDate);
    }
    return formatMonthYearTitle(currentDate);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportMonthIcs = () => {
    const monthYear = formatMonthYearTitle(currentDate);
    const ics = generateMonthScheduleIcs(events, `Monk's Dream Jazz Calendar - ${monthYear}`);
    triggerIcsDownload(ics, `Monks_Dream_Calendar_${monthYear.replace(/\s+/g, '_')}.ics`);
    toast.success(`Downloaded ${monthYear} schedule (.ics)`);
  };

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Live calendar link copied');
      }
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <EventCalendarShell
      isLoading={isLoading && events.length === 0}
      bannerSlot={<TodaysEventBanner />}
      headerSlot={
        <View className="border-b border-stone-200 bg-white px-4 py-3 sm:px-6 sm:py-3.5 shadow-xs">
          <View className="max-w-7xl mx-auto flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-2xl bg-[#800020] items-center justify-center text-white shadow-xs flex-shrink-0">
                <Music size={20} color="#ffffff" aria-hidden={true} />
              </View>
              <View>
                <Text className="text-base font-extrabold text-stone-900 tracking-wide uppercase">
                  Monk's Dream Jazz Bar
                </Text>
                <Text className="text-xs text-stone-500">Performance calendar & guest lineup</Text>
              </View>
            </View>

            {/* Quick Share action */}
            <Pressable
              onPress={handleCopyLink}
              accessibilityRole="button"
              accessibilityLabel="Share calendar link"
              style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
              className="flex-row items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[#800020] active:bg-rose-100 shadow-xs"
            >
              <Share2 size={13} color="#800020" aria-hidden={true} />
              <Text className="text-xs font-bold text-[#800020]">Share</Text>
            </Pressable>
          </View>
        </View>
      }
      controlsSlot={
        <EventCalendarControls
          currentPeriodTitle={currentPeriodTitle()}
          viewMode={viewMode}
          onPrevPeriod={prevPeriod}
          onNextPeriod={nextPeriod}
          onGoToToday={goToToday}
          onSetViewMode={setViewMode}
          actionMenuSlot={
            <EventActionMenu
              onPrint={handlePrint}
              onExportIcs={handleExportMonthIcs}
              onShare={handleCopyLink}
              showExcel={false}
              showLiveView={false}
            />
          }
        />
      }
    >
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

      {/* Guest Event Detail Modal (Read-Only) */}
      <EventDetailModal
        isOpen={isDetailModalOpen}
        event={selectedEvent}
        onClose={closeEventDetail}
        isAdmin={false}
      />
    </EventCalendarShell>
  );
};
