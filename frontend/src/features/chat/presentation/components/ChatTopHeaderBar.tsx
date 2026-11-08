import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

export interface ChatTopHeaderBarProps {
  title: string;
  isMobile: boolean;
  onBack?: () => void;
  backLabel?: string;
  currentDateTime: string;
  userInitials: string;
  currentSenderName: string;
  currentSenderRole: string;
}

export const ChatTopHeaderBar: React.FC<ChatTopHeaderBarProps> = ({
  title,
  isMobile,
  onBack,
  backLabel = 'Back',
  currentDateTime,
  userInitials,
  currentSenderName,
  currentSenderRole,
}) => {
  return (
    <View className="flex-row items-center justify-between bg-white rounded-2xl px-4 sm:px-6 py-3 sm:py-3.5 mb-3 sm:mb-4 shadow-sm border border-neutral-100 flex-wrap sm:flex-nowrap gap-2">
      <View className="flex-row items-center flex-1 min-w-0 mr-2">
        {onBack && (
          <Pressable
            onPress={onBack}
            className="flex-row items-center mr-3 px-3 py-2 rounded-xl bg-neutral-100 active:opacity-80 min-h-[44px] justify-center shrink-0"
          >
            <ArrowLeft size={18} color="#431621" />
            <Text className="ml-1.5 text-sm sm:text-base font-bold text-[#431621]">
              {backLabel}
            </Text>
          </Pressable>
        )}

        <Text
          className="text-lg sm:text-2xl font-bold text-neutral-900 tracking-tight shrink min-w-0"
          numberOfLines={1}
        >
          {title}
        </Text>

        <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full ml-2 sm:ml-4 shrink-0">
          <View className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500 mr-1.5 sm:mr-2" />
          <Text className="text-xs sm:text-sm font-semibold text-emerald-800">
            {isMobile ? 'Live' : 'Online · Live DB'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center shrink-0">
        {!isMobile && (
          <Text className="hidden md:flex text-sm sm:text-base font-medium text-neutral-500 mr-4">
            {currentDateTime || 'Live Service'}
          </Text>
        )}

        <View
          className={`flex-row items-center ${!isMobile ? 'pl-3 sm:pl-4 border-l border-neutral-200' : ''}`}
        >
          <View className="w-9 sm:w-11 h-9 sm:h-11 rounded-full bg-[#FCE4EC] items-center justify-center border border-[#F8BBD0] mr-2 sm:mr-3">
            <Text className="text-xs sm:text-base font-bold text-[#800020]">{userInitials}</Text>
          </View>
          {!isMobile && (
            <View className="hidden sm:flex">
              <Text className="text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                {currentSenderName}
              </Text>
              <Text className="text-xs sm:text-sm font-medium text-neutral-500 leading-tight">
                {currentSenderRole}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
