import { Platform } from 'react-native';

const API_URL = 'https://api.openai.com/v1/chat/completions';

// Fallback sentences when AI is unavailable
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
    "I wake up at six o'clock"
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
    "She couldn't find her keys anywhere in the house",
    "They were surprised by the sudden change in weather"
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
    "Contemporary philosophical discourse increasingly emphasizes the importance of interdisciplinary approaches"
  ]
};

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

export async function generateSentence(difficulty, apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    return getSentenceByDifficulty(difficulty);
  }

  const difficultyPrompts = {
    beginner: 'a simple present tense sentence (5-8 words) for beginners. Example: "The cat drinks milk every morning"',
    intermediate: 'a sentence with a subordinate clause or complex structure (8-14 words) for intermediate learners. Example: "Although she was tired, she finished all her homework before bedtime"',
    advanced: 'a complex sentence (12-20 words) with sophisticated vocabulary for advanced learners. Example: "The groundbreaking scientific research published in the prestigious journal fundamentally challenged conventional wisdom about cellular regeneration"'
  };

  const prompt = `Generate ONE English sentence for a word rearrangement exercise. Difficulty: ${difficulty}.
Requirements:
- ${difficultyPrompts[difficulty] || difficultyPrompts.beginner}
- Use proper English grammar
- Only return the sentence, no quotes, no labels, no numbering
- Do not include any special characters or punctuation except apostrophes for contractions`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an English teacher creating exercises for students. Generate clean, grammatically correct English sentences only, without any additional text or formatting.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 60,
        temperature: 0.8
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('AI API error:', response.status, errorText);
      return getSentenceByDifficulty(difficulty);
    }

    const data = await response.json();
    let sentence = data.choices?.[0]?.message?.content?.trim();
    
    if (!sentence) return getSentenceByDifficulty(difficulty);

    // Clean up the sentence
    sentence = sentence.replace(/^["']|["']$/g, '').trim();
    if (sentence.startsWith('-') || sentence.startsWith('•')) {
      sentence = sentence.substring(1).trim();
    }

    // Validate minimum words
    if (sentence.split(/\s+/).length < 3) {
      return getSentenceByDifficulty(difficulty);
    }

    return sentence;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('AI request timed out');
    } else {
      console.warn('AI request failed:', error.message);
    }
    return getSentenceByDifficulty(difficulty);
  }
}

export async function getAIHint(sentence, userArrangement, apiKey) {
  if (!apiKey || apiKey.trim() === '') return null;

  const prompt = `The student is trying to arrange these words into a correct English sentence.
Original sentence: "${sentence}"
Student's current arrangement: "${userArrangement.join(' ')}"

Give a very short, helpful hint (1 sentence, max 15 words) about what might be wrong. Don't give the answer. Be encouraging.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a supportive English tutor. Give brief, encouraging hints.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 40,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    return null;
  }
}

export function calculateScore(words, attempts, usedHint) {
  const base = words.length * 10;
  const attemptPenalty = Math.max(0, (attempts - 1) * 5);
  const hintPenalty = usedHint ? 10 : 0;
  return Math.max(10, base - attemptPenalty - hintPenalty);
}
