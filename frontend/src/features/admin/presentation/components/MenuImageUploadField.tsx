import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import {
  UploadCloud,
  Link,
  Sparkles,
  X,
  UtensilsCrossed,
  Check,
  AlertCircle,
  FileImage,
} from 'lucide-react-native';
import { AdminInput } from './AdminInput';
import { IMAGE_PRESETS } from '@/features/orders/presentation/admin-item-image/presets';
import {
  validateMenuImageFile,
  prepareMenuImageForUpload,
  type PreparedMenuImage,
} from '@/features/menu/data/imageUpload.service';

export interface MenuImageUploadFieldProps {
  currentImageUrl?: string | null;
  currentStoragePath?: string | null;
  stagedImage: PreparedMenuImage | null;
  onStagedImageChange: (image: PreparedMenuImage | null) => void;
  urlValue: string;
  onUrlValueChange: (url: string) => void;
  onClearPhoto: () => void;
  productName?: string;
  stationTarget?: 'bar' | 'kitchen';
}

type TabMode = 'upload' | 'url';

export const MenuImageUploadField: React.FC<MenuImageUploadFieldProps> = ({
  currentImageUrl,
  stagedImage,
  onStagedImageChange,
  urlValue,
  onUrlValueChange,
  onClearPhoto,
  productName = 'Product',
  stationTarget = 'bar',
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Active display image: staged file preview takes precedence over URL/current
  const activeDisplayUri = stagedImage
    ? stagedImage.previewUri
    : urlValue.trim() || currentImageUrl || '';
  const hasPhoto = Boolean(activeDisplayUri);

  const handleFileSelection = async (file: File | Blob) => {
    setErrorMessage(null);
    setImageLoadError(false);

    const validation = validateMenuImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      return;
    }

    setIsProcessing(true);
    try {
      const prepared = await prepareMenuImageForUpload(file, productName);
      onStagedImageChange(prepared);
      // Clear manual URL string since local file is staged
      if (urlValue) {
        onUrlValueChange('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerFileBrowser = () => {
    if (typeof document !== 'undefined') {
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
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View className="space-y-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-stone-800">
          Product Photo &amp; Live Preview
        </Text>
        {stagedImage && (
          <View className="flex-row items-center rounded-md bg-emerald-50 px-2 py-0.5 border border-emerald-200">
            <Check size={12} color="#059669" />
            <Text className="ml-1 text-xs font-bold text-emerald-800">
              Compressed: {formatFileSize(stagedImage.originalSizeBytes)} →{' '}
              {formatFileSize(stagedImage.sizeBytes)} (
              {stagedImage.compressionRatioPercent > 0
                ? `-${stagedImage.compressionRatioPercent}%`
                : 'WebP'}
              )
            </Text>
          </View>
        )}
      </View>

      {/* 1. Live Preview Card */}
      <View className="relative h-44 w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-inner">
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
          <View className="flex-1 items-center justify-center p-4">
            <UtensilsCrossed size={36} color="#9ca3af" />
            <Text className="mt-2 text-sm text-stone-500 font-medium">
              {imageLoadError ? 'Failed to load image preview' : 'No photo specified yet'}
            </Text>
            <Text className="text-xs text-stone-400">Upload a file or choose a preset below</Text>
          </View>
        )}

        {/* Station Target Tag */}
        <View className="absolute bottom-2.5 left-2.5 rounded-lg bg-stone-900/80 px-2.5 py-1 backdrop-blur-md">
          <Text className="text-xs font-bold tracking-wide text-white uppercase">
            {stationTarget === 'bar' ? '🍸 BAR' : '🍳 KITCHEN'}
          </Text>
        </View>

        {/* Staged Upload Indicator */}
        {stagedImage && (
          <View className="absolute top-2.5 left-2.5 rounded-lg bg-emerald-600/90 px-2.5 py-1 backdrop-blur-md">
            <Text className="text-xs font-bold text-white">Ready to Upload on Save</Text>
          </View>
        )}

        {/* Clear Photo Button */}
        {hasPhoto && (
          <Pressable
            onPress={() => {
              setImageLoadError(false);
              setErrorMessage(null);
              onClearPhoto();
            }}
            className="absolute top-2.5 right-2.5 h-8 w-8 items-center justify-center rounded-full bg-stone-900/70 active:bg-stone-900"
            accessibilityRole="button"
            accessibilityLabel="Clear photo"
          >
            <X size={16} color="#ffffff" />
          </Pressable>
        )}
      </View>

      {/* Error Notice */}
      {errorMessage && (
        <View className="flex-row items-center rounded-xl bg-rose-50 border border-rose-200 p-3">
          <AlertCircle size={18} color="#e11d48" />
          <Text className="ml-2 text-sm text-rose-800 font-medium flex-1">{errorMessage}</Text>
        </View>
      )}

      {/* 2. Mode Selector Pills */}
      <View className="flex-row rounded-xl bg-stone-100 p-1 border border-stone-200">
        <Pressable
          onPress={() => setActiveTab('upload')}
          className={`flex-1 min-h-[40px] flex-row items-center justify-center rounded-lg ${
            activeTab === 'upload' ? 'bg-white shadow-xs' : ''
          }`}
        >
          <UploadCloud size={16} color={activeTab === 'upload' ? '#800020' : '#78716c'} />
          <Text
            className={`ml-1.5 text-sm font-bold ${
              activeTab === 'upload' ? 'text-[#800020]' : 'text-stone-600'
            }`}
          >
            Upload File
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('url')}
          className={`flex-1 min-h-[40px] flex-row items-center justify-center rounded-lg ${
            activeTab === 'url' ? 'bg-white shadow-xs' : ''
          }`}
        >
          <Link size={16} color={activeTab === 'url' ? '#800020' : '#78716c'} />
          <Text
            className={`ml-1.5 text-sm font-bold ${
              activeTab === 'url' ? 'text-[#800020]' : 'text-stone-600'
            }`}
          >
            URL &amp; Presets
          </Text>
        </Pressable>
      </View>

      {/* 3. TAB 1: FILE UPLOAD DROPZONE */}
      {activeTab === 'upload' && (
        <View
          {...({
            onDragOver: (e: any) => {
              e.preventDefault();
              setIsDragOver(true);
            },
            onDragLeave: () => setIsDragOver(false),
            onDrop: (e: any) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer?.files?.[0];
              if (file) {
                handleFileSelection(file);
              }
            },
          } as any)}
        >
          <Pressable
            onPress={triggerFileBrowser}
            disabled={isProcessing}
            className={`min-h-[110px] w-full items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all ${
              isDragOver
                ? 'border-[#800020] bg-rose-50/50'
                : 'border-stone-300 bg-stone-50 active:bg-stone-100 hover:border-stone-400'
            }`}
          >
            <UploadCloud size={28} color={isDragOver ? '#800020' : '#78716c'} />
            <Text className="mt-2 text-sm font-bold text-stone-800">
              {isProcessing ? 'Optimizing image...' : 'Click to Browse or Drag & Drop'}
            </Text>
            <Text className="mt-0.5 text-xs text-stone-500">
              Accepts high-res photos up to 8 MB (Auto-compressed to ~30KB WebP)
            </Text>

            {stagedImage && (
              <View className="mt-2 flex-row items-center space-x-1.5 rounded-md bg-emerald-100/80 px-2 py-0.5 border border-emerald-200">
                <FileImage size={13} color="#065f46" />
                <Text className="text-xs text-emerald-900 font-semibold">
                  {stagedImage.width}×{stagedImage.height}px •{' '}
                  {formatFileSize(stagedImage.sizeBytes)} WebP
                  {stagedImage.compressionRatioPercent > 0 &&
                    ` (-${stagedImage.compressionRatioPercent}% saved)`}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* 4. TAB 2: IMAGE URL & PRESETS */}
      {activeTab === 'url' && (
        <View className="space-y-3">
          <AdminInput
            label="Image URL"
            value={urlValue}
            onChangeText={(txt) => {
              setImageLoadError(false);
              setErrorMessage(null);
              onUrlValueChange(txt);
              if (stagedImage) {
                onStagedImageChange(null);
              }
            }}
            placeholder="https://images.unsplash.com/..."
          />

          <View>
            <View className="flex-row items-center mb-1.5">
              <Sparkles size={14} color="#800020" />
              <Text className="ml-1 text-xs font-bold text-stone-600 uppercase tracking-wide">
                Curated Jazz Bar Presets
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
              <View className="flex-row space-x-2">
                {IMAGE_PRESETS.map((preset) => {
                  const isSelected = urlValue === preset.url;
                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() => {
                        setImageLoadError(false);
                        setErrorMessage(null);
                        onUrlValueChange(preset.url);
                        if (stagedImage) {
                          onStagedImageChange(null);
                        }
                      }}
                      className={`h-16 w-28 overflow-hidden rounded-xl border relative ${
                        isSelected
                          ? 'border-[#800020] ring-2 ring-[#800020]/20'
                          : 'border-stone-200'
                      }`}
                    >
                      <Image
                        source={{ uri: preset.url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      <View className="absolute inset-0 bg-stone-900/40 p-1 justify-end">
                        <Text className="text-[10px] font-bold text-white" numberOfLines={1}>
                          {preset.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <View className="absolute top-1 right-1 h-4 w-4 items-center justify-center rounded-full bg-[#800020]">
                          <Check size={10} color="#ffffff" strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};
