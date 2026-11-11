import React from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { SendHorizontal } from 'lucide-react-native';

export interface ChatComposerBarProps {
  inputRef: React.RefObject<TextInput | null>;
  inputText: string;
  quickPresets: string[];
  conversationTitle: string;
  isMobile?: boolean;
  onChangeText: (text: string) => void;
  onSend: (text?: string) => void;
}

export const ChatComposerBar: React.FC<ChatComposerBarProps> = ({
  inputRef,
  inputText,
  quickPresets,
  conversationTitle,
  isMobile = false,
  onChangeText,
  onSend,
}) => {
  return (
    <View className="flex-col bg-white">
      {/* Quick-tap Presets */}
      {quickPresets.length > 0 && (
        <View className="border-t border-stone-100 px-3 sm:px-4 py-2 bg-[#FAF8F5]">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row items-center gap-1.5">
              {quickPresets.map((preset, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => onSend(preset)}
                  className="bg-white border border-stone-200/80 px-3 py-1.5 rounded-full active:bg-stone-100 min-h-[36px] justify-center shadow-2xs"
                  accessibilityRole="button"
                  accessibilityLabel={preset}
                >
                  <Text className="text-xs font-medium text-stone-700">{preset}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Message Input Bar */}
      <View className="flex-row items-center px-3 sm:px-4 py-2.5 border-t border-stone-100 gap-2 bg-white">
        <View className="flex-1 min-h-[42px] bg-[#FAF8F5] rounded-full px-3.5 py-1.5 justify-center border border-stone-200/80 focus-within:border-stone-400">
          <TextInput
            ref={inputRef}
            autoFocus={!isMobile}
            blurOnSubmit={false}
            className="text-sm text-stone-900 w-full"
            placeholder={`Message ${conversationTitle}…`}
            placeholderTextColor="#a8a29e"
            value={inputText}
            onChangeText={onChangeText}
            onSubmitEditing={() => onSend()}
            returnKeyType="send"
            style={
              {
                outlineStyle: 'none',
                outlineWidth: 0,
                outlineColor: 'transparent',
              } as any
            }
          />
        </View>

        <Pressable
          onPress={() => onSend()}
          className="w-10 h-10 rounded-full bg-[#810021] items-center justify-center active:opacity-90 shadow-2xs shrink-0"
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <SendHorizontal size={17} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
};
