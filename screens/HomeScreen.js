import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  getApiKey, saveApiKey, getStats, getSettings, saveSetting,
  clearAllData, getWeaknessProfile, getWeaknessCategories,
  getProblemWords, getMistakeRecords, saveAIAnalysis,
  clearMistakeRecords
} from '../services/storageService';
import { compileWeaknessProfile } from '../services/aiService';

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

function AccuracyBar({ label, accuracy, total }) {
  const pct = Math.round(accuracy * 100);
  const barColor = pct >= 80 ? '#34C759' : pct >= 50 ? '#FF9500' : '#FF3B30';
  return (
    <View style={styles.accBarRow}>
      <View style={styles.accBarLabel}>
        <Text style={styles.accBarText}>{label}</Text>
        <Text style={styles.accBarPct}>{pct}%</Text>
      </View>
      <View style={styles.accBarBg}>
        <View style={[styles.accBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.accBarTotal}>{total}x</Text>
    </View>
  );
}

function WeaknessAnalysisCard({ analysis }) {
  if (!analysis || !analysis.categories || analysis.categories.length === 0) return null;

  const labelMap = {
    wordOrder: '📋 Word Order',
    subjectVerbAgreement: '🔗 Subject-Verb',
    articleUsage: '📌 Article',
    prepositionUsage: '📍 Preposition',
    tenseUsage: '⏰ Tense',
    conjunctionUsage: '🔀 Conjunction',
    adverbPlacement: '⚡ Adverb',
    adjectiveOrder: '🎨 Adjective',
    negation: '🚫 Negation',
    pronounUsage: '👤 Pronoun',
  };

  return (
    <View style={styles.weaknessAnalysisCard}>
      <Text style={styles.weaknessAnalysisTitle}>🧠 AI Analysis</Text>
      {analysis.recommendation && (
        <Text style={styles.weaknessRecommendation}>{analysis.recommendation}</Text>
      )}
      <View style={styles.weaknessAnalysisTags}>
        {analysis.categories.slice(0, 4).map(cat => (
          <View key={cat} style={styles.weaknessTag}>
            <Text style={styles.weaknessTagText}>{labelMap[cat] || cat}</Text>
          </View>
        ))}
      </View>
      {analysis.problemWords && analysis.problemWords.length > 0 && (
        <Text style={styles.weaknessWords}>
          Focus on: {analysis.problemWords.slice(0, 4).map(w => `"${w}"`).join(', ')}
        </Text>
      )}
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [showSettings, setShowSettings] = useState(false);
  const [weaknessCategories, setWeaknessCategories] = useState([]);
  const [problemWords, setProblemWords] = useState([]);
  const [weaknessProfile, setWeaknessProfile] = useState(null);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const weaknessAnim = useState(new Animated.Value(0))[0];

  const loadData = useCallback(async () => {
    const key = await getApiKey();
    setApiKeyInput(key);
    const s = await getStats();
    setStats(s);
    const settings = await getSettings();
    setSelectedDifficulty(settings.difficulty || 'beginner');

    // Load weakness data
    const cats = await getWeaknessCategories(4);
    setWeaknessCategories(cats);
    const words = await getProblemWords(5);
    setProblemWords(words);
    const profile = await getWeaknessProfile();
    setWeaknessProfile(profile);
    const mistakes = await getMistakeRecords(1);
    setMistakeCount(profile.totalMistakes || 0);
  }, []);

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    Animated.timing(weaknessAnim, {
      toValue: 1,
      duration: 800,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [loadData, fadeAnim, weaknessAnim]);

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
      'This will remove your API key, progress, and weakness profile. Are you sure?',
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

  const handleAnalyzeWeakness = async () => {
    const key = await getApiKey();
    if (!key) {
      Alert.alert('API Key Needed', 'Add an OpenAI API key in Settings to enable AI weakness analysis.');
      return;
    }

    const mistakes = await getMistakeRecords(20);
    if (mistakes.length < 3) {
      Alert.alert('Not Enough Data', 'Play at least 3 games and make some mistakes first!');
      return;
    }

    setAnalyzing(true);
    const analysis = await compileWeaknessProfile(mistakes, key);
    if (analysis) {
      await saveAIAnalysis(JSON.stringify(analysis));
      // Update the weakness profile with the analysis
      if (analysis.recommendation) {
        Alert.alert('📊 Analysis Complete', analysis.recommendation);
      }
    }
    setAnalyzing(false);
    loadData();
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
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.title}>🧩 Word Arrange</Text>
          <Text style={styles.subtitle}>Practice English by arranging words!</Text>
        </Animated.View>

        {/* Stats */}
        {stats && (
          <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
            <StatCard emoji="🎮" label="Played" value={stats.gamesPlayed} />
            <StatCard emoji="✅" label="Correct" value={stats.correctAnswers} />
            <StatCard emoji="🔥" label="Streak" value={stats.currentStreak} />
            <StatCard emoji="⭐" label="Score" value={stats.totalScore} />
          </Animated.View>
        )}

        {/* Weakness Dashboard */}
        {mistakeCount > 0 && (
          <Animated.View
            style={[styles.weaknessSection, {
              opacity: weaknessAnim,
              transform: [{
                translateY: weaknessAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            }]}
          >
            <View style={styles.weaknessHeader}>
              <Text style={styles.sectionTitle}>🎯 Your Weak Areas</Text>
              <Text style={styles.weaknessBadge}>{mistakeCount} mistakes</Text>
            </View>

            {/* AI Analysis (if available) */}
            {weaknessProfile?.aiAnalysis && (() => {
              try {
                const analysis = typeof weaknessProfile.aiAnalysis === 'string'
                  ? JSON.parse(weaknessProfile.aiAnalysis)
                  : weaknessProfile.aiAnalysis;
                return <WeaknessAnalysisCard analysis={analysis} />;
              } catch {
                return null;
              }
            })()}

            {/* Weak Categories */}
            {weaknessCategories.length > 0 && (
              <View style={styles.weaknessCard}>
                <Text style={styles.weaknessCardTitle}>📉 Grammar Patterns</Text>
                {weaknessCategories.map(cat => (
                  <AccuracyBar
                    key={cat.key}
                    label={cat.label}
                    accuracy={cat.accuracy}
                    total={cat.total}
                  />
                ))}
              </View>
            )}

            {/* Problem Words */}
            {problemWords.length > 0 && (
              <View style={styles.weaknessCard}>
                <Text style={styles.weaknessCardTitle}>🔤 Tricky Words</Text>
                <View style={styles.problemWordsRow}>
                  {problemWords.map(pw => (
                    <View
                      key={pw.word}
                      style={[
                        styles.problemWordTag,
                        {
                          backgroundColor:
                            pw.accuracy < 0.5 ? '#FFEBEE' :
                            pw.accuracy < 0.75 ? '#FFF8E1' : '#E8F5E9',
                        },
                      ]}
                    >
                      <Text style={styles.problemWordText}>"{pw.word}"</Text>
                      <Text style={styles.problemWordPct}>{Math.round(pw.accuracy * 100)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Analyze Button */}
            {mistakeCount >= 3 && (
              <TouchableOpacity
                style={styles.analyzeBtn}
                onPress={handleAnalyzeWeakness}
                disabled={analyzing}
              >
                <Text style={styles.analyzeBtnText}>
                  {analyzing ? '🔍 Analyzing...' : '🧠 AI Deep Analysis'}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Start practicing prompt when no mistakes */}
        {mistakeCount === 0 && (
          <Animated.View style={[styles.emptyWeakness, { opacity: fadeAnim }]}>
            <Text style={styles.emptyWeaknessEmoji}>🧘</Text>
            <Text style={styles.emptyWeaknessText}>
              Play some games first! AI will analyze your mistakes and show weak areas here.
            </Text>
          </Animated.View>
        )}

        {/* Difficulty Selection */}
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

        {/* Start Button */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: DIFFICULTIES.find(d => d.id === selectedDifficulty)?.color || '#4A90D9' }]}
            onPress={handleStartGame}
          >
            <Text style={styles.startButtonText}>▶ Start Practice</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Settings Toggle */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            style={styles.settingsToggle}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Text style={styles.settingsToggleText}>
              {showSettings ? '▲ Hide Settings' : '▼ Settings'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Settings Panel */}
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

            {mistakeCount > 0 && (
              <TouchableOpacity
                style={styles.clearWeaknessBtn}
                onPress={() => {
                  Alert.alert(
                    'Clear Weakness Data',
                    'Remove all saved weakness analysis and mistakes?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: async () => {
                          await clearMistakeRecords();
                          loadData();
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.clearWeaknessBtnText}>🗑️ Clear Weakness Data</Text>
              </TouchableOpacity>
            )}

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
    marginBottom: 16,
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
  // Weakness Section
  weaknessSection: {
    marginBottom: 20,
  },
  weaknessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weaknessBadge: {
    backgroundColor: '#FFE0B2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '700',
    color: '#E65100',
    overflow: 'hidden',
  },
  weaknessCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  weaknessCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
  },
  // Accuracy Bar
  accBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accBarLabel: {
    width: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accBarText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  accBarPct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  accBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  accBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  accBarTotal: {
    fontSize: 11,
    color: '#999',
    width: 24,
    textAlign: 'right',
  },
  // Problem Words
  problemWordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  problemWordTag: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  problemWordText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  problemWordPct: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginLeft: 6,
  },
  // AI Analysis
  weaknessAnalysisCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  weaknessAnalysisTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6A1B9A',
    marginBottom: 6,
  },
  weaknessRecommendation: {
    fontSize: 14,
    color: '#4A148C',
    marginBottom: 8,
    lineHeight: 20,
    fontWeight: '500',
  },
  weaknessAnalysisTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  weaknessTag: {
    backgroundColor: '#E1BEE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  weaknessTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6A1B9A',
  },
  weaknessWords: {
    fontSize: 13,
    color: '#8D6E63',
    fontStyle: 'italic',
  },
  // Analyze button
  analyzeBtn: {
    backgroundColor: '#7B1FA2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    elevation: 2,
  },
  analyzeBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  // Empty state
  emptyWeakness: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  emptyWeaknessEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyWeaknessText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Difficulty
  section: {
    marginBottom: 16,
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
  clearWeaknessBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  clearWeaknessBtnText: {
    color: '#FF9800',
    fontSize: 13,
    fontWeight: '600',
  },
  clearBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  clearBtnText: {
    color: '#FF3B30',
    fontSize: 14,
  },
});
