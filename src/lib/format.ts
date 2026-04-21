import React from 'react';

export function formatTimeAgo(timestamp: number): string {
  const diffInMinutes = Math.floor((Date.now() - timestamp) / 60000);
  
  if (diffInMinutes < 1) return 'Только что';
  if (diffInMinutes < 60) return `${diffInMinutes} мин. назад`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  const remainingMinutes = diffInMinutes % 60;
  
  if (diffInHours < 24) {
    if (remainingMinutes === 0) return `${diffInHours} ч. назад`;
    return `${diffInHours} ч. ${remainingMinutes} мин. назад`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} дн. назад`;
}
