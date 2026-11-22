import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Camera, Link as LinkIcon, Trash2, Check, AlertCircle } from 'lucide-react-native';
import { AdminInput } from '../../../components/AdminInput';
import {
  validateInventoryImageFile,
  prepareInventoryImageForUpload,
  type PreparedInventoryImage,
} from '../../../../data/api/inventoryImage.service';

export interface InventoryPhotoFieldProps {
  currentImageUrl?: string | null;
  stagedImage: PreparedInventoryImage | null;
  onStagedImageChange: (image: PreparedInventoryImage | null) => void;
  urlValue: string;
  onUrlValueChange: (url: string) => void;
  onClearPhoto: () => void;
  itemName?: string;
}

export const InventoryPhotoField: React.FC<InventoryPhotoFieldProps> = ({
  currentImageUrl,
  stagedImage,
  onStagedImageChange,
  urlValue,
  onUrlValueChange,
  onClearPhoto,
  itemName = 'inventory-item',
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const activeDisplayUri = stagedImage
    ? stagedImage.previewUri
    : urlValue.trim() || currentImageUrl || '';
  const hasPhoto = Boolean(activeDisplayUri);

  const handleFileSelection = async (file: File | Blob) => {
    setErrorMessage(null);
    setImageLoadError(false);

    const validation = validateInventoryImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      return;
    }

    setIsProcessing(true);
    try {
      const prepared = await prepareInventoryImageForUpload(file, itemName || 'inventory-item');
      onStagedImageChange(prepared);
      if (urlValue) onUrlValueChange('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not process image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerFilePicker = () => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.style.display = 'none';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        handleFileSelection(file);
      }
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  const formatKb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

  return (
    <View className="space-y-3">
      <View className="flex-row items-center justify-between flex-wrap gap-2">
        <Text className="text-base font-bold text-[#1A1617]">Grocery Reference Photo</Text>
        {stagedImage && (
          <View className="flex-row items-center rounded-lg bg-[#EFECE6] border border-[#E2DED6] px-2.5 py-1">
            <Check size={14} color="#10b981" />
            <Text className="ml-1.5 text-base font-semibold text-[#1A1617] tabular-nums">
              {formatKb(stagedImage.sizeBytes)} WebP
            </Text>
          </View>
        )}
      </View>

      <View className="flex-col sm:flex-row gap-3 items-stretch sm:items-center rounded-xl border border-[#E2DED6] bg-[#EFECE6] p-3">
        {/* Compact Preview Thumbnail */}
        <View className="h-28 w-full sm:w-28 rounded-xl border border-[#E2DED6] bg-white overflow-hidden items-center justify-center shrink-0">
          {hasPhoto && !imageLoadError ? (
            <Image
              source={{ uri: activeDisplayUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <View className="items-center justify-center p-2">
              <Camera size={24} color="#78716C" />
              <Text className="mt-1 text-base text-[#78716C] text-center">No photo</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="flex-1 gap-2.5 justify-center">
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={triggerFilePicker}
              disabled={isProcessing}
              className="min-h-[48px] flex-1 min-w-[150px] flex-row items-center justify-center rounded-xl bg-[#810021] px-4 active:opacity-85"
              accessibilityRole="button"
              accessibilityLabel="Upload or capture grocery reference photo"
            >
              <Camera size={18} color="#F7F5F2" />
              <Text className="ml-2 text-base font-bold text-white">
                {isProcessing ? 'Processing...' : hasPhoto ? 'Replace Photo' : 'Add Photo'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowUrlInput((prev) => !prev)}
              className="min-h-[48px] px-4 flex-row items-center justify-center rounded-xl border border-[#E2DED6] bg-white active:opacity-85"
              accessibilityRole="button"
              accessibilityLabel="Toggle image URL input"
            >
              <LinkIcon size={16} color="#1A1617" />
              <Text className="ml-2 text-base font-semibold text-[#1A1617]">URL</Text>
            </Pressable>

            {hasPhoto && (
              <Pressable
                onPress={() => {
                  setErrorMessage(null);
                  setImageLoadError(false);
                  onClearPhoto();
                }}
                className="min-h-[48px] min-w-[48px] px-3 flex-row items-center justify-center rounded-xl border border-[#E2DED6] bg-white active:opacity-85"
                accessibilityRole="button"
                accessibilityLabel="Remove reference photo"
              >
                <Trash2 size={18} color="#810021" />
              </Pressable>
            )}
          </View>

          <Text className="text-base text-[#78716C]">
            Shown on low-stock alerts so staff buy the exact brand and pack size.
          </Text>
        </View>
      </View>

      {showUrlInput && (
        <AdminInput
          label="Image URL"
          value={urlValue}
          onChangeText={(val) => {
            setImageLoadError(false);
            if (stagedImage) onStagedImageChange(null);
            onUrlValueChange(val);
          }}
          placeholder="https://..."
          autoCapitalize="none"
          clearable
        />
      )}

      {errorMessage && (
        <View className="flex-row items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5">
          <AlertCircle size={18} color="#b32638" />
          <Text className="flex-1 text-base font-semibold text-[#b32638]">{errorMessage}</Text>
        </View>
      )}
    </View>
  );
};
