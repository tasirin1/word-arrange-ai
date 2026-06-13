import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  API_KEY: '@wordgame_api_key',
  PROGRESS: '@wordgame_progress',
  SETTINGS: '@wordgame_settings',
  STATS: '@wordgame_stats',
};

const DEFAULT_STATS = {
  gamesPlayed: 0,
  totalScore: 0,
  correctAnswers: 0,
  totalAttempts: 0,
  currentStreak: 0,
  bestStreak: 0,
  beginnerCompleted: 0,
  intermediateCompleted: 0,
  advancedCompleted: 0,
  lastPlayed: null,
};

export async function saveApiKey(apiKey) {
  try {
    await AsyncStorage.setItem(KEYS.API_KEY, apiKey);
    return true;
  } catch (e) {
    console.warn('Failed to save API key:', e);
    return false;
  }
}

export async function getApiKey() {
  try {
    return await AsyncStorage.getItem(KEYS.API_KEY) || '';
  } catch (e) {
    return '';
  }
}

export async function saveStats(stats) {
  try {
    await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
    return true;
  } catch (e) {
    console.warn('Failed to save stats:', e);
    return false;
  }
}

export async function getStats() {
  try {
    const data = await AsyncStorage.getItem(KEYS.STATS);
    if (data) {
      return { ...DEFAULT_STATS, ...JSON.parse(data) };
    }
    return { ...DEFAULT_STATS };
  } catch (e) {
    return { ...DEFAULT_STATS };
  }
}

export async function updateStats(gameResult) {
  const stats = await getStats();
  
  stats.gamesPlayed += 1;
  stats.totalScore += gameResult.score || 0;
  stats.totalAttempts += gameResult.attempts || 0;
  stats.lastPlayed = new Date().toISOString();
  
  if (gameResult.correct) {
    stats.correctAnswers += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    
    if (gameResult.difficulty === 'beginner') stats.beginnerCompleted += 1;
    else if (gameResult.difficulty === 'intermediate') stats.intermediateCompleted += 1;
    else if (gameResult.difficulty === 'advanced') stats.advancedCompleted += 1;
  } else {
    stats.currentStreak = 0;
  }
  
  await saveStats(stats);
  return stats;
}

export async function saveSetting(key, value) {
  try {
    const settings = await getSettings();
    settings[key] = value;
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
}

export async function getSettings() {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (data) return JSON.parse(data);
    return { difficulty: 'beginner', soundEnabled: true };
  } catch (e) {
    return { difficulty: 'beginner', soundEnabled: true };
  }
}

export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove([KEYS.API_KEY, KEYS.PROGRESS, KEYS.SETTINGS, KEYS.STATS]);
    return true;
  } catch (e) {
    return false;
  }
}
