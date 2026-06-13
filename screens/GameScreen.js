import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Alert, ScrollView, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import WordChip from '../components/WordChip';
import {
  generateAdaptiveSentence, scrambleSentence, checkArrangement,
  getAIHint, calculateScore, analyzeMistake
} from '../services/aiService';
import {
  getApiKey, updateStats, saveMistakeRecord,
  updateWeaknessFromAnalysis, getWeaknessProfile
} from '../services/storageService';

const DIFFICULTY_CONFIG = {
  beginner: { color: '#34C759', label: 'Beginner', emoji: '🌱' },
  intermediate: { color: '#FF9500', label: 'Intermediate', emoji: '📚' },
  advanced: { color: '#FF3B30', label: 'Advanced', emoji: '🧠' },
};

export default function GameScreen({ route, navigation }) {
  const { difficulty } = route.params;
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.beginner;

  const [sentenceData, setSentenceData] = useState(null);
  const [availableWords, setAvailableWords] = useState([]);
  const [placedWords, setPlacedWords] = useState([]);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [hint, setHint] = useState(null);
  const [usedHint, setUsedHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [mistakeAnalysis, setMistakeAnalysis] = useState(null);
  const [weaknessInsight, setWeaknessInsight] = useState(null);
  const [currentSentence, setCurrentSentence] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const insightAnim = useRef(new Animated.Value(0)).current;

  const loadSentence = useCallback(async (focusWeakness = false) => {
    setLoading(true);
    setShowResult(false);
    setIsCorrect(null);
    setHint(null);
    setUsedHint(false);
    setAttempts(0);
    setScore(0);
    setShowConfetti(false);
    setPlacedWords([]);
    setMistakeAnalysis(null);
    setWeaknessInsight(null);

    const key = await getApiKey();
    setApiKey(key);

    let sentence;
    if (focusWeakness && key) {
      // Generate adaptive sentence targeting weak areas
      const profile = await getWeaknessProfile();
      sentence = await generateAdaptiveSentence(difficulty, key, profile);
    } else {
      sentence = await generateAdaptiveSentence(difficulty, key, { categories: {} });
    }

    const scrambled = scrambleSentence(sentence);
    setSentenceData(scrambled);
    setAvailableWords(scrambled.words);
    setCurrentSentence(sentence);

    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [difficulty]);

  useEffect(() => {
    loadSentence();
  }, [loadSentence]);

  const handleWordPress = (word, index) => {
    if (showResult) return;

    setPlacedWords(prev => [...prev, word]);
    setAvailableWords(prev => prev.filter((_, i) => i !== index));
    setIsCorrect(null);
    setHint(null);
    setMistakeAnalysis(null);
  };

  const handlePlacedWordPress = (word, index) => {
    if (showResult) return;

    setPlacedWords(prev => prev.filter((_, i) => i !== index));
    setAvailableWords(prev => [...prev, word]);
    setIsCorrect(null);
    setHint(null);
    setMistakeAnalysis(null);
  };

  const handleCheck = async () => {
    if (placedWords.length !== sentenceData.originalWords.length) {
      Alert.alert('Incomplete', 'Please arrange all the words first!');
      return;
    }

    setChecking(true);
    const correct = checkArrangement(placedWords, sentenceData.originalWords);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setIsCorrect(correct);

    if (correct) {
      const finalScore = calculateScore(sentenceData.originalWords, newAttempts, usedHint);
      setScore(finalScore);

      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();

      setShowConfetti(true);
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();

      await updateStats({
        correct: true,
        score: finalScore,
        attempts: newAttempts,
        difficulty: difficulty,
      });
    } else {
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      // Save mistake for weakness analysis
      const mistakeData = {
        sentence: sentenceData.original,
        userArrangement: placedWords,
        correctArrangement: sentenceData.originalWords,
        difficulty: difficulty,
      };
      await saveMistakeRecord(mistakeData);

      // Run AI analysis on the mistake
      const analysis = await analyzeMistake(
        sentenceData.original,
        placedWords,
        apiKey
      );
      if (analysis) {
        setMistakeAnalysis(analysis);
        // Update the weakness profile
        await updateWeaknessFromAnalysis(analysis);

        // Show insight panel with animation
        Animated.timing(insightAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }

      // AI hint (separate from analysis)
      if (apiKey && !hint) {
        const aiHint = await getAIHint(
          sentenceData.original,
          placedWords,
          apiKey
        );
        if (aiHint) {
          setHint(aiHint);
          setUsedHint(true);
        }
      }

      await updateStats({
        correct: false,
        score: 0,
        attempts: newAttempts,
        difficulty: difficulty,
      });
    }

    setChecking(false);
    setShowResult(true);
  };

  const handleNextQuestion = async () => {
    // Use adaptive generation if we have weakness data
    const profile = await getWeaknessProfile();
    const hasWeaknessData = Object.values(profile.categories || {}).some(c => c.total >= 2);
    await loadSentence(hasWeaknessData);
    insightAnim.setValue(0);
  };

  const handleReveal = () => {
    Alert.alert(
      'Correct Answer',
      sentenceData.original,
      [{ text: 'OK' }]
    );
  };

  const renderConfetti = () => {
    if (!showConfetti) return null;
    const particles = ['🎉', '⭐', '✨', '🎊', '💫', '🌟'];
    return (
      <View style={styles.confettiContainer} pointerEvents="none">
        {particles.map((p, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.confettiParticle,
              {
                left: (width / particles.length) * i + 10,
                opacity: confettiAnim.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [1, 0.8, 0],
                }),
                transform: [{
                  translateY: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 250 + i * 30],
                  }),
                }, {
                  rotate: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${360 + i * 90}deg`],
                  }),
                }],
              },
            ]}
          >
            {p}
          </Animated.Text>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FA' }]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={[styles.diffLabel, { color: config.color }]}>
            {config.emoji} {config.label}
          </Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>⭐ {score}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={config.color} />
          <Text style={styles.loadingText}>🧠 Preparing your exercise...</Text>
          <Text style={styles.loadingSubtext}>
            {apiKey ? 'Generating with AI' : 'Loading sentence'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.instructionCard,
              {
                opacity: fadeAnim,
                backgroundColor: config.color + '15',
              },
            ]}
          >
            <Text style={styles.instructionText}>
              Tap words to arrange them in the correct order!
            </Text>
          </Animated.View>

          <Animated.View style={[styles.placedArea, { opacity: fadeAnim }]}>
            <Text style={styles.areaLabel}>📝 Your Answer</Text>
            <Animated.View
              style={[
                styles.wordsContainer,
                isCorrect === true && styles.correctBorder,
                isCorrect === false && styles.wrongBorder,
                isCorrect === false && { transform: [{ translateX: shakeAnim }] },
                isCorrect === true && {
                  transform: [{
                    scale: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.wordsRow}>
                {placedWords.length === 0 ? (
                  <Text style={styles.placeholderText}>Tap words below to start...</Text>
                ) : (
                  placedWords.map((word, index) => (
                    <WordChip
                      key={`placed-${word}-${index}`}
                      word={word}
                      selected
                      color={config.color}
                      size="small"
                      onPress={() => handlePlacedWordPress(word, index)}
                    />
                  ))
                )}
              </View>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.availableArea, { opacity: fadeAnim }]}>
            <Text style={styles.areaLabel}>📦 Available Words ({availableWords.length})</Text>
            <View style={[styles.wordsContainer, { borderStyle: 'dashed' }]}>
              <View style={styles.wordsRow}>
                {availableWords.length === 0 ? (
                  <Text style={styles.placeholderText}>All words placed!</Text>
                ) : (
                  availableWords.map((word, index) => (
                    <WordChip
                      key={`avail-${word}-${index}`}
                      word={word}
                      color={config.color}
                      onPress={() => handleWordPress(word, index)}
                    />
                  ))
                )}
              </View>
            </View>
          </Animated.View>

          {/* Weakness Analysis Insight (shown after wrong answer) */}
          {mistakeAnalysis && (
            <Animated.View
              style={[
                styles.insightCard,
                {
                  opacity: insightAnim,
                  transform: [{
                    translateY: insightAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                },
              ]}
            >
              <Text style={styles.insightTitle}>💡 Learning Insight</Text>
              {mistakeAnalysis.explanation && (
                <Text style={styles.insightText}>{mistakeAnalysis.explanation}</Text>
              )}
              {mistakeAnalysis.categories && mistakeAnalysis.categories.length > 0 && (
                <View style={styles.insightTags}>
                  {mistakeAnalysis.categories.slice(0, 3).map(cat => (
                    <View key={cat} style={[styles.insightTag, { backgroundColor: '#FFE0B2' }]}>
                      <Text style={styles.insightTagText}>
                        {cat === 'wordOrder' ? '📋 Word Order' :
                         cat === 'subjectVerbAgreement' ? '🔗 Subject-Verb' :
                         cat === 'articleUsage' ? '📌 Article' :
                         cat === 'prepositionUsage' ? '📍 Preposition' :
                         cat === 'tenseUsage' ? '⏰ Tense' :
                         cat === 'conjunctionUsage' ? '🔀 Conjunction' :
                         cat === 'adverbPlacement' ? '⚡ Adverb' :
                         cat === 'adjectiveOrder' ? '🎨 Adjective' :
                         cat === 'negation' ? '🚫 Negation' :
                         cat === 'pronounUsage' ? '👤 Pronoun' : cat}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {mistakeAnalysis.problemWords && mistakeAnalysis.problemWords.length > 0 && (
                <Text style={styles.insightWords}>
                  Pay attention to: {mistakeAnalysis.problemWords.slice(0, 3).map(w => `"${w}"`).join(', ')}
                </Text>
              )}
            </Animated.View>
          )}

          {/* AI Hint */}
          {hint && !mistakeAnalysis && (
            <Animated.View style={[styles.hintCard, { opacity: insightAnim }]}>
              <Text style={styles.hintLabel}>💡 Hint</Text>
              <Text style={styles.hintText}>{hint}</Text>
            </Animated.View>
          )}

          {/* Buttons */}
          {!showResult ? (
            <Animated.View style={[styles.buttonRow, { opacity: fadeAnim }]}>
              <TouchableOpacity
                style={[styles.btn, styles.revealBtn]}
                onPress={handleReveal}
              >
                <Text style={styles.revealBtnText}>👁️ Reveal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.checkBtn, { backgroundColor: config.color }]}
                onPress={handleCheck}
                disabled={checking}
              >
                {checking ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.checkBtnText}>✓ Check</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View style={[styles.buttonRow, { opacity: fadeAnim }]}>
              {isCorrect === false && (
                <TouchableOpacity
                  style={[styles.btn, styles.revealBtn]}
                  onPress={handleReveal}
                >
                  <Text style={styles.revealBtnText}>👁️ Reveal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.btn, isCorrect ? styles.checkBtn : styles.nextBtn, { backgroundColor: config.color }]}
                onPress={handleNextQuestion}
              >
                <Text style={styles.nextBtnText}>
                  {isCorrect ? '➡️ Next Question' : '🔄 Try Another'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Result Cards */}
          <Animated.View style={{ opacity: fadeAnim }}>
            {isCorrect === true && (
              <Animated.View
                style={[styles.resultCard, styles.successCard, {
                  transform: [{
                    scale: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  }],
                }]}
              >
                <Text style={styles.resultEmoji}>🎉</Text>
                <Text style={styles.resultTitle}>Perfect!</Text>
                <Text style={styles.resultScore}>+{score} points</Text>
                {attempts > 1 && (
                  <Text style={styles.resultDetail}>Solved in {attempts} attempt{attempts > 1 ? 's' : ''}!</Text>
                )}
              </Animated.View>
            )}

            {isCorrect === false && (
              <View style={[styles.resultCard, styles.errorCard]}>
                <Text style={styles.resultEmoji}>🤔</Text>
                <Text style={styles.resultTitle}>Not quite right</Text>
                <Text style={styles.resultDetail}>Try rearranging the words!</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      )}

      {renderConfetti()}
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 16,
    color: '#4A90D9',
    fontWeight: '600',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  diffLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  scoreBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  instructionCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  placedArea: {
    marginBottom: 16,
  },
  availableArea: {
    marginBottom: 16,
  },
  areaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  wordsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    minHeight: 60,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  correctBorder: {
    borderColor: '#34C759',
    borderStyle: 'solid',
    backgroundColor: '#E8F5E9',
  },
  wrongBorder: {
    borderColor: '#FF3B30',
    borderStyle: 'solid',
    backgroundColor: '#FFEBEE',
  },
  wordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  insightCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 6,
  },
  insightText: {
    fontSize: 14,
    color: '#795548',
    marginBottom: 8,
    lineHeight: 20,
  },
  insightTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  insightTag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  insightTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },
  insightWords: {
    fontSize: 13,
    color: '#8D6E63',
    fontStyle: 'italic',
  },
  hintCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  hintLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F57F17',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 14,
    color: '#795548',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealBtn: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  revealBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  checkBtn: {
    marginLeft: 8,
  },
  checkBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  nextBtn: {
    marginLeft: 8,
  },
  nextBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#34C759',
  },
  errorCard: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  resultEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  resultDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 999,
    pointerEvents: 'none',
  },
  confettiParticle: {
    position: 'absolute',
    fontSize: 24,
    top: 100,
  },
});
