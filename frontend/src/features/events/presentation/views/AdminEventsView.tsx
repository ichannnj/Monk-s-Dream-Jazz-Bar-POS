import React, { useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { CalendarDays, Plus } from 'lucide-react-native';
import { useEventStore } from '../../application/useEventStore';
import { MonthCalendarGrid } from '../components/MonthCalendarGrid';
import { WeekScheduleView } from '../components/WeekScheduleView';
import { AgendaListView } from '../components/AgendaListView';
import { EventDetailModal } from '../components/EventDetailModal';
import { CreateEditEventModal } from '../components/CreateEditEventModal';
import { ShareCalendarModal } from '../components/ShareCalendarModal';
import { TodaysEventBanner } from '../components/TodaysEventBanner';
import { EventCalendarShell } from '../components/EventCalendarShell';
import { EventCalendarControls } from '../components/EventCalendarControls';
import { EventActionMenu } from '../components/EventActionMenu';
import { generateMonthScheduleIcs, triggerIcsDownload } from '../../utils/eventIcsExport';
import { exportEventsScheduleToExcel } from '@/features/admin/utils/readingExcelExport';
import { toast } from '@/features/shared/toast/useToastStore';
import { useWindowVisibilitySync, useResponsive } from '@/features/shared';
import { formatMonthYearTitle, formatWeekPeriodTitle } from '../utils/eventFormatters';

export const AdminEventsView: React.FC = () => {
  const { isMobile } = useResponsive();
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
    isLoading,
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

  const handleExportExcel = () => {
    try {
      exportEventsScheduleToExcel(events, currentPeriodTitle());
      toast.success('Event run-of-show exported to Excel (.xls)', {
        title: 'Excel export ready',
      });
    } catch (err) {
      console.error('[AdminEventsView] Excel export error:', err);
      toast.error('Failed to export event spreadsheet', { title: 'Export error' });
    }
  };

  const handleOpenLiveView = () => {
    if (typeof window !== 'undefined') {
      window.open('?mode=events', '_blank');
    }
  };

  return (
    <EventCalendarShell
      isLoading={isLoading && events.length === 0}
      bannerSlot={<TodaysEventBanner />}
      headerSlot={
        <View className="border-b border-stone-200/80 bg-white px-4 py-3 sm:px-6 sm:py-4 shadow-xs">
          <View className="max-w-7xl mx-auto flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-3 min-w-0">
              <View className="h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#800020] shadow-xs flex-shrink-0">
                <CalendarDays size={20} color="#ffffff" aria-hidden={true} />
              </View>
              <View className="min-w-0">
                <Text
                  className="text-lg sm:text-2xl font-extrabold tracking-tight text-stone-900 leading-tight"
                  numberOfLines={1}
                >
                  Event logistics & calendar
                </Text>
                <Text
                  className="text-xs sm:text-sm text-stone-500 hidden sm:flex"
                  numberOfLines={1}
                >
                  Schedule gigs, artist line-ups, posters, and run-of-show.
                </Text>
              </View>
            </View>

            {/* Primary Action: Schedule Event */}
            <Pressable
              onPress={() => openCreateModal()}
              accessibilityRole="button"
              accessibilityLabel="Schedule new event"
              style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
              className="flex-row items-center justify-center gap-1.5 rounded-xl bg-[#800020] px-3.5 py-2 sm:px-4 sm:py-2.5 text-white active:bg-[#66001a] shadow-xs"
            >
              <Plus size={16} color="#ffffff" aria-hidden={true} />
              <Text className="text-xs sm:text-sm font-bold text-white">Schedule event</Text>
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
              onExportExcel={handleExportExcel}
              onExportIcs={handleExportMonthIcs}
              onShare={openShareModal}
              onOpenLiveView={handleOpenLiveView}
              showExcel={true}
              showLiveView={true}
            />
          }
        />
      }
    >
      {/* Calendar View Body */}
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

      {/* Modals & Dialogs */}
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
    </EventCalendarShell>
  );
};
