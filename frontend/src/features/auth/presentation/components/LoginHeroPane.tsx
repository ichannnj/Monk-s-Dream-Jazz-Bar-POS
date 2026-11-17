import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { styles } from '../screens/LoginScreen.styles';

const COCKTAIL_HERO_IMAGE = require('../../../../../assets/images/cocktail-neon-sign.jpg');
const MONKS_DREAM_LOGO_WHITE = require('../../../../../assets/monks-dream-logo-lockup-white.png');

interface LoginHeroPaneProps {
  isTablet: boolean;
}

export const LoginHeroPane: React.FC<LoginHeroPaneProps> = ({ isTablet }) => {
  return (
    <View style={[styles.heroPane, isTablet ? styles.heroPaneTablet : styles.heroPaneMobile]}>
      {/* Cocktail with neon sign backdrop adding vibrant bar aesthetic */}
      <ExpoImage
        source={COCKTAIL_HERO_IMAGE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
        priority="high"
        accessibilityLabel="Monk's Dream Signature Cocktail with Neon Sign"
      />
      <View style={styles.heroImageOverlay} />

      {/* Clean centered logo lockup without bounding border */}
      <View style={[styles.heroContent, !isTablet && styles.heroContentMobile]}>
        <View style={[styles.heroLogoBadge, !isTablet && styles.heroLogoBadgeMobile]}>
          <ExpoImage
            source={MONKS_DREAM_LOGO_WHITE}
            style={isTablet ? styles.heroBrandLockup : styles.heroBrandLockupMobile}
            contentFit="contain"
            priority="high"
            accessibilityLabel="Monk's Dream logo"
          />
          {isTablet && (
            <Text style={styles.heroTagline}>Coffee. Food. Music and Conversations.</Text>
          )}
        </View>
      </View>
    </View>
  );
};
