export type ContentType = 'image' | 'text' | 'audio';

export interface Square {
  id: string;
  secretName: string;
  type: ContentType;
  content: string;
  audioUrl?: string;
  audioFallbackUrl?: string;
  isOpened: boolean;
  openedBy?: string;
  openedAt?: number;
  description?: string;
}
