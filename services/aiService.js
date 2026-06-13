import { Platform } from 'react-native';

const API_URL = 'https://api.openai.com/v1/chat/completions';

// ─── Grammar Pattern Categories ─────────────────────

const GRAMMAR_CATEGORIES = {
  wordOrder: { label: 'Word Order', keywords: [] },
  subjectVerbAgreement: { label: 'Subject-Verb Agreement', keywords: ['is', 'am', 'are', 'was', 'were', 'has', 'have', 'do', 'does', 'go', 'goes'] },
  articleUsage: { label: 'Article (a/an/the)', keywords: ['a', 'an', 'the'] },
  prepositionUsage: { label: 'Preposition', keywords: ['in', 'on', 'at', 'for', 'to', 'with', 'by', 'from', 'of', 'about'] },
  tenseUsage: { label: 'Tense / Verb Form', keywords: ['will', 'would', 'could', 'should', 'have', 'has', 'had', 'been', 'being', 'was', 'were', 'did', 'done'] },
  conjunctionUsage: { label: 'Conjunction', keywords: ['and', 'but', 'or', 'if', 'because', 'although', 'while', 'when', 'since', 'unless', 'however', 'therefore'] },
  adverbPlacement: { label: 'Adverb Position', keywords: ['always', 'never', 'often', 'sometimes', 'usually', 'rarely', 'already', 'just', 'still', 'yet', 'even', 'only'] },
  adjectiveOrder: { label: 'Adjective Order', keywords: ['beautiful', 'large', 'small', 'old', 'new', 'young', 'big', 'little', 'red', 'blue', 'green', 'black', 'white'] },
  negation: { label: 'Negation', keywords: ['not', "n't", 'never', 'no', 'nothing', 'nowhere'] },
  pronounUsage: { label: 'Pronoun', keywords: ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his'] },
};

// ─── Fallback Sentences ──────────────────────────────

const FALLBACK_SENTENCES = {
  beginner: [
    "The cat is sleeping on the sofa",
    "I like to eat apples every day",
    "She goes to school by bus",
    "They are playing in the park",
    "He has a red bicycle",
    "We enjoy reading books together",
    "The sun shines brightly in summer",
    "My mother cooks delicious food",
    "The dog runs fast in the garden",
    "I wake up at six o'clock",
    "We can see the big tree",
    "She put the book on the table",
    "The bird sings in the morning",
    "He drinks coffee with sugar",
    "They live near the blue sea",
  ],
  intermediate: [
    "Although it was raining, they went to the beach",
    "The teacher asked the students to complete their homework",
    "She has been learning English for three years",
    "If you practice every day, you will improve quickly",
    "The movie that we watched last night was very interesting",
    "He decided to take a break after working for six hours",
    "Many people enjoy traveling to different countries",
    "The restaurant serves the best pasta in the city",
    "She could not find her keys anywhere in the house",
    "They were surprised by the sudden change in weather",
    "I have never seen such a beautiful sunset",
    "He always puts his books on the shelf",
    "She enjoys reading novels in her free time",
    "Before going to bed, I always brush my teeth",
    "The children are playing happily in the garden",
  ],
  advanced: [
    "The research conducted by the university revealed groundbreaking discoveries about climate change",
    "Despite facing numerous obstacles, the entrepreneur successfully launched her innovative startup",
    "The hypothesis proposed by the scientist challenged decades of established theoretical frameworks",
    "Having traveled extensively throughout Southeast Asia, she developed a deep appreciation for diverse cultures",
    "The committee unanimously rejected the proposal due to insufficient evidence and lack of feasibility",
    "While the economic implications remain controversial, the environmental benefits are undeniable",
    "The novel explores the complex relationship between technological advancement and human connection",
    "His extraordinary ability to synthesize complex information made him an invaluable asset to the team",
    "The archaeological expedition uncovered artifacts that fundamentally altered our understanding of ancient civilization",
    "Contemporary philosophical discourse increasingly emphasizes the importance of interdisciplinary approaches",
    "Never before had the scientific community witnessed such a remarkable breakthrough in quantum computing",
    "The professor insisted that all students must submit their assignments before the deadline",
    "Had she known about the consequences, she would never have made that decision",
    "The more you practice speaking English, the more confident you will become",
    "It is widely believed that regular exercise contributes significantly to mental well-being",
  ],
};

// ─── Helpers ─────────────────────────────────────────

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getSentenceByDifficulty(difficulty) {
  const level = difficulty || 'beginner';
  const sentences = FALLBACK_SENTENCES[level] || FALLBACK_SENTENCES.beginner;
  return sentences[Math.floor(Math.random() * sentences.length)];
}

function cleanText(text) {
  return text.replace(/[^\w\s']/g, '').trim();
}

/**
 * Get a sentence that targets a specific weak category.
 */
function getTargetedFallbackSentence(difficulty, categoryKey) {
  const level = difficulty || 'beginner';
  const all = FALLBACK_SENTENCES[level] || FALLBACK_SENTENCES.beginner;
  const cat = GRAMMAR_CATEGORIES[categoryKey];

  if (!cat || cat.keywords.length === 0) {
    return all[Math.floor(Math.random() * all.length)];
  }

  // Find sentences containing keywords from that category
  const candidates = all.filter(s => {
    const lower = s.toLowerCase();
    return cat.keywords.some(kw => lower.includes(kw));
  });

  if (candidates.length === 0) return all[Math.floor(Math.random() * all.length)];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── Scramble / Check / Score ────────────────────────

export function scrambleSentence(sentence) {
  const clean = cleanText(sentence);
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  let scrambled;
  let attempts = 0;
  do {
    scrambled = shuffleArray(words);
    attempts++;
  } while (scrambled.join(' ') === words.join(' ') && attempts < 10 && words.length > 1);
  return { original: sentence, words: scrambled, originalWords: words };
}

export function checkArrangement(userWords, originalWords) {
  const user = userWords.map(w => w.toLowerCase().replace(/[^\w']/g, '')).filter(w => w);
  const original = originalWords.map(w => w.toLowerCase().replace(/[^\w']/g, '')).filter(w => w);

  if (user.length !== original.length) return false;
  return user.every((w, i) => w === original[i]);
}

export function calculateScore(words, attempts, usedHint) {
  const base = words.length * 10;
  const attemptPenalty = Math.max(0, (attempts - 1) * 5);
  const hintPenalty = usedHint ? 10 : 0;
  return Math.max(10, base - attemptPenalty - hintPenalty);
}

// ─── AI Call Helper ──────────────────────────────────

async function callOpenAI(messages, apiKey, maxTokens = 60, temperature = 0.7, timeoutMs = 10000) {
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('AI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('AI request timed out');
    } else {
      console.warn('AI request failed:', error.message);
    }
    return null;
  }
}

// ─── Generate Sentence ───────────────────────────────

export async function generateSentence(difficulty, apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    return getSentenceByDifficulty(difficulty);
  }

  const difficultyPrompts = {
    beginner: 'a simple present tense sentence (5-8 words) for beginners. Example: "The cat drinks milk every morning"',
    intermediate: 'a sentence with a subordinate clause or complex structure (8-14 words) for intermediate learners. Example: "Although she was tired, she finished all her homework before bedtime"',
    advanced: 'a complex sentence (12-20 words) with sophisticated vocabulary for advanced learners. Example: "The groundbreaking scientific research published in the prestigious journal fundamentally challenged conventional wisdom about cellular regeneration"',
  };

  const prompt = `Generate ONE English sentence for a word rearrangement exercise. Difficulty: ${difficulty}.
Requirements:
- ${difficultyPrompts[difficulty] || difficultyPrompts.beginner}
- Use proper English grammar
- Only return the sentence, no quotes, no labels, no numbering
- Do not include any special characters or punctuation except apostrophes for contractions`;

  const content = await callOpenAI(
    [
      {
        role: 'system',
        content: 'You are an English teacher creating exercises for students. Generate clean, grammatically correct English sentences only, without any additional text or formatting.',
      },
      { role: 'user', content: prompt },
    ],
    apiKey,
    60,
    0.8,
    10000
  );

  if (!content) return getSentenceByDifficulty(difficulty);

  let sentence = content;
  sentence = sentence.replace(/^["']|["']$/g, '').trim();
  if (sentence.startsWith('-') || sentence.startsWith('•')) {
    sentence = sentence.substring(1).trim();
  }

  if (sentence.split(/\s+/).length < 3) {
    return getSentenceByDifficulty(difficulty);
  }

  return sentence;
}

// ─── Adaptive Sentence Generation ────────────────────

/**
 * Generate a sentence that targets the user's weak grammar areas.
 * @param {string} difficulty - 'beginner' | 'intermediate' | 'advanced'
 * @param {string} apiKey - OpenAI API key
 * @param {Object} weaknessProfile - from getWeaknessProfile()
 */
export async function generateAdaptiveSentence(difficulty, apiKey, weaknessProfile) {
  // Find the weakest categories (lowest accuracy, at least 2 attempts)
  const weakCategories = Object.entries(weaknessProfile.categories || {})
    .filter(([, v]) => v.total >= 2)
    .sort(([, a], [, b]) => a.accuracy - b.accuracy);

  const topWeak = weakCategories.slice(0, 2);

  // If no API key or no weakness data, use fallback targeting
  if (!apiKey || apiKey.trim() === '') {
    if (topWeak.length > 0) {
      return getTargetedFallbackSentence(difficulty, topWeak[0][0]);
    }
    return getSentenceByDifficulty(difficulty);
  }

  const difficultyDesc = {
    beginner: 'simple present tense, 5-8 words',
    intermediate: 'complex with subordinate clause, 8-14 words',
    advanced: 'sophisticated vocabulary and structure, 12-20 words',
  };

  let focusInstruction = '';
  if (topWeak.length > 0) {
    focusInstruction = `
IMPORTANT - Focus on these grammar areas where the student is weak:
${topWeak.map(([key, val]) => {
  const cat = GRAMMAR_CATEGORIES[key];
  return `- ${cat ? cat.label : key} (current accuracy: ${Math.round(val.accuracy * 100)}%)`;
}).join('\n')}

Make sure the sentence naturally incorporates the grammar patterns above so the student can practice them.`;
  } else {
    focusInstruction = '\nGenerate a general practice sentence appropriate for the difficulty level.';
  }

  const prompt = `Generate ONE English sentence for a word rearrangement exercise. Difficulty: ${difficulty}.
Requirements:
- Use ${difficultyDesc[difficulty] || difficultyDesc.beginner}
- Use proper English grammar
- Only return the sentence, no quotes, no labels, no numbering
- Do not include any special characters or punctuation except apostrophes for contractions${focusInstruction}`;

  const content = await callOpenAI(
    [
      {
        role: 'system',
        content: 'You are a skilled English teacher who creates personalized exercises targeting each student\'s weak areas. Generate clean, grammatically correct English sentences only.',
      },
      { role: 'user', content: prompt },
    ],
    apiKey,
    80,
    0.7,
    12000
  );

  if (!content) {
    // Fallback with targeting
    if (topWeak.length > 0) {
      return getTargetedFallbackSentence(difficulty, topWeak[0][0]);
    }
    return getSentenceByDifficulty(difficulty);
  }

  let sentence = content;
  sentence = sentence.replace(/^["']|["']$/g, '').trim();
  if (sentence.startsWith('-') || sentence.startsWith('•')) {
    sentence = sentence.substring(1).trim();
  }

  if (sentence.split(/\s+/).length < 3) {
    return getSentenceByDifficulty(difficulty);
  }

  return sentence;
}

// ─── AI Hint ─────────────────────────────────────────

export async function getAIHint(sentence, userArrangement, apiKey) {
  if (!apiKey || apiKey.trim() === '') return null;

  const userStr = userArrangement.join(' ');

  const prompt = `The student is trying to arrange these words into a correct English sentence.
Original sentence: "${sentence}"
Student's current arrangement: "${userStr}"

Give a very short, helpful hint (1 sentence, max 15 words) about what might be wrong. Don't give the answer. Be encouraging.`;

  return await callOpenAI(
    [
      {
        role: 'system',
        content: 'You are a supportive English tutor. Give brief, encouraging hints.',
      },
      { role: 'user', content: prompt },
    ],
    apiKey,
    40,
    0.7,
    5000
  );
}

// ─── Mistake Analysis (AI) ───────────────────────────

/**
 * Analyze WHAT the user got wrong — identify grammar patterns & problem words.
 * Returns { categories: string[], problemWords: string[], explanation: string }
 */
export async function analyzeMistake(sentence, userArrangement, apiKey) {
  const correctStr = sentence;
  const userStr = userArrangement.join(' ');

  // If we have API key, use AI for deep analysis
  if (apiKey && apiKey.trim() !== '') {
    const prompt = `A student made a mistake in a word rearrangement exercise.

Correct sentence: "${correctStr}"
Student's wrong arrangement: "${userStr}"

Analyze what the student got wrong. Return a JSON object with:
1. "categories": array of grammar categories they struggled with, from this list: ["wordOrder", "subjectVerbAgreement", "articleUsage", "prepositionUsage", "tenseUsage", "conjunctionUsage", "adverbPlacement", "adjectiveOrder", "negation", "pronounUsage"]
2. "problemWords": array of specific words (lowercase) that were placed incorrectly
3. "explanation": one short sentence (max 20 words) explaining the mistake pattern

Return ONLY valid JSON, no other text.`;

    const result = await callOpenAI(
      [
        {
          role: 'system',
          content: 'You are an English teacher analyzing student mistakes. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      apiKey,
    120,
    0.3,
    8000
    );

    if (result) {
      try {
        // Try to extract JSON from the response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Failed to parse AI analysis:', e.message);
      }
    }
  }

  // Rule-based fallback analysis
  return ruleBasedAnalysis(sentence, userArrangement);
}

/**
 * Rule-based analysis when AI is unavailable.
 */
function ruleBasedAnalysis(sentence, userArrangement) {
  const categories = new Set();
  const problemWords = [];

  const cleanSentence = sentence.toLowerCase();
  const cleanUser = userArrangement.map(w => w.toLowerCase().replace(/[^\w']/g, ''));

  // Check each category
  for (const [key, cat] of Object.entries(GRAMMAR_CATEGORIES)) {
    if (key === 'wordOrder') continue; // Always implied
    const foundKeywords = cat.keywords.filter(kw => cleanSentence.includes(kw));
    if (foundKeywords.length > 0) {
      // Check if those keywords are in a different position than expected
      const correctWords = cleanText(sentence).toLowerCase().split(/\s+/);
      for (const kw of foundKeywords) {
        const correctIdx = correctWords.indexOf(kw);
        const userIdx = cleanUser.indexOf(kw);
        if (correctIdx !== userIdx && correctIdx >= 0 && userIdx >= 0) {
          categories.add(key);
          problemWords.push(kw);
        }
      }
    }
  }

  // If the user arrangement differs in structure, flag word order
  if (categories.size === 0) {
    categories.add('wordOrder');
  }

  // Find all misplaced words
  const correctWords = cleanText(sentence).toLowerCase().split(/\s+/);
  correctWords.forEach((word, idx) => {
    if (cleanUser[idx] !== word) {
      problemWords.push(word);
    }
  });

  const uniqueProblemWords = [...new Set(problemWords)];

  let explanation;
  if (uniqueProblemWords.length <= 2) {
    explanation = `Pay attention to the position of "${uniqueProblemWords.join('", "')}"`;
  } else {
    const catLabels = [...categories].map(k => GRAMMAR_CATEGORIES[k]?.label || k);
    explanation = `Focus on: ${catLabels.join(', ')}`;
  }

  return {
    categories: [...categories],
    problemWords: uniqueProblemWords.slice(0, 5),
    explanation,
  };
}

// ─── Weakness Profile Compilation ────────────────────

/**
 * Compile a full weakness analysis from recent mistake records.
 * Uses AI to generate a learning recommendation when API key is available.
 */
export async function compileWeaknessProfile(mistakeRecords, apiKey) {
  if (!mistakeRecords || mistakeRecords.length === 0) return null;

  // Run rule-based analysis on all mistakes
  const allCategories = {};
  const allProblemWords = {};

  mistakeRecords.forEach(record => {
    const analysis = ruleBasedAnalysis(record.sentence, record.userArrangement);

    analysis.categories.forEach(cat => {
      allCategories[cat] = (allCategories[cat] || 0) + 1;
    });

    analysis.problemWords.forEach(word => {
      const key = word.toLowerCase();
      allProblemWords[key] = (allProblemWords[key] || 0) + 1;
    });
  });

  // Sort by frequency
  const topCategories = Object.entries(allCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => key);

  const topWords = Object.entries(allProblemWords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);

  // Try AI for a deeper analysis
  if (apiKey && apiKey.trim() !== '' && mistakeRecords.length >= 3) {
    const mistakeSummary = mistakeRecords.slice(0, 10).map(r =>
      `Correct: "${r.sentence}" | Wrong: "${r.userArrangement.join(' ')}"`
    ).join('\n');

    const prompt = `Here are mistakes from an English learner doing word rearrangement exercises:

${mistakeSummary}

Analyze their weak areas. Return a JSON object with:
1. "categories": array of grammar categories they struggle with from: ["wordOrder", "subjectVerbAgreement", "articleUsage", "prepositionUsage", "tenseUsage", "conjunctionUsage", "adverbPlacement", "adjectiveOrder", "negation", "pronounUsage"]
2. "problemWords": array of specific words they frequently misplace (lowercase)
3. "recommendation": one sentence (max 25 words) with personalized learning advice

Return ONLY valid JSON, no other text.`;

    const result = await callOpenAI(
      [
        {
          role: 'system',
          content: 'You are an English teacher analyzing student weakness patterns. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      apiKey,
      150,
      0.3,
      10000
    );

    if (result) {
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiAnalysis = JSON.parse(jsonMatch[0]);
          return {
            categories: aiAnalysis.categories || topCategories,
            problemWords: aiAnalysis.problemWords || topWords,
            recommendation: aiAnalysis.recommendation || null,
          };
        }
      } catch (e) {
        console.warn('Failed to parse AI weakness analysis:', e.message);
      }
    }
  }

  return {
    categories: topCategories,
    problemWords: topWords,
    recommendation: `Focus on ${topCategories.map(c => GRAMMAR_CATEGORIES[c]?.label || c).join(', ')}`,
  };
}
