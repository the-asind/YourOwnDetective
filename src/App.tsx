import { useState, useEffect } from 'react';
import Login from './Login';
import Game from './Game';
import Admin from './Admin';
import * as api from './api';

export default function App() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  useEffect(() => {
    // Basic routing
    if (window.location.pathname === '/admin') {
      setIsAdminRoute(true);
    }

    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
      // Register / re-register with backend
      api.addUser(savedName).catch(() => { });
    }
  }, []);

  if (isAdminRoute) {
    return <Admin />;
  }

  const handleLogin = async (name: string) => {
    localStorage.setItem('playerName', name);
    try {
      await api.addUser(name);
    } catch (err) {
      console.error('Failed to register user:', err);
    }
    setPlayerName(name);
  };

  if (!playerName) {
    return <Login onLogin={handleLogin} />;
  }

  return <Game playerName={playerName} />;
}
