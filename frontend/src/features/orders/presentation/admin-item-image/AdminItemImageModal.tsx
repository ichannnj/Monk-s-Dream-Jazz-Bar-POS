import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import {
  X,
  Camera,
  Check,
  UtensilsCrossed,
  UploadCloud,
  FileImage,
  AlertCircle,
} from 'lucide-react-native';
import { MenuItem } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { styles } from './AdminItemImageModal.styles';
import { useAdminItemImageController } from './useAdminItemImageController';
import { AdminItemPresetsTab } from './AdminItemPresetsTab';

export interface AdminItemImageModalProps {
  visible: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onSaveImage: (itemId: string, newImageUrl: string) => Promise<boolean>;
}

export const AdminItemImageModal: React.FC<AdminItemImageModalProps> = ({
  visible,
  item,
  onClose,
  onSaveImage,
}) => {
  const {
    imageUrl,
    setImageUrl,
    stagedImage,
    isSaving,
    hasImageLoadError,
    setHasImageLoadError,
    errorMessage,
    activeTab,
    setActiveTab,
    displayUri,
    triggerFileBrowser,
    handleSave,
    clearImage,
    selectPreset,
  } = useAdminItemImageController({
    visible,
    item,
    onClose,
    onSaveImage,
  });

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.cameraBadge}>
                <Camera size={18} color="#832238" strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Update Menu Photo</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {item.name} ({formatCurrency(item.price)})
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close image modal"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Live Preview Box */}
            <View style={styles.section}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text style={styles.sectionLabel}>LIVE PREVIEW</Text>
                {stagedImage && (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                    Staged WebP ({Math.round(stagedImage.sizeBytes / 1024)} KB)
                  </Text>
                )}
              </View>

              <View style={styles.previewContainer}>
                {displayUri && !hasImageLoadError ? (
                  <Image
                    source={{ uri: displayUri }}
                    style={styles.previewImage}
                    contentFit="cover"
                    transition={200}
                    onError={() => setHasImageLoadError(true)}
                  />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <UtensilsCrossed size={36} color="#9ca3af" />
                    <Text style={styles.placeholderText}>
                      {hasImageLoadError ? 'Failed to load image preview' : 'No photo specified'}
                    </Text>
                  </View>
                )}

                <View style={styles.floatingTag}>
                  <Text style={styles.floatingTagText}>
                    {item.stationTarget === 'bar' ? '☕ BAR' : '🍳 KITCHEN'}
                  </Text>
                </View>

                {displayUri ? (
                  <Pressable
                    onPress={clearImage}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      borderRadius: 20,
                      padding: 6,
                    }}
                  >
                    <X size={14} color="#ffffff" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Error Message */}
            {errorMessage && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fff1f2',
                  padding: 10,
                  borderRadius: 10,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#fecdd3',
                }}
              >
                <AlertCircle size={16} color="#e11d48" />
                <Text
                  style={{
                    color: '#be123c',
                    fontSize: 12,
                    fontWeight: '600',
                    marginLeft: 8,
                    flex: 1,
                  }}
                >
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Mode Switcher */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#f3f4f6',
                padding: 4,
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <Pressable
                onPress={() => setActiveTab('upload')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  backgroundColor: activeTab === 'upload' ? '#ffffff' : 'transparent',
                  borderRadius: 8,
                  shadowColor: '#000',
                  shadowOpacity: activeTab === 'upload' ? 0.05 : 0,
                  shadowRadius: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: activeTab === 'upload' ? '#832238' : '#6b7280',
                  }}
                >
                  Upload File
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('url')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  backgroundColor: activeTab === 'url' ? '#ffffff' : 'transparent',
                  borderRadius: 8,
                  shadowColor: '#000',
                  shadowOpacity: activeTab === 'url' ? 0.05 : 0,
                  shadowRadius: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: activeTab === 'url' ? '#832238' : '#6b7280',
                  }}
                >
                  URL &amp; Presets
                </Text>
              </Pressable>
            </View>

            {/* TAB 1: FILE UPLOAD */}
            {activeTab === 'upload' && (
              <View style={styles.section}>
                <Pressable
                  onPress={triggerFileBrowser}
                  style={{
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: '#d1d5db',
                    backgroundColor: '#fafaf9',
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UploadCloud size={28} color="#832238" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1917', marginTop: 8 }}>
                    Choose image from device
                  </Text>
                  <Text style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>
                    Accepts photos up to 8 MB (Auto-compressed to ~30KB WebP)
                  </Text>
                  {stagedImage && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 8,
                        backgroundColor: '#d1fae5',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#a7f3d0',
                      }}
                    >
                      <FileImage size={12} color="#065f46" />
                      <Text
                        style={{ fontSize: 11, fontWeight: '700', color: '#065f46', marginLeft: 4 }}
                      >
                        {stagedImage.width}×{stagedImage.height}px •{' '}
                        {Math.round(stagedImage.sizeBytes / 1024)} KB WebP
                        {stagedImage.compressionRatioPercent > 0 &&
                          ` (-${stagedImage.compressionRatioPercent}%)`}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}

            {/* TAB 2: Direct Image URL & Presets */}
            {activeTab === 'url' && (
              <AdminItemPresetsTab
                imageUrl={imageUrl}
                onSelectPreset={selectPreset}
                onClearImage={clearImage}
                onChangeUrl={(txt) => {
                  clearImage();
                  setImageUrl(txt);
                }}
              />
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.modalFooter}>
            <Pressable
              onPress={onClose}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel photo change"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Save photo to database"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={16} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.saveBtnText}>Save to Menu &amp; Database</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
