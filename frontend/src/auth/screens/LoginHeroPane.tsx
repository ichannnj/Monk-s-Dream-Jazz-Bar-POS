import React from 'react';
import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const JAZZ_HERO_IMAGE = require('../../../assets/images/jazz-club-stage.jpg');

interface LoginHeroPaneProps {
  isTablet: boolean;
}

export const LoginHeroPane: React.FC<LoginHeroPaneProps> = ({ isTablet }) => {
  return (
    <View
      className={`relative overflow-hidden bg-wine-950 ${
        isTablet ? 'w-1/2 min-h-[580px]' : 'w-full h-[380px]'
      }`}
    >
      {/* Background Jazz Musician Stage Image */}
      <ExpoImage
        source={JAZZ_HERO_IMAGE}
        className="absolute inset-0"
        contentFit="cover"
        transition={400}
        priority="high"
      />

      {/* Deep Wine Duotone Vignette Overlays */}
      <View className="absolute inset-0 bg-[#1c0a10]/45" />
      <View className="absolute inset-0 bg-[#100509]/65" />

      {/* Left Content Column */}
      <View className="flex-1 p-9 justify-between z-10">
        {/* Brand Title with Raconteur NF Typography */}
        <View className="mt-2.5">
          <Text className="text-white text-5xl font-brand leading-[48px] tracking-wide">
            Monk's
          </Text>
          <Text className="text-white text-5xl font-brand leading-[48px] tracking-wide">Dream</Text>
          <Text className="text-white text-5xl font-brand leading-[48px] tracking-wide">
            Jazz Bar
          </Text>
          {/* Rose accent dash */}
          <View className="w-11 h-1 bg-wine-400 rounded-full mt-3" />
        </View>

        {/* Bottom Club Narrative & Secure Portal Dot */}
        <View className="mb-1.5">
          <Text className="text-white text-base font-bold font-sans mb-2">
            Welcome back to the club.
          </Text>
          <Text className="text-wine-200 text-xs leading-5 font-sans">
            Clock in, track your shift, and get back to what you do best. Built for every member of
            the team.
          </Text>

          {/* Thin Divider */}
          <View className="h-[1px] bg-white/10 my-4" />

          {/* Red status indicator */}
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-rose-600" />
            <Text className="text-wine-300 text-xs font-medium">
              Secure staff portal · Shift attendance
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
