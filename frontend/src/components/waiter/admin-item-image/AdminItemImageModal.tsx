import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import {
  X,
  Camera,
  Check,
  Link,
  Sparkles,
  UtensilsCrossed,
  Image as ImageIcon,
} from "lucide-react-native";
import { MenuItem } from "../../../mockData";
import { IMAGE_PRESETS } from "./presets";
import { styles } from "./AdminItemImageModal.styles";

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
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasImageLoadError, setHasImageLoadError] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      setImageUrl(item.imageUrl || '');
      setHasImageLoadError(false);
    }
  }, [item, visible]);

  if (!item) return null;

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const success = await onSaveImage(item.id, imageUrl.trim());
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

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
                  {item.name} (${item.price.toFixed(2)})
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
              <Text style={styles.sectionLabel}>LIVE PREVIEW</Text>
              <View style={styles.previewContainer}>
                {imageUrl && !hasImageLoadError ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.previewImage}
                    contentFit="cover"
                    transition={200}
                    onError={() => setHasImageLoadError(true)}
                  />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <UtensilsCrossed size={36} color="#9ca3af" />
                    <Text style={styles.placeholderText}>
                      {hasImageLoadError ? 'Failed to load image URL' : 'No photo specified'}
                    </Text>
                  </View>
                )}

                <View style={styles.floatingTag}>
                  <Text style={styles.floatingTagText}>
                    {item.stationTarget === 'bar' ? '☕ BAR' : '🍳 KITCHEN'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Direct Image URL Input */}
            <View style={styles.section}>
              <View style={styles.inputLabelRow}>
                <Link size={14} color="#4b5563" />
                <Text style={styles.sectionLabel}>PHOTO URL</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={imageUrl}
                  onChangeText={(txt) => {
                    setImageUrl(txt);
                    setHasImageLoadError(false);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#9ca3af"
                  style={styles.urlInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {imageUrl.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setImageUrl('');
                      setHasImageLoadError(false);
                    }}
                    style={styles.clearBtn}
                  >
                    <X size={15} color="#9ca3af" />
                  </Pressable>
                )}
              </View>
              <Text style={styles.inputHint}>
                Paste any high-resolution HTTPS image address or select a curated preset below.
              </Text>
            </View>

            {/* Quick Photo Presets */}
            <View style={styles.section}>
              <View style={styles.inputLabelRow}>
                <Sparkles size={14} color="#832238" />
                <Text style={styles.sectionLabel}>CURATED PRESETS</Text>
              </View>

              <View style={styles.presetsGrid}>
                {IMAGE_PRESETS.map((preset) => {
                  const isSelected = imageUrl === preset.url;
                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() => {
                        setImageUrl(preset.url);
                        setHasImageLoadError(false);
                      }}
                      style={[
                        styles.presetCard,
                        isSelected && styles.presetCardSelected,
                      ]}
                    >
                      <Image
                        source={{ uri: preset.url }}
                        style={styles.presetThumb}
                        contentFit="cover"
                        transition={150}
                      />
                      <View style={styles.presetInfo}>
                        <Text style={styles.presetName} numberOfLines={1}>
                          {preset.label}
                        </Text>
                        <Text style={styles.presetCategory}>{preset.category}</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Check size={12} color="#ffffff" strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
              style={[
                styles.saveBtn,
                isSaving && styles.saveBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save photo to database"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={16} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.saveBtnText}>Save to Menu & Database</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

