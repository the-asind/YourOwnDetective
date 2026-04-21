# 🔲 Секретные Квадраты

Мобильная веб-игра, в которой игроки угадывают спрятанные слова, чтобы разблокировать визуальный, текстовый или аудио контент. Открытые «квадраты» формируют общую ленту (в стиле профиля Instagram), где можно отслеживать, кто и когда сделал открытие.

## ✨ Ключевые особенности

- **Минималистичный вход:** Никаких паролей — игрок просто вводит своё имя.
- **Интеллектуальный поиск:** Поиск прощает опечатки (алгоритм расстояния Левенштейна, совпадение >95%).
- **Система выносливости (Stamina):** 3 секции с плавной регенерацией в фоне.
- **Умная лента контента:** Горизонтальные свайп-вкладки с фильтрацией по игрокам.
- **BottomSheet:** Жест свайпа вниз для закрытия, адаптивная высота, скролл контента.
- **Аудиоплеер (Web Audio API):** Автовоспроизведение, живая спектрограмма, предзагрузка метаданных.
- **Админ-панель:** Защищённая паролем, доступна по маршруту `/admin`.

## 🛠 Технологический стек

### Frontend
- **React 19** + **TypeScript**
- **Vite** — сборщик
- **Tailwind CSS v4** — стилизация (Mobile-first)
- **Framer Motion** — анимации
- **Lucide React** — иконки

### Backend
- **Express** — REST API сервер
- **PostgreSQL 16** — база данных
- **MinIO** — S3-совместимое хранилище файлов (картинки, аудио)
- **Sharp** — серверное сжатие изображений (WebP, max 1200px)

### Инфраструктура
- **Docker Compose** — всё в одном стеке на одной ВМ
- Один `docker-compose up` поднимает: приложение + PostgreSQL + MinIO

## 🚀 Запуск

### Через Docker Compose (рекомендуется)

```bash
# Клонировать и перейти в директорию
git clone <repo-url> && cd YourOwnDetective

# (Опционально) Задать пароль админки
export ADMIN_PASSWORD=my_secret_password

# Поднять всё
docker-compose up --build -d

# Приложение доступно на http://localhost:3000
# MinIO Console (отладка) на http://localhost:9001
```

### Локальная разработка

```bash
# Скопировать и заполнить .env
cp .env.example .env

# Установить зависимости
npm install

# Поднять PostgreSQL и MinIO (без приложения)
docker-compose up postgres minio -d

# Запустить фронт + бэк одновременно
npm run dev
# → Vite на :3000, Express API на :3001
# → Vite проксирует /api и /media на :3001
```

## 🔑 Переменные окружения

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `DATABASE_URL` | `postgres://app:secret@localhost:5432/detective` | Подключение к PostgreSQL |
| `S3_ENDPOINT` | `http://localhost:9000` | Адрес MinIO |
| `S3_ACCESS_KEY` | `minioadmin` | Ключ доступа MinIO |
| `S3_SECRET_KEY` | `minioadmin` | Секретный ключ MinIO |
| `S3_BUCKET` | `squares-media` | Бакет для медиафайлов |
| `ADMIN_PASSWORD` | `admin` | Пароль для входа в админку |
| `PORT` | `3001` (dev) / `3000` (docker) | Порт сервера |

## 📡 API Эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| `GET` | `/api/squares` | Список квадратов (`secretName` скрыт для закрытых) |
| `GET` | `/api/squares?admin=true` | Список квадратов (полный, для админки) |
| `POST` | `/api/squares` | Создать квадрат (multipart/form-data) |
| `PUT` | `/api/squares/:id` | Обновить квадрат |
| `DELETE` | `/api/squares/:id` | Удалить квадрат |
| `GET` | `/api/users` | Список игроков |
| `POST` | `/api/users` | Регистрация по имени |
| `DELETE` | `/api/users/:name` | Удалить игрока |
| `POST` | `/api/guess` | Попытка угадать слово (серверная валидация) |
| `POST` | `/api/admin/login` | Проверка пароля админки |
| `GET` | `/api/health` | Проверка состояния сервера |

## 📂 Структура проекта

```
├── docker-compose.yml          # PostgreSQL + MinIO + App
├── Dockerfile                  # Multi-stage сборка
├── server/
│   ├── index.ts                # Express entry point
│   ├── db.ts                   # PostgreSQL пул подключений
│   ├── storage.ts              # S3/MinIO клиент
│   ├── migrate.ts              # Автоматические SQL миграции
│   ├── routes/
│   │   ├── squares.ts          # CRUD квадратов + upload файлов
│   │   ├── users.ts            # Управление игроками
│   │   ├── game.ts             # Серверная валидация guess
│   │   └── admin.ts            # Аутентификация админки
│   ├── lib/
│   │   └── match.ts            # Левенштейн (серверная копия)
│   └── migrations/
│       ├── 001_init.sql         # Схема таблиц
│       └── 002_seed.sql         # Начальные данные
├── src/
│   ├── App.tsx                 # Роутер (Игра / Админка / Логин)
│   ├── Game.tsx                # Игровая сетка + поиск
│   ├── Admin.tsx               # Панель управления (с паролем)
│   ├── Login.tsx               # Экран входа
│   ├── api.ts                  # Fetch-обёртки API клиента
│   ├── store.ts                # React хуки (API + polling)
│   ├── data/mock.ts            # TypeScript типы Square, ContentType
│   ├── components/
│   │   └── BottomSheet.tsx     # Модальное окно + Web Audio
│   ├── hooks/
│   │   └── useStamina.ts       # Логика выносливости
│   └── lib/
│       ├── match.ts            # Левенштейн (клиентская)
│       └── format.ts           # Форматирование времени
└── .env.example                # Шаблон переменных окружения
```

## 🔒 Безопасность

- **secretName скрыт** — API не возвращает секретные слова для закрытых квадратов
- **Валидация на сервере** — Левенштейн-проверка выполняется на бэкенде, клиент не видит ответы
- **Атомарное открытие** — `WHERE is_opened = FALSE` предотвращает race condition при одновременных угадываниях
- **Пароль админки** — задаётся через `ADMIN_PASSWORD`, кешируется в `sessionStorage` на время сессии