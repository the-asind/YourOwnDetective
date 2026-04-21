import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onLogin: (name: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length > 0) {
      onLogin(cleanName);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-white safe-area-padding">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <h1 className="text-3xl font-medium tracking-tight mb-8 text-center text-gray-900">
          Войти в игру
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              className="w-full bg-gray-100 rounded-[24px] px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-gray-900 text-white rounded-[24px] px-6 py-4 text-lg font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            Продолжить
          </button>
        </form>
      </motion.div>
    </div>
  );
}
