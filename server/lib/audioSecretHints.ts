export interface AudioSecretHint {
  position: number;
  width: number;
}

const MIN_SECRET_SIMILARITY = 0.9;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function deterministicBlur(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return (hash % 900) / 100 - 4.5;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          ),
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 0;

  return 1 - levenshteinDistance(a, b) / maxLen;
}

interface TranscriptWord {
  value: string;
  start: number;
  end: number;
}

function getTranscriptWords(transcript: string): TranscriptWord[] {
  return Array.from(transcript.matchAll(/\S+/gu), (match) => ({
    value: match[0],
    start: match.index || 0,
    end: (match.index || 0) + match[0].length,
  }));
}

function findSecretOccurrence(transcript: string, words: TranscriptWord[], secret: string): { start: number; length: number } | null {
  const normalizedSecret = normalizeText(secret);
  const secretTokens = normalizedSecret.split(' ').filter(Boolean);
  if (normalizedSecret.length < 4 || !secretTokens.length || words.length < secretTokens.length) return null;

  let best: { score: number; start: number; length: number } | null = null;

  for (let index = 0; index <= words.length - secretTokens.length; index += 1) {
    const start = words[index].start;
    const end = words[index + secretTokens.length - 1].end;
    const candidate = transcript.slice(start, end);
    const score = similarity(candidate, normalizedSecret);

    if (score >= MIN_SECRET_SIMILARITY && (!best || score > best.score)) {
      best = { score, start, length: candidate.length };
    }
  }

  return best ? { start: best.start, length: best.length } : null;
}

export function buildAudioSecretHints(description: string | null | undefined, secrets: string[]): AudioSecretHint[] {
  const transcript = normalizeText(description || '');
  if (!transcript || !secrets.length) return [];

  const words = getTranscriptWords(transcript);
  const hints: AudioSecretHint[] = [];
  const seen = new Set<string>();

  for (const secret of secrets) {
    const occurrence = findSecretOccurrence(transcript, words, secret);
    if (!occurrence) continue;

    const rawPosition = ((occurrence.start + occurrence.length / 2) / transcript.length) * 100;
    const position = Math.max(4, Math.min(96, rawPosition + deterministicBlur(secret)));
    const key = `${Math.round(position / 4) * 4}`;

    if (!seen.has(key)) {
      hints.push({
        position,
        width: normalizeText(secret).includes(' ') ? 16 : 12,
      });
      seen.add(key);
    }
  }

  return hints.slice(0, 8);
}
