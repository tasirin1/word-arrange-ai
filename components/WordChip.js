import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function WordChip({ word, onPress, selected = false, color = '#4A90D9', size = 'medium' }) {
  const isSmall = size === 'small';
  
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { 
          backgroundColor: selected ? color : 'white',
          borderColor: color,
          borderWidth: 2,
        },
        selected && styles.selected,
        isSmall && styles.small
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.text,
        { color: selected ? 'white' : color },
        isSmall && styles.smallText
      ]}>
        {word}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    marginVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  selected: {
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 13,
  },
});
