import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Platform } from 'react-native';
import {
  MoreVertical,
  Printer,
  FileSpreadsheet,
  Download,
  Share2,
  ExternalLink,
  X,
} from 'lucide-react-native';

export interface EventActionMenuProps {
  onPrint?: () => void;
  onExportExcel?: () => void;
  onExportIcs?: () => void;
  onShare?: () => void;
  onOpenLiveView?: () => void;
  showExcel?: boolean;
  showLiveView?: boolean;
}

export const EventActionMenu: React.FC<EventActionMenuProps> = ({
  onPrint,
  onExportExcel,
  onExportIcs,
  onShare,
  onOpenLiveView,
  showExcel = true,
  showLiveView = false,
}) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const actions = [
    ...(onShare
      ? [
          {
            id: 'share',
            label: 'Share link',
            icon: Share2,
            onPress: onShare,
            color: '#800020',
          },
        ]
      : []),
    ...(showLiveView && onOpenLiveView
      ? [
          {
            id: 'live',
            label: 'Open public view',
            icon: ExternalLink,
            onPress: onOpenLiveView,
            color: '#44403c',
          },
        ]
      : []),
    ...(onPrint
      ? [
          {
            id: 'print',
            label: 'Print calendar',
            icon: Printer,
            onPress: onPrint,
            color: '#44403c',
          },
        ]
      : []),
    ...(showExcel && onExportExcel
      ? [
          {
            id: 'excel',
            label: 'Export to Excel (.xls)',
            icon: FileSpreadsheet,
            onPress: onExportExcel,
            color: '#047857',
          },
        ]
      : []),
    ...(onExportIcs
      ? [
          {
            id: 'ics',
            label: 'Download iCal (.ics)',
            icon: Download,
            onPress: onExportIcs,
            color: '#44403c',
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Desktop / Tablet: inline button row */}
      <View className="hidden md:flex flex-row items-center gap-1.5">
        {onPrint && (
          <Pressable
            onPress={onPrint}
            accessibilityRole="button"
            accessibilityLabel="Print calendar"
            className="flex-row items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 hover:bg-stone-50 active:bg-stone-100 transition-colors shadow-xs"
          >
            <Printer size={14} color="#57534e" aria-hidden={true} />
            <Text className="text-xs font-semibold text-stone-700">Print</Text>
          </Pressable>
        )}

        {showExcel && onExportExcel && (
          <Pressable
            onPress={onExportExcel}
            accessibilityRole="button"
            accessibilityLabel="Export event schedule to Excel"
            className="flex-row items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 hover:bg-emerald-100 active:bg-emerald-200 transition-colors shadow-xs"
          >
            <FileSpreadsheet size={14} color="#047857" aria-hidden={true} />
            <Text className="text-xs font-bold text-emerald-800">Excel</Text>
          </Pressable>
        )}

        {onExportIcs && (
          <Pressable
            onPress={onExportIcs}
            accessibilityRole="button"
            accessibilityLabel="Download calendar in iCal format"
            className="flex-row items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 hover:bg-stone-50 active:bg-stone-100 transition-colors shadow-xs"
          >
            <Download size={14} color="#57534e" aria-hidden={true} />
            <Text className="text-xs font-semibold text-stone-700">iCal</Text>
          </Pressable>
        )}

        {onShare && (
          <Pressable
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel="Share calendar link"
            className="flex-row items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 hover:bg-rose-100 active:bg-rose-200 transition-colors shadow-xs"
          >
            <Share2 size={14} color="#800020" aria-hidden={true} />
            <Text className="text-xs font-bold text-[#800020]">Share</Text>
          </Pressable>
        )}
      </View>

      {/* Phone: Single 'Actions' button opening clean bottom sheet */}
      <View className="flex md:hidden">
        <Pressable
          onPress={() => setIsSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open calendar actions menu"
          className="h-9 min-w-[36px] flex-row items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 active:bg-stone-100 shadow-xs"
          style={Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined}
        >
          <MoreVertical size={16} color="#44403c" aria-hidden={true} />
          <Text className="text-xs font-semibold text-stone-700">Actions</Text>
        </Pressable>

        <Modal
          visible={isSheetOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsSheetOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <Pressable
              className="flex-1"
              onPress={() => setIsSheetOpen(false)}
              accessibilityLabel="Dismiss actions menu"
            />
            <View
              className="w-full rounded-t-3xl border-t border-stone-200 bg-white p-5 shadow-2xl"
              style={Platform.OS === 'web' ? ({ overscrollBehavior: 'contain' } as any) : undefined}
            >
              <View className="flex-row items-center justify-between pb-3 mb-2 border-b border-stone-100">
                <Text className="text-base font-bold text-stone-900">Calendar actions</Text>
                <Pressable
                  onPress={() => setIsSheetOpen(false)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-stone-100 active:bg-stone-200"
                  accessibilityRole="button"
                  accessibilityLabel="Close actions menu"
                >
                  <X size={16} color="#57534e" aria-hidden={true} />
                </Pressable>
              </View>

              <View className="space-y-1">
                {actions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <Pressable
                      key={act.id}
                      onPress={() => {
                        setIsSheetOpen(false);
                        act.onPress();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={act.label}
                      className="min-h-[48px] flex-row items-center gap-3 px-3.5 py-3 rounded-xl active:bg-stone-100"
                      style={
                        Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as any) : undefined
                      }
                    >
                      <Icon size={18} color={act.color} aria-hidden={true} />
                      <Text className="text-base font-medium text-stone-800">{act.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
};
