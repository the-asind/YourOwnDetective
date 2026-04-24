import { Square } from '../data/mock';

export function getPlayableAudioUrl(square: Pick<Square, 'audioUrl' | 'audioFallbackUrl'>): string | undefined {
  if (typeof Audio === 'undefined') return square.audioUrl || square.audioFallbackUrl;

  const audio = new Audio();
  const canPlayOpus = audio.canPlayType('audio/webm; codecs="opus"');

  if (square.audioUrl && canPlayOpus) {
    return square.audioUrl;
  }

  return square.audioFallbackUrl || square.audioUrl;
}
