import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Link, Sparkles, Check, X } from 'lucide-react-native';
import { IMAGE_PRESETS, ImagePreset } from './presets';
import { styles } from './AdminItemImageModal.styles';

export interface AdminItemPresetsTabProps {
  imageUrl: string;
  onSelectPreset: (url: string) => void;
  onClearImage: () => void;
  onChangeUrl: (url: string) => void;
}

export const AdminItemPresetsTab: React.FC<AdminItemPresetsTabProps> = ({
  imageUrl,
  onSelectPreset,
  onClearImage,
  onChangeUrl,
}) => {
  return (
    <>
      <View style={styles.section}>
        <View style={styles.inputLabelRow}>
          <Link size={14} color="#4b5563" />
          <Text style={styles.sectionLabel}>PHOTO URL</Text>
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            value={imageUrl}
            onChangeText={onChangeUrl}
            placeholder="https://images.unsplash.com/..."
            placeholderTextColor="#9ca3af"
            style={styles.urlInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {imageUrl.length > 0 && (
            <Pressable onPress={onClearImage} style={styles.clearBtn}>
              <X size={15} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.inputLabelRow}>
          <Sparkles size={14} color="#832238" />
          <Text style={styles.sectionLabel}>CURATED PRESETS</Text>
        </View>

        <View style={styles.presetsGrid}>
          {IMAGE_PRESETS.map((preset: ImagePreset) => {
            const isSelected = imageUrl === preset.url;
            return (
              <Pressable
                key={preset.label}
                onPress={() => onSelectPreset(preset.url)}
                style={[styles.presetCard, isSelected && styles.presetCardSelected]}
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
    </>
  );
};
