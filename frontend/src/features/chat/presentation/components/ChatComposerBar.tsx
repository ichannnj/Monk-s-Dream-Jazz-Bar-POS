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
        <View className="border-t border-stone-100 px-3 sm:px-4 py-2 bg-[#EFECE6]">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row items-center gap-1.5">
              {quickPresets.map((preset, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => onSend(preset)}
                  className="bg-white border border-[#E2DED6] px-4 py-2 rounded-full active:bg-stone-100 min-h-[48px] justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={preset}
                >
                  <Text className="text-base font-medium text-[#1A1617]">{preset}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Message Input Bar */}
      <View className="flex-row items-center px-3 sm:px-4 py-2.5 border-t border-stone-100 gap-2 bg-white">
        <View className="flex-1 min-h-[46px] bg-[#EFECE6] rounded-full px-3.5 py-1.5 justify-center border border-stone-200/80 focus-within:border-stone-400">
          <TextInput
            ref={inputRef}
            autoFocus={!isMobile}
            blurOnSubmit={false}
            className="text-base text-stone-900 w-full"
            placeholder={`Message ${conversationTitle}…`}
            placeholderTextColor="#a8a29e"
            value={inputText}
            onChangeText={onChangeText}
            onSubmitEditing={() => onSend()}
            returnKeyType="send"
            style={
              {
                fontSize: 16, // Invariant: Must be >= 16px to prevent iOS Safari auto-zoom
                outlineStyle: 'none',
                outlineWidth: 0,
                outlineColor: 'transparent',
              } as any
            }
          />
        </View>

        <Pressable
          onPress={() => onSend()}
          className="w-12 h-12 rounded-full bg-[#810021] items-center justify-center active:opacity-85 shrink-0"
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <SendHorizontal size={19} color="#F7F5F2" strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
};
