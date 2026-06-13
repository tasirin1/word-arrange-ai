import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  API_KEY: '@wordgame_api_key',
  PROGRESS: '@wordgame_progress',
  SETTINGS: '@wordgame_settings',
  STATS: '@wordgame_stats',
  MISTAKES: '@wordgame_mistakes',
  WEAKNESS_PROFILE: '@wordgame_weakness',
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

// ─── API Key ─────────────────────────────────────────

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

// ─── Stats ────────────────────────────────────────────

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

// ─── Settings ─────────────────────────────────────────

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

// ─── Mistake Tracking ─────────────────────────────────

/**
 * Save a mistake record for weakness analysis.
 * @param {Object} data - { sentence, userArrangement, correctArrangement, difficulty, timestamp }
 */
export async function saveMistakeRecord(data) {
  try {
    const mistakes = await getMistakeRecords();
    mistakes.unshift({
      sentence: data.sentence,
      userArrangement: data.userArrangement,
      correctArrangement: data.correctArrangement,
      difficulty: data.difficulty,
      timestamp: data.timestamp || new Date().toISOString(),
    });
    // Keep max 50 recent mistakes
    const trimmed = mistakes.slice(0, 50);
    await AsyncStorage.setItem(KEYS.MISTAKES, JSON.stringify(trimmed));
    return true;
  } catch (e) {
    console.warn('Failed to save mistake record:', e);
    return false;
  }
}

export async function getMistakeRecords(limit = 20) {
  try {
    const data = await AsyncStorage.getItem(KEYS.MISTAKES);
    const mistakes = data ? JSON.parse(data) : [];
    return mistakes.slice(0, limit);
  } catch (e) {
    return [];
  }
}

export async function clearMistakeRecords() {
  try {
    await AsyncStorage.removeItem(KEYS.MISTAKES);
    return true;
  } catch (e) {
    return false;
  }
}

// ─── Weakness Profile ─────────────────────────────────

const DEFAULT_WEAKNESS_PROFILE = {
  patterns: {},    // { "subject_verb_agreement": { total: 5, wrong: 3, accuracy: 0.4 } }
  problemWords: {}, // { "the": { total: 10, wrong: 3, accuracy: 0.7 } }
  // Grammar categories the system tracks
  categories: {
    wordOrder: { label: 'Word Order (Urutan Kata)', total: 0, wrong: 0, accuracy: 1 },
    subjectVerbAgreement: { label: 'Subject-Verb Agreement', total: 0, wrong: 0, accuracy: 1 },
    articleUsage: { label: 'Article (a/an/the)', total: 0, wrong: 0, accuracy: 1 },
    prepositionUsage: { label: 'Preposition (in/on/at)', total: 0, wrong: 0, accuracy: 1 },
    tenseUsage: { label: 'Tense (Waktu)', total: 0, wrong: 0, accuracy: 1 },
    conjunctionUsage: { label: 'Conjunction (and/but/if)', total: 0, wrong: 0, accuracy: 1 },
    adverbPlacement: { label: 'Adverb Position', total: 0, wrong: 0, accuracy: 1 },
    adjectiveOrder: { label: 'Adjective Order', total: 0, wrong: 0, accuracy: 1 },
    negation: { label: 'Negation (not/never)', total: 0, wrong: 0, accuracy: 1 },
    pronounUsage: { label: 'Pronoun (I/you/she/it)', total: 0, wrong: 0, accuracy: 1 },
  },
  // AI-generated analysis text
  aiAnalysis: null,
  lastAnalyzed: null,
  totalMistakes: 0,
};

export async function getWeaknessProfile() {
  try {
    const data = await AsyncStorage.getItem(KEYS.WEAKNESS_PROFILE);
    if (data) {
      return { ...DEFAULT_WEAKNESS_PROFILE, ...JSON.parse(data) };
    }
    return { ...DEFAULT_WEAKNESS_PROFILE };
  } catch (e) {
    return { ...DEFAULT_WEAKNESS_PROFILE };
  }
}

export async function saveWeaknessProfile(profile) {
  try {
    await AsyncStorage.setItem(KEYS.WEAKNESS_PROFILE, JSON.stringify(profile));
    return true;
  } catch (e) {
    console.warn('Failed to save weakness profile:', e);
    return false;
  }
}

/**
 * Update weakness categories based on a mistake analysis result.
 * @param {Object} analysis - { categories: string[], problemWords: string[] }
 */
export async function updateWeaknessFromAnalysis(analysis) {
  const profile = await getWeaknessProfile();

  if (analysis.categories && Array.isArray(analysis.categories)) {
    analysis.categories.forEach(cat => {
      if (profile.categories[cat]) {
        profile.categories[cat].total += 1;
        profile.categories[cat].wrong += 1;
        profile.categories[cat].accuracy = Math.round(
          (1 - profile.categories[cat].wrong / profile.categories[cat].total) * 100
        ) / 100;
      }
    });
  }

  if (analysis.problemWords && Array.isArray(analysis.problemWords)) {
    analysis.problemWords.forEach(word => {
      const key = word.toLowerCase();
      if (!profile.problemWords[key]) {
        profile.problemWords[key] = { total: 0, wrong: 0, accuracy: 1 };
      }
      profile.problemWords[key].total += 1;
      profile.problemWords[key].wrong += 1;
      profile.problemWords[key].accuracy = Math.round(
        (1 - profile.problemWords[key].wrong / profile.problemWords[key].total) * 100
      ) / 100;
    });
  }

  profile.totalMistakes += 1;

  // Also update wordOrder category for ANY mistake (general word arrangement)
  profile.categories.wordOrder.total += 1;
  profile.categories.wordOrder.wrong += 1;
  profile.categories.wordOrder.accuracy = Math.round(
    (1 - profile.categories.wordOrder.wrong / profile.categories.wordOrder.total) * 100
  ) / 100;

  await saveWeaknessProfile(profile);
  return profile;
}

/**
 * Save AI-generated weakness analysis summary.
 */
export async function saveAIAnalysis(analysisText) {
  const profile = await getWeaknessProfile();
  profile.aiAnalysis = analysisText;
  profile.lastAnalyzed = new Date().toISOString();
  await saveWeaknessProfile(profile);
  return profile;
}

/**
 * Get the top weak categories sorted by accuracy (ascending).
 */
export async function getWeaknessCategories(limit = 3) {
  const profile = await getWeaknessProfile();
  return Object.entries(profile.categories)
    .filter(([, v]) => v.total >= 2) // at least 2 attempts
    .sort(([, a], [, b]) => a.accuracy - b.accuracy)
    .slice(0, limit)
    .map(([key, val]) => ({ key, ...val }));
}

/**
 * Get the top problem words sorted by accuracy (ascending).
 */
export async function getProblemWords(limit = 5) {
  const profile = await getWeaknessProfile();
  return Object.entries(profile.problemWords)
    .filter(([, v]) => v.total >= 2)
    .sort(([, a], [, b]) => a.accuracy - b.accuracy)
    .slice(0, limit)
    .map(([key, val]) => ({ word: key, ...val }));
}

// ─── Clear All ────────────────────────────────────────

export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove([
      KEYS.API_KEY, KEYS.PROGRESS, KEYS.SETTINGS,
      KEYS.STATS, KEYS.MISTAKES, KEYS.WEAKNESS_PROFILE,
    ]);
    return true;
  } catch (e) {
    return false;
  }
}
