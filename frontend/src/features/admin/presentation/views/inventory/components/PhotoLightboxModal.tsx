import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';

export interface PhotoLightboxData {
  url: string;
  title: string;
  subtitle?: string | null;
  note?: string | null;
}

interface PhotoLightboxModalProps {
  photo: PhotoLightboxData | null;
  onClose: () => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({ photo, onClose }) => {
  if (!photo) return null;

  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 items-center justify-center p-4 sm:p-6">
        <Pressable
          onPress={onClose}
          className="absolute inset-0"
          accessibilityRole="button"
          accessibilityLabel="Close photo preview"
        />

        <View className="w-full max-w-lg rounded-2xl bg-white border border-[#E7E5E4] overflow-hidden z-10">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#E7E5E4] bg-[#FAF8F5]">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-[#1C1917]" numberOfLines={1}>
                {photo.title}
              </Text>
              {photo.subtitle ? (
                <Text className="text-base text-[#78716C] tabular-nums" numberOfLines={1}>
                  {photo.subtitle}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={onClose}
              className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-white border border-[#E7E5E4] active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Close lightbox"
            >
              <X size={20} color="#1C1917" />
            </Pressable>
          </View>

          <View className="w-full h-80 sm:h-96 bg-[#FAF8F5] items-center justify-center p-3">
            <Image
              source={{ uri: photo.url }}
              style={{ width: '100%', height: '100%', borderRadius: 12 }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </View>

          {photo.note ? (
            <View className="px-4 py-3.5 border-t border-[#E7E5E4] bg-white">
              <Text className="text-base font-semibold text-[#1C1917]">{photo.note}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};
