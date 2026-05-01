type HintLevel = 'ice' | 'cold' | 'warmer' | 'warm' | 'hot' | 'burning' | 'almost';

export interface GuessHint {
  level: HintLevel;
  label: string;
  message: string;
  trend?: 'warmer' | 'colder' | 'same';
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

function tokenOverlapRatio(a: string, b: string): number {
  const aStems = new Set(getTokens(a).map(stemToken));
  const bStems = new Set(getTokens(b).map(stemToken));
  if (!aStems.size || !bStems.size) return 0;

  let shared = 0;
  for (const stem of aStems) {
    if (bStems.has(stem)) shared += 1;
  }

  return shared / Math.max(aStems.size, bStems.size);
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

  const matches = Math.max(exactMatches, stemMatches * 0.88);
  const queryCoverage = matches / queryTokens.length;
  const secretCoverage = matches / secretTokens.length;
  const overlapScore = queryCoverage * 0.34 + secretCoverage * 0.48;

  let bestWordSimilarity = 0;
  for (const queryToken of queryTokens) {
    for (const secretToken of secretTokens) {
      bestWordSimilarity = Math.max(bestWordSimilarity, trigramSimilarity(queryToken, secretToken));
    }
  }

  const fuzzyWordScore = bestWordSimilarity >= 0.62 ? bestWordSimilarity * 0.58 : 0;
  return Math.max(overlapScore, fuzzyWordScore);
}

function getHintForScore(score: number): GuessHint {
  if (score >= 0.93) {
    return { level: 'almost', label: 'Почти оно', message: 'Очень близко, но формулировка ещё не та.' };
  }
  if (score >= 0.84) {
    return { level: 'burning', label: 'Почти обжигает', message: 'Ты совсем рядом.' };
  }
  if (score >= 0.72) {
    return { level: 'hot', label: 'Горячо', message: 'Есть несколько сильных совпадений.' };
  }
  if (score >= 0.55) {
    return { level: 'warm', label: 'Тепло', message: 'Есть что-то знакомое.' };
  }
  if (score >= 0.38) {
    return { level: 'warmer', label: 'Уже теплее', message: 'Направление похоже, но слабовато.' };
  }
  if (score >= 0.2) {
    return { level: 'cold', label: 'Холодно', message: 'Пока далеко.' };
  }

  return { level: 'ice', label: 'Ледяно', message: 'Тут вообще не рядом.' };
}

interface ScoredGuess {
  score: number;
  secretIndex: number;
}

function scoreGuess(query: string, secrets: string[]): ScoredGuess {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return { score: 0, secretIndex: -1 };

  return secrets.reduce<ScoredGuess>((best, secret, index) => {
    const normalizedSecret = normalizeText(secret);
    const queryTokens = getTokens(normalizedQuery);
    const secretTokens = getTokens(normalizedSecret);
    let phraseScore = trigramSimilarity(normalizedQuery, normalizedSecret);
    if (queryTokens.length === 1 && secretTokens.length > 1) {
      phraseScore = Math.min(phraseScore, 0.46);
    }
    const wordsScore = tokenScore(normalizedQuery, normalizedSecret);
    const score = Math.max(phraseScore, wordsScore);
    return score > best.score ? { score, secretIndex: index } : best;
  }, { score: 0, secretIndex: -1 });
}

function withTrend(hint: GuessHint, current: ScoredGuess, previous: ScoredGuess, query: string, previousQuery: string): GuessHint {
  const sameTarget = current.secretIndex >= 0 && current.secretIndex === previous.secretIndex;
  const relatedQuery = trigramSimilarity(query, previousQuery) >= 0.34 || tokenOverlapRatio(query, previousQuery) >= 0.34;
  if (!sameTarget && !relatedQuery) return hint;

  const delta = current.score - previous.score;
  if (Math.abs(delta) < 0.055) {
    return {
      ...hint,
      trend: 'same',
      label: `Так же · ${hint.label}`,
      message: 'По близости почти без изменений.',
    };
  }

  if (delta > 0) {
    return {
      ...hint,
      trend: 'warmer',
      label: `Теплее · ${hint.label}`,
      message: 'Стало ближе, продолжай в эту сторону.',
    };
  }

  return {
    ...hint,
    trend: 'colder',
    label: `Холоднее · ${hint.label}`,
    message: 'Этот вариант дальше предыдущего.',
  };
}

export function buildGuessHint(query: string, secrets: string[], previousQuery?: string): GuessHint {
  const current = scoreGuess(query, secrets);
  const hint = getHintForScore(current.score);

  if (!previousQuery) return hint;

  const previous = scoreGuess(previousQuery, secrets);
  return withTrend(hint, current, previous, query, previousQuery);
}
