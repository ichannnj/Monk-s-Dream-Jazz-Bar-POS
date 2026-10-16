import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';

interface JazzLogoProps {
  size?: number;
  color?: string;
}

export const JazzLogo: React.FC<JazzLogoProps> = ({
  size = 80,
  color = '#641b2a',
}) => {
  // Original aspect ratio is approx 90:80 (w:h)
  const width = size;
  const height = (size * 80) / 90;

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 100 90" fill="none">
        <G fill={color}>
          {/* Left: Piano Keyboard Frame & Keys */}
          {/* Outer Piano border */}
          <Rect x="4" y="6" width="36" height="78" rx="4" stroke={color} strokeWidth="3.5" fill="none" />
          
          {/* Horizontal white key dividing lines */}
          <Rect x="6" y="21" width="32" height="2.5" fill={color} />
          <Rect x="6" y="37" width="32" height="2.5" fill={color} />
          <Rect x="6" y="53" width="32" height="2.5" fill={color} />
          <Rect x="6" y="69" width="32" height="2.5" fill={color} />

          {/* Black Keys */}
          <Rect x="6" y="14" width="16" height="5" rx="1.5" fill={color} />
          <Rect x="6" y="29" width="16" height="5" rx="1.5" fill={color} />
          <Rect x="6" y="45" width="16" height="5" rx="1.5" fill={color} />
          <Rect x="6" y="61" width="16" height="5" rx="1.5" fill={color} />
          <Rect x="6" y="74" width="16" height="5" rx="1.5" fill={color} />

          {/* Center-Right: Horn / Trumpet Valves & Bell Silhouette */}
          {/* Vertical main tube */}
          <Path
            d="M48 10 C48 8, 52 8, 52 10 L52 80 C52 82, 48 82, 48 80 Z"
            fill={color}
          />
          {/* Trumpet Valve Pistons (3 horizontal piston caps) */}
          <Rect x="44" y="26" width="18" height="4" rx="2" fill={color} />
          <Rect x="44" y="36" width="18" height="4" rx="2" fill={color} />
          <Rect x="44" y="46" width="18" height="4" rx="2" fill={color} />

          {/* Trumpet Bell & Flare / Cocktail silhouette on the right */}
          <Path
            d="M52 18 C64 12, 78 10, 84 14 C86 20, 86 38, 80 50 C74 62, 60 74, 52 78 L52 68 C58 64, 68 54, 72 44 C76 34, 76 22, 68 22 C62 22, 56 24, 52 26 Z"
            fill={color}
          />

          {/* Trumpet Bell Base flare */}
          <Path
            d="M52 70 L60 84 L44 84 Z"
            fill={color}
          />
        </G>
      </Svg>
    </View>
  );
};
