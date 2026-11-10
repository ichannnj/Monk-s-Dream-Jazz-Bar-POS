import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, Platform } from 'react-native';
import { X, Share2, Copy, Check, ExternalLink, Printer, Download } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import type { VenueEvent } from '../../domain/event.types';
import { generateMonthScheduleIcs, triggerIcsDownload } from '../../utils/eventIcsExport';
import { formatMonthYearTitle } from '../utils/eventFormatters';

interface ShareCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: VenueEvent[];
  currentDate: Date;
}

export const ShareCalendarModal: React.FC<ShareCalendarModalProps> = ({
  isOpen,
  onClose,
  events,
  currentDate,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getShareUrl = () => {
    if (typeof window === 'undefined') return 'https://monksdream.bar/?mode=events';
    const url = new URL(window.location.href);
    url.search = '?mode=events';
    return url.toString();
  };

  const shareUrl = getShareUrl();

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Live calendar link copied');
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      toast.error('Could not copy link to clipboard');
    }
  };

  const handleOpenLiveTab = () => {
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank');
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadMonthIcs = () => {
    const monthYear = formatMonthYearTitle(currentDate);
    const ics = generateMonthScheduleIcs(events, `Monk's Dream Jazz Calendar - ${monthYear}`);
    triggerIcsDownload(ics, `Monks_Dream_Calendar_${monthYear.replace(/\s+/g, '_')}.ics`);
    toast.success(`Downloaded ${monthYear} calendar (.ics)`);
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-end sm:justify-center bg-black/60 p-0 sm:p-4">
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Dismiss share dialog"
        />

        <View
          className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl space-y-4"
          style={Platform.OS === 'web' ? ({ overscrollBehavior: 'contain' } as any) : undefined}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-stone-100">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center">
                <Share2 size={16} color="#800020" aria-hidden={true} />
              </View>
              <View>
                <Text className="text-base font-bold text-stone-900">Share calendar</Text>
                <Text className="text-xs text-stone-500">Public link & exports for guests</Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close share dialog"
              className="h-8 w-8 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200"
            >
              <X size={15} color="#44403c" aria-hidden={true} />
            </Pressable>
          </View>

          {/* Primary Action: Read-only URL Field with labeled Copy Button */}
          <View className="space-y-1.5">
            <Text className="text-xs font-semibold text-stone-700">Public guest link</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={shareUrl}
                editable={false}
                selectTextOnFocus
                className="flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-700"
                accessibilityLabel="Public calendar URL"
              />
              <Pressable
                onPress={handleCopy}
                accessibilityRole="button"
                accessibilityLabel="Copy calendar link"
                className="flex-row items-center gap-1.5 rounded-xl bg-[#800020] px-3.5 py-2 text-white active:bg-[#66001a]"
              >
                {copied ? (
                  <Check size={14} color="#ffffff" aria-hidden={true} />
                ) : (
                  <Copy size={14} color="#ffffff" aria-hidden={true} />
                )}
                <Text className="text-xs font-bold text-white">{copied ? 'Copied' : 'Copy'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Secondary Actions: Open Live, Print, Download ICS */}
          <View className="pt-2 border-t border-stone-100 space-y-1">
            <Pressable
              onPress={handleOpenLiveTab}
              accessibilityRole="button"
              accessibilityLabel="Open public live view in new tab"
              className="flex-row items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 active:bg-stone-100"
            >
              <View className="flex-row items-center gap-2.5">
                <ExternalLink size={15} color="#57534e" aria-hidden={true} />
                <Text className="text-xs font-medium text-stone-800">Open guest view</Text>
              </View>
              <Text className="text-xs text-stone-400">New tab</Text>
            </Pressable>

            <Pressable
              onPress={handleDownloadMonthIcs}
              accessibilityRole="button"
              accessibilityLabel="Download monthly iCal (.ics)"
              className="flex-row items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 active:bg-stone-100"
            >
              <View className="flex-row items-center gap-2.5">
                <Download size={15} color="#57534e" aria-hidden={true} />
                <Text className="text-xs font-medium text-stone-800">Download calendar (.ics)</Text>
              </View>
              <Text className="text-xs text-stone-400">iCal</Text>
            </Pressable>

            <Pressable
              onPress={handlePrint}
              accessibilityRole="button"
              accessibilityLabel="Print current month calendar"
              className="flex-row items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 active:bg-stone-100"
            >
              <View className="flex-row items-center gap-2.5">
                <Printer size={15} color="#57534e" aria-hidden={true} />
                <Text className="text-xs font-medium text-stone-800">Print schedule</Text>
              </View>
              <Text className="text-xs text-stone-400">A4 / PDF</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
