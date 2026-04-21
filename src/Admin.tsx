import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSquares, useUsers } from './store';
import { ContentType, Square } from './data/mock';
import * as api from './api';

const ADMIN_AUTH_KEY = 'admin_authenticated';

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');

    try {
      const result = await api.adminLogin(password);
      if (result.success) {
        sessionStorage.setItem(ADMIN_AUTH_KEY, '1');
        onSuccess();
      }
    } catch {
      setError('Неверный пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">🔒 Админ-панель</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Проверка...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const [isAuthed, setIsAuthed] = useState(() =>
    sessionStorage.getItem(ADMIN_AUTH_KEY) === '1',
  );

  if (!isAuthed) {
    return <AdminLogin onSuccess={() => setIsAuthed(true)} />;
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const { squares, refresh: refreshSquares } = useSquares(true); // admin=true → get secretNames
  const { users, removeUser } = useUsers();
  
  const [newTab, setNewTab] = useState<'squares' | 'users' | 'add'>('squares');
  
  // New square state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ContentType>('image');
  const [newDesc, setNewDesc] = useState('');
  const [newContentText, setNewContentText] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Edit square state
  const [editingSquare, setEditingSquare] = useState<Square | null>(null);

  const createSquare = async () => {
    if (!newName) return alert('Введите название!');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('secretName', newName.toLowerCase().trim());
      formData.append('type', newType);
      formData.append('description', newDesc);

      if (newType === 'text') {
        formData.append('contentText', newContentText);
      } else if (newFile) {
        formData.append('file', newFile);
      } else {
        setUploading(false);
        return alert('Добавьте файл или текст!');
      }

      await api.createSquare(formData);
      await refreshSquares();
      setNewTab('squares');
      setNewName(''); setNewFile(null); setNewContentText(''); setNewDesc('');
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveSquareEdit = async () => {
    if (!editingSquare) return;
    try {
      await api.updateSquare(editingSquare.id, {
        isOpened: editingSquare.isOpened,
        openedBy: editingSquare.openedBy,
        description: editingSquare.description,
      });
      await refreshSquares();
      setEditingSquare(null);
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800 pb-20">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 border border-gray-100">
        <h1 className="text-3xl font-bold mb-8">🛠 Панель Управления</h1>

        <div className="flex gap-4 border-b border-gray-200 mb-8 pb-1">
          <button onClick={() => setNewTab('squares')} className={`px-4 py-2 font-medium ${newTab === 'squares' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Квадраты</button>
          <button onClick={() => setNewTab('add')} className={`px-4 py-2 font-medium ${newTab === 'add' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>+ Добавить Квадрат</button>
          <button onClick={() => setNewTab('users')} className={`px-4 py-2 font-medium ${newTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Игроки ({users.length})</button>
          <a href="/" className="ml-auto px-4 py-2 font-medium text-gray-400 hover:text-gray-600">В игру ↗</a>
        </div>

        {newTab === 'squares' && (
          <div className="space-y-4">
            {squares.map(sq => (
              <div key={sq.id} className="p-4 rounded-lg border border-gray-200 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50">
                <div>
                  <div className="font-semibold text-lg flex items-center gap-2">
                    {sq.secretName} 
                    <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-gray-300 text-gray-500 uppercase tracking-widest">{sq.type}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Статус: {sq.isOpened ? <span className="text-green-600 font-medium">Открыт ({sq.openedBy})</span> : <span className="text-gray-400">Скрыт</span>}
                  </div>
                </div>
                <button 
                  onClick={() => setEditingSquare({...sq})}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100"
                >
                  Изменить
                </button>
              </div>
            ))}
          </div>
        )}

        {newTab === 'add' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Секретное слово (для отгадывания)</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Например: океан" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание (доп. текст)</label>
              <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип контента</label>
              <select value={newType} onChange={e => setNewType(e.target.value as ContentType)} className="w-full px-4 py-2 border rounded-lg bg-white">
                <option value="image">Фото / Картинка</option>
                <option value="text">Текст</option>
                <option value="audio">Аудио / Музыка</option>
              </select>
            </div>

            {newType === 'text' ? (
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Содержимое</label>
                 <textarea value={newContentText} onChange={e => setNewContentText(e.target.value)} className="w-full px-4 py-2 border rounded-lg h-32" />
               </div>
            ) : (
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Файл ({newType === 'audio' ? 'MP3, OGG, WAV' : 'JPG, PNG, WEBP'})</label>
                 <input type="file" accept={newType === 'audio' ? 'audio/*' : 'image/*'} onChange={e => setNewFile(e.target.files?.[0] || null)} className="w-full" />
                 {newType === 'image' && <p className="text-xs text-gray-500 mt-2">Картинка будет автоматически сжата на сервере до формата WebP.</p>}
               </div>
            )}

            <button disabled={uploading} onClick={createSquare} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {uploading ? 'Сохранение...' : 'Создать квадрат'}
            </button>
          </div>
        )}

        {newTab === 'users' && (
          <div className="space-y-4 max-w-xl">
             {users.length === 0 ? <p className="text-gray-500">Пока нет ни одного игрока.</p> : null}
             {users.map(u => (
               <div key={u} className="p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                 <div className="font-medium text-lg">{u}</div>
                 <button onClick={() => removeUser(u)} className="px-3 py-1 bg-red-50 text-red-600 rounded-md font-medium text-sm hover:bg-red-100">Удалить</button>
               </div>
             ))}
          </div>
        )}

      </div>

      {/* Edit Modal */}
      {editingSquare && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Изменить квадрат «{editingSquare.secretName}»</h3>
            
            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editingSquare.isOpened} onChange={e => setEditingSquare({...editingSquare, isOpened: e.target.checked})} className="w-5 h-5" />
                <span className="font-medium">Открыт</span>
              </label>

              {editingSquare.isOpened && (
                <div>
                  <label className="block text-sm font-medium mb-1">Кем открыт?</label>
                  <input type="text" value={editingSquare.openedBy || ''} onChange={e => setEditingSquare({...editingSquare, openedBy: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingSquare(null)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Отмена</button>
              <button onClick={saveSquareEdit} className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
