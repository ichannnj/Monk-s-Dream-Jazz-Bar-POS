import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { styles } from '../screens/LoginScreen.styles';

const JAZZ_HERO_IMAGE = require('../../../../../assets/images/jazz-club-stage.jpg');

interface LoginHeroPaneProps {
  isTablet: boolean;
}

export const LoginHeroPane: React.FC<LoginHeroPaneProps> = ({ isTablet }) => {
  return (
    <View style={[styles.leftPane, isTablet ? styles.leftPaneTablet : styles.leftPaneMobile]}>
      <ExpoImage
        source={JAZZ_HERO_IMAGE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
        priority="high"
      />
      <View style={styles.imageOverlayTop} />
      <View style={styles.imageOverlayBottom} />

      <View style={[styles.leftContent, !isTablet && styles.leftContentMobile]}>
        <View style={[styles.brandTitleBlock, !isTablet && styles.brandTitleBlockMobile]}>
          {isTablet ? (
            <>
              <Text style={styles.heroTitleLine}>Monk's</Text>
              <Text style={styles.heroTitleLine}>Dream</Text>
              <Text style={styles.heroTitleLine}>Jazz Bar</Text>
              <View style={styles.heroAccentDash} />
            </>
          ) : (
            <>
              <Text style={styles.heroTitleMobile}>Monk's Dream Jazz Bar</Text>
              <View style={styles.heroAccentDashMobile} />
            </>
          )}
        </View>

        {isTablet ? (
          <View style={styles.leftBottomBlock}>
            <Text style={styles.welcomeHeading}>Welcome back to the club.</Text>
            <Text style={styles.welcomeDescription}>
              Clock in, track your shift, and get back to what you do best. Built for every member
              of the team.
            </Text>
            <View style={styles.heroDivider} />
            <View style={styles.portalBadgeRow}>
              <View style={styles.redStatusDot} />
              <Text style={styles.portalBadgeText}>Secure staff portal · Shift attendance</Text>
            </View>
          </View>
        ) : (
          <View style={styles.portalBadgeRow}>
            <View style={styles.redStatusDot} />
            <Text style={styles.portalBadgeTextMobile}>Secure Staff Portal</Text>
          </View>
        )}
      </View>
    </View>
  );
};
