export type ContentType = 'image' | 'text' | 'audio' | 'video';

export interface Square {
  id: string;
  secretName: string;
  type: ContentType;
  content: string;
  audioUrl?: string;
  audioFallbackUrl?: string;
  audioHints?: Array<{
    position: number;
    width: number;
  }>;
  isOpened: boolean;
  openedBy?: string;
  openedAt?: number;
  description?: string;
}
