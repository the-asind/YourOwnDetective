import { useState, useEffect, useCallback, useRef } from 'react';
import type { Square } from './data/mock';
import * as api from './api';

const POLL_INTERVAL = 5_000; // 5 seconds

// ── useSquares: fetch from API + polling ──

export function useSquares(admin = false) {
  const [squares, setSquares] = useState<Square[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getSquares(admin);
      if (mountedRef.current) setSquares(data);
    } catch (err) {
      console.error('[useSquares] fetch error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    const interval = setInterval(refresh, POLL_INTERVAL);

    // Also listen for local optimistic-update events
    const handleLocalUpdate = () => refresh();
    window.addEventListener('squares-updated', handleLocalUpdate);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('squares-updated', handleLocalUpdate);
    };
  }, [refresh]);

  // Optimistic local update + trigger refresh
  const updateLocal = useCallback((updater: (prev: Square[]) => Square[]) => {
    setSquares(updater);
    window.dispatchEvent(new Event('squares-updated'));
  }, []);

  return { squares, setSquares: updateLocal, loading, refresh };
}

// ── useUsers: fetch from API ──

export function useUsers() {
  const [users, setUsers] = useState<string[]>([]);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getUsers();
      if (mountedRef.current) setUsers(data);
    } catch (err) {
      console.error('[useUsers] fetch error:', err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener('users-updated', handleUpdate);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('users-updated', handleUpdate);
    };
  }, [refresh]);

  const handleRemoveUser = useCallback(async (name: string) => {
    try {
      await api.removeUser(name);
      setUsers((prev) => prev.filter((u) => u !== name));
      window.dispatchEvent(new Event('users-updated'));
    } catch (err) {
      console.error('[useUsers] remove error:', err);
    }
  }, []);

  return { users, removeUser: handleRemoveUser, refresh };
}
