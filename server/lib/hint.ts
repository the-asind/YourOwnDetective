type HintLevel = 'ice' | 'cold' | 'warmer' | 'warm' | 'hot' | 'burning' | 'almost';

export interface GuessHint {
  level: HintLevel;
  label: string;
  message: string;
}

const STOP_WORDS = new Set([
  'а',
  'без',
  'бы',
  'в',
  'во',
  'все',
  'всё',
  'где',
  'да',
  'для',
  'до',
  'его',
  'ее',
  'её',
  'если',
  'же',
  'за',
  'и',
  'из',
  'или',
  'им',
  'их',
  'как',
  'к',
  'ко',
  'ли',
  'мне',
  'мы',
  'на',
  'нам',
  'нас',
  'не',
  'но',
  'о',
  'об',
  'он',
  'она',
  'оно',
  'они',
  'от',
  'по',
  'под',
  'при',
  'с',
  'со',
  'так',
  'там',
  'то',
  'туда',
  'ты',
  'у',
  'уже',
  'что',
  'это',
  'я',
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function stemToken(token: string): string {
  if (token.length <= 4) return token;

  return token.replace(
    /(иями|ями|ами|ого|ему|ому|ыми|ими|ая|яя|ое|ее|ые|ие|ый|ий|ой|ом|ем|ам|ям|ах|ях|ов|ев|ей|ия|ья|ью|ию|ым|им|ую|юю|а|я|ы|и|о|е|у|ю|ь)$/u,
    '',
  );
}

function getTokens(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function trigrams(value: string): Set<string> {
  const normalized = `  ${normalizeText(value)}  `;
  const grams = new Set<string>();

  if (normalized.trim().length < 2) return grams;

  for (let i = 0; i <= normalized.length - 3; i += 1) {
    grams.add(normalized.slice(i, i + 3));
  }

  return grams;
}

function trigramSimilarity(a: string, b: string): number {
  const aGrams = trigrams(a);
  const bGrams = trigrams(b);

  if (!aGrams.size || !bGrams.size) return 0;

  let intersection = 0;
  for (const gram of aGrams) {
    if (bGrams.has(gram)) intersection += 1;
  }

  return (2 * intersection) / (aGrams.size + bGrams.size);
}

function tokenScore(query: string, secret: string): number {
  const queryTokens = getTokens(query);
  const secretTokens = getTokens(secret);
  if (!queryTokens.length || !secretTokens.length) return 0;

  const secretTokenSet = new Set(secretTokens);
  const queryStems = queryTokens.map(stemToken);
  const secretStemSet = new Set(secretTokens.map(stemToken));

  let exactMatches = 0;
  for (const token of queryTokens) {
    if (secretTokenSet.has(token)) exactMatches += 1;
  }

  let stemMatches = 0;
  for (const stem of queryStems) {
    if (secretStemSet.has(stem)) stemMatches += 1;
  }

  const coverage = Math.max(exactMatches, stemMatches * 0.86) / queryTokens.length;
  const density = Math.max(exactMatches, stemMatches * 0.86) / Math.max(queryTokens.length, secretTokens.length);
  const overlapScore = coverage * 0.58 + density * 0.24;

  let bestWordSimilarity = 0;
  for (const queryToken of queryTokens) {
    for (const secretToken of secretTokens) {
      bestWordSimilarity = Math.max(bestWordSimilarity, trigramSimilarity(queryToken, secretToken));
    }
  }

  const fuzzyWordScore = bestWordSimilarity >= 0.56 ? bestWordSimilarity * 0.72 : 0;
  return Math.max(overlapScore, fuzzyWordScore);
}

function getHintForScore(score: number): GuessHint {
  if (score >= 0.9) {
    return { level: 'almost', label: 'Почти оно', message: 'Очень близко, но формулировка ещё не та.' };
  }
  if (score >= 0.76) {
    return { level: 'burning', label: 'Почти обжигает', message: 'Ты совсем рядом.' };
  }
  if (score >= 0.62) {
    return { level: 'hot', label: 'Горячо', message: 'В запросе есть сильное совпадение.' };
  }
  if (score >= 0.48) {
    return { level: 'warm', label: 'Тепло', message: 'Есть что-то знакомое.' };
  }
  if (score >= 0.32) {
    return { level: 'warmer', label: 'Уже теплее', message: 'Направление похоже, но слабовато.' };
  }
  if (score >= 0.18) {
    return { level: 'cold', label: 'Холодно', message: 'Пока далеко.' };
  }

  return { level: 'ice', label: 'Ледяно', message: 'Тут вообще не рядом.' };
}

export function buildGuessHint(query: string, secrets: string[]): GuessHint {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return getHintForScore(0);

  const bestScore = secrets.reduce((best, secret) => {
    const normalizedSecret = normalizeText(secret);
    const phraseScore = trigramSimilarity(normalizedQuery, normalizedSecret);
    const wordsScore = tokenScore(normalizedQuery, normalizedSecret);
    return Math.max(best, phraseScore, wordsScore);
  }, 0);

  return getHintForScore(bestScore);
}
