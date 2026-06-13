import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Alert, ScrollView, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import WordChip from '../components/WordChip';
import {
  generateSentence, scrambleSentence, checkArrangement,
  getAIHint, calculateScore
} from '../services/aiService';
import { getApiKey, updateStats } from '../services/storageService';

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

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  const loadSentence = useCallback(async () => {
    setLoading(true);
    setShowResult(false);
    setIsCorrect(null);
    setHint(null);
    setUsedHint(false);
    setAttempts(0);
    setScore(0);
    setShowConfetti(false);
    setPlacedWords([]);
    
    const key = await getApiKey();
    setApiKey(key);
    
    const sentence = await generateSentence(difficulty, key);
    const scrambled = scrambleSentence(sentence);
    setSentenceData(scrambled);
    setAvailableWords(scrambled.words);
    
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
  };

  const handlePlacedWordPress = (word, index) => {
    if (showResult) return;
    
    setPlacedWords(prev => prev.filter((_, i) => i !== index));
    setAvailableWords(prev => [...prev, word]);
    setIsCorrect(null);
    setHint(null);
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
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      
      // AI hint
      if (apiKey) {
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

  const handleNext = () => {
    fadeAnim.setValue(0);
    bounceAnim.setValue(0);
    confettiAnim.setValue(0);
    loadSentence();
  };

  const handleReveal = () => {
    Alert.alert(
      'Reveal Answer',
      `The correct sentence is:\n\n"${sentenceData.original}"\n\nWant to try a new one?`,
      [
        { text: 'Try Again', style: 'cancel' },
        { text: 'New Sentence', onPress: handleNext },
      ]
    );
  };

  const renderConfetti = () => {
    if (!showConfetti) return null;
    const particles = ['✨', '⭐', '🌟', '💫', '🎉', '🎊'];
    return (
      <View style={styles.confettiContainer}>
        {particles.map((p, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.confettiParticle,
              {
                left: 10 + (i * 60) % (Dimensions.get('window').width - 20),
                opacity: confettiAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1, 0],
                }),
                transform: [{
                  translateY: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -200 - i * 30],
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FA' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={config.color} />
          <Text style={styles.loadingText}>Generating sentence...</Text>
          <Text style={styles.loadingSubtext}>Using {apiKey ? 'AI' : 'built-in'} sentences</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FA' }]}>
      <StatusBar style="dark" />
      
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.diffLabel}>{config.emoji} {config.label}</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>⭐ {score}</Text>
        </View>
      </View>

      {renderConfetti()}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.instructionCard}>
            <Text style={styles.instructionText}>
              📝 Arrange the words to form a correct English sentence
            </Text>
          </View>

          {/* Placed words area */}
          <View style={styles.placedArea}>
            <Text style={styles.areaLabel}>Your Answer:</Text>
            <Animated.View
              style={[
                styles.wordsContainer,
                { transform: [{ translateX: shakeAnim }] },
                isCorrect === true && styles.correctBorder,
                isCorrect === false && styles.wrongBorder,
              ]}
            >
              {placedWords.length === 0 ? (
                <Text style={styles.placeholderText}>Tap words below to arrange them...</Text>
              ) : (
                <View style={styles.wordsRow}>
                  {placedWords.map((word, index) => (
                    <WordChip
                      key={`placed-${index}-${word}`}
                      word={word}
                      onPress={() => handlePlacedWordPress(word, index)}
                      color={config.color}
                      selected={true}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          </View>

          {/* Available words area */}
          <View style={styles.availableArea}>
            <Text style={styles.areaLabel}>Available Words:</Text>
            <Animated.View style={[styles.wordsContainer]}>
              {availableWords.length === 0 ? (
                <Text style={styles.placeholderText}>✓ All words placed!</Text>
              ) : (
                <View style={styles.wordsRow}>
                  {availableWords.map((word, index) => (
                    <WordChip
                      key={`avail-${index}-${word}`}
                      word={word}
                      onPress={() => handleWordPress(word, index)}
                      color={config.color}
                      selected={false}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          </View>

          {/* Hint area */}
          {hint && (
            <View style={styles.hintCard}>
              <Text style={styles.hintText}>💡 {hint}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.revealBtn]}
              onPress={handleReveal}
            >
              <Text style={styles.revealBtnText}>👀 Reveal</Text>
            </TouchableOpacity>

            {!showResult ? (
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
            ) : (
              <TouchableOpacity
                style={[styles.btn, styles.nextBtn, { backgroundColor: config.color }]}
                onPress={handleNext}
              >
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Result message */}
          {isCorrect === true && (
            <Animated.View
              style={[
                styles.resultCard,
                styles.successCard,
                { transform: [{ scale: bounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                })}] }
              ]}
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
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
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
    borderStyle: 'dashed',
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
  hintCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
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
