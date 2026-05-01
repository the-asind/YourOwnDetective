export interface AudioSecretHint {
  position: number;
  width: number;
}

const STOP_WORDS = new Set([
  'а',
  'в',
  'во',
  'все',
  'всё',
  'где',
  'для',
  'до',
  'и',
  'из',
  'или',
  'как',
  'к',
  'ко',
  'мне',
  'мы',
  'на',
  'нам',
  'не',
  'но',
  'о',
  'об',
  'он',
  'она',
  'они',
  'от',
  'по',
  'под',
  'про',
  'с',
  'со',
  'так',
  'там',
  'то',
  'туда',
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deterministicBlur(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return (hash % 900) / 100 - 4.5;
}

function targetCandidates(secret: string): string[] {
  const normalized = normalizeText(secret);
  const tokens = normalized
    .split(' ')
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));

  return Array.from(new Set([
    ...(normalized.length >= 4 ? [normalized] : []),
    ...tokens,
  ]));
}

export function buildAudioSecretHints(description: string | null | undefined, secrets: string[]): AudioSecretHint[] {
  const transcript = normalizeText(description || '');
  if (!transcript || !secrets.length) return [];

  const hints: AudioSecretHint[] = [];
  const seen = new Set<string>();

  for (const secret of secrets) {
    for (const candidate of targetCandidates(secret)) {
      const pattern = new RegExp(`(^| )${escapeRegExp(candidate)}(?= |$)`, 'u');
      const match = pattern.exec(transcript);
      if (!match || match.index < 0) continue;

      const start = match.index + (match[1] ? match[1].length : 0);
      const rawPosition = ((start + candidate.length / 2) / transcript.length) * 100;
      const position = Math.max(4, Math.min(96, rawPosition + deterministicBlur(`${secret}:${candidate}`)));
      const key = `${Math.round(position / 4) * 4}`;

      if (!seen.has(key)) {
        hints.push({
          position,
          width: candidate.includes(' ') ? 16 : 12,
        });
        seen.add(key);
      }

      break;
    }
  }

  return hints.slice(0, 8);
}
