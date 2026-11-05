import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal } from 'react-native';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Download,
  Globe,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import type { VenueEvent } from '../../domain/event.types';
import { generateMonthScheduleIcs, triggerIcsDownload } from '../../utils/eventIcsExport';

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
        toast.success('Live calendar link copied to clipboard!');
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
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const ics = generateMonthScheduleIcs(events, `Monk's Dream Jazz Calendar - ${monthYear}`);
    triggerIcsDownload(ics, `Monks_Dream_Calendar_${monthYear.replace(/\s+/g, '_')}.ics`);
    toast.success(`Downloaded ${monthYear} calendar (.ics)`);
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
          {/* Header */}
          <View className="flex flex-row items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
            <View className="flex flex-row items-center gap-3">
              <View className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-[#800020]">
                <Share2 size={18} color="#800020" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-stone-900">Share Live Calendar</Text>
                <Text className="text-xs text-stone-500">
                  Public view-only link, printing, and iCal export
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:text-stone-900"
            >
              <X size={16} color="#57534e" />
            </Pressable>
          </View>

          {/* Body */}
          <View className="p-6 space-y-5">
            {/* Live Link Box */}
            <View>
              <View className="flex flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                  Live View-Only Link
                </Text>
                <View className="flex flex-row items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <View className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <Text className="text-[10px] font-bold text-emerald-700">Real-time sync</Text>
                </View>
              </View>

              <View className="flex flex-row items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2">
                <Globe size={16} color="#800020" style={{ marginLeft: 6 }} />
                <TextInput
                  editable={false}
                  selectTextOnFocus
                  value={shareUrl}
                  className="flex-1 bg-transparent text-xs text-stone-900 outline-none font-medium"
                />
                <Pressable
                  onPress={handleCopy}
                  className="flex flex-row items-center gap-1.5 rounded-lg bg-[#800020] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#66001a] transition-colors shadow-xs"
                >
                  {copied ? (
                    <Check size={14} color="#ffffff" />
                  ) : (
                    <Copy size={14} color="#ffffff" />
                  )}
                  <Text className="text-xs font-bold text-white">{copied ? 'Copied' : 'Copy'}</Text>
                </Pressable>
              </View>

              <Text className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                Musicians, staff, and guests can open this link on any phone, tablet, or laptop to
                view the interactive monthly calendar, hero posters, and showtimes without logging
                in.
              </Text>
            </View>

            {/* Actions Grid */}
            <View className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-stone-200">
              {/* Open in new tab */}
              <Pressable
                onPress={handleOpenLiveTab}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 hover:border-[#800020] hover:bg-stone-50 transition-colors text-center shadow-xs"
              >
                <ExternalLink size={20} color="#800020" />
                <Text className="text-xs font-bold text-stone-900">Open Live Tab</Text>
                <Text className="text-[10px] text-stone-500">Preview public view</Text>
              </Pressable>

              {/* Print Calendar */}
              <Pressable
                onPress={handlePrint}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 hover:border-[#800020] hover:bg-stone-50 transition-colors text-center shadow-xs"
              >
                <Printer size={20} color="#800020" />
                <Text className="text-xs font-bold text-stone-900">Print Poster</Text>
                <Text className="text-[10px] text-stone-500">A4 / Tabloid paper</Text>
              </Pressable>

              {/* Download Month .ICS */}
              <Pressable
                onPress={handleDownloadMonthIcs}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 hover:border-[#800020] hover:bg-stone-50 transition-colors text-center shadow-xs"
              >
                <Download size={20} color="#800020" />
                <Text className="text-xs font-bold text-stone-900">Download .ICS</Text>
                <Text className="text-[10px] text-stone-500">Apple / Google Cal</Text>
              </Pressable>
            </View>
          </View>

          {/* Footer */}
          <View className="flex flex-row justify-end border-t border-stone-200 bg-stone-50 px-6 py-3.5">
            <Pressable
              onPress={onClose}
              className="rounded-xl border border-stone-200 bg-white px-5 py-2 text-stone-700 font-semibold hover:bg-stone-100 shadow-xs"
            >
              <Text className="text-xs font-bold text-stone-700">Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
