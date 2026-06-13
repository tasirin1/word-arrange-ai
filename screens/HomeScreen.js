import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getApiKey, saveApiKey, getStats, getSettings, saveSetting, clearAllData } from '../services/storageService';

const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner', emoji: '🌱', color: '#34C759', description: 'Simple sentences (5-8 words)' },
  { id: 'intermediate', label: 'Intermediate', emoji: '📚', color: '#FF9500', description: 'Complex sentences (8-14 words)' },
  { id: 'advanced', label: 'Advanced', emoji: '🧠', color: '#FF3B30', description: 'Advanced vocabulary & structure' },
];

function StatCard({ label, value, emoji }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [showSettings, setShowSettings] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const loadData = useCallback(async () => {
    const key = await getApiKey();
    setApiKeyInput(key);
    const s = await getStats();
    setStats(s);
    const settings = await getSettings();
    setSelectedDifficulty(settings.difficulty || 'beginner');
  }, []);

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [loadData, fadeAnim]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleSaveApiKey = async () => {
    await saveApiKey(apiKeyInput.trim());
    Alert.alert('Saved', 'API key has been saved successfully.');
  };

  const handleStartGame = () => {
    navigation.navigate('Game', { difficulty: selectedDifficulty });
  };

  const handleDifficultySelect = async (id) => {
    setSelectedDifficulty(id);
    await saveSetting('difficulty', id);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove your API key and progress. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            loadData();
          },
        },
      ]
    );
  };

  const getGradientColors = () => {
    switch (selectedDifficulty) {
      case 'intermediate': return ['#FFF3E0', '#FFE0B2'];
      case 'advanced': return ['#FFEBEE', '#FFCDD2'];
      default: return ['#E3F2FD', '#BBDEFB'];
    }
  };

  const [bgColor1, bgColor2] = getGradientColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor1 }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.title}>🧩 Word Arrange</Text>
          <Text style={styles.subtitle}>Practice English by arranging words!</Text>
        </Animated.View>

        {stats && (
          <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
            <StatCard emoji="🎮" label="Played" value={stats.gamesPlayed} />
            <StatCard emoji="✅" label="Correct" value={stats.correctAnswers} />
            <StatCard emoji="🔥" label="Streak" value={stats.currentStreak} />
            <StatCard emoji="⭐" label="Score" value={stats.totalScore} />
          </Animated.View>
        )}

        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>📖 Select Difficulty</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((diff) => (
              <TouchableOpacity
                key={diff.id}
                style={[
                  styles.difficultyCard,
                  { borderColor: diff.color },
                  selectedDifficulty === diff.id && { backgroundColor: diff.color + '20', borderWidth: 3 },
                ]}
                onPress={() => handleDifficultySelect(diff.id)}
              >
                <Text style={styles.diffEmoji}>{diff.emoji}</Text>
                <Text style={[styles.diffLabel, { color: diff.color }]}>{diff.label}</Text>
                <Text style={styles.diffDesc}>{diff.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: DIFFICULTIES.find(d => d.id === selectedDifficulty)?.color || '#4A90D9' }]}
          onPress={handleStartGame}
        >
          <Text style={styles.startButtonText}>▶ Start Practice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsToggle}
          onPress={() => setShowSettings(!showSettings)}
        >
          <Text style={styles.settingsToggleText}>
            {showSettings ? '▼ Hide Settings' : '▶ API Settings'}
          </Text>
        </TouchableOpacity>

        {showSettings && (
          <Animated.View style={styles.settingsPanel}>
            <Text style={styles.settingsTitle}>⚙️ Settings</Text>
            
            <Text style={styles.inputLabel}>OpenAI API Key (optional)</Text>
            <Text style={styles.inputHint}>
              Without a key, built-in sentences are used. Get a key at platform.openai.com
            </Text>
            <View style={styles.apiKeyRow}>
              <TextInput
                style={styles.apiKeyInput}
                placeholder="sk-..."
                placeholderTextColor="#999"
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <Text>{showApiKey ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiKey}>
              <Text style={styles.saveBtnText}>Save API Key</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearBtn} onPress={handleClearData}>
              <Text style={styles.clearBtnText}>🗑️ Clear All Data</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statEmoji: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  diffEmoji: {
    fontSize: 28,
  },
  diffLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  diffDesc: {
    fontSize: 10,
    color: '#999',
    marginTop: 3,
    textAlign: 'center',
  },
  startButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 16,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsToggle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsToggleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsPanel: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  apiKeyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f8f8',
  },
  toggleBtn: {
    padding: 10,
    marginLeft: 8,
  },
  saveBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  clearBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  clearBtnText: {
    color: '#FF3B30',
    fontSize: 14,
  },
});
