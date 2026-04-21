-- 002_seed.sql — Initial demo data (mirrors the old mock.ts)

-- Seed users that have "opened" squares in the demo
INSERT INTO users (name) VALUES ('Александр'), ('Петя')
ON CONFLICT (name) DO NOTHING;

-- Seed squares
INSERT INTO squares (id, secret_name, type, content, audio_url, description, is_opened, opened_by, opened_at, sort_order)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'горы',
    'image',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200&h=600',
    NULL,
    'Величавые горные пики, скрытые облаками (горизонтальное фото).',
    TRUE,
    'Александр',
    NOW() - INTERVAL '2 minutes',
    1
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'аудио звук Долгого звучания',
    'audio',
    '0:04',
    'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg',
    'Звуки океанских волн.',
    TRUE,
    'Александр',
    NOW() - INTERVAL '35 minutes',
    2
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'засечки',
    'text',
    E'Давным-давно, когда шрифты только начинали обретать свои современные формы, засечки служили не только украшением, но и своеобразными \"направляющими\" для глаз читателя. Этот текст написан классическим шрифтом, который специально подобран так, чтобы создать приятную атмосферу чтения книги.\n\nБолее того, он достаточно длинный, чтобы можно было проверить, как работает прокрутка внутри модального окна и как текст уходит за градиент на обложке квадрата.',
    NULL,
    'Интересный факт о типографике (длинный текст).',
    TRUE,
    'Петя',
    NOW() - INTERVAL '62 minutes',
    3
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'океан',
    'image',
    'https://images.unsplash.com/photo-1468581264429-2548ef9eb732?auto=format&fit=crop&q=80&w=800&h=1200',
    NULL,
    'Вертикальное фото океана.',
    FALSE,
    NULL,
    NULL,
    4
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'лес',
    'image',
    'https://images.unsplash.com/photo-1448375240586-882707db8855?auto=format&fit=crop&q=80&w=800&h=800',
    NULL,
    'Густой хвойный лес в утреннем тумане',
    FALSE,
    NULL,
    NULL,
    5
  ),
  (
    'a0000000-0000-0000-0000-000000000006',
    'аудио звук длинный, большое название',
    'audio',
    '0:12',
    'https://actions.google.com/sounds/v1/water/storm_drain.ogg',
    'Вой ветра.',
    FALSE,
    NULL,
    NULL,
    6
  ),
  (
    'a0000000-0000-0000-0000-000000000007',
    'секрет',
    'text',
    'Это тайное послание, которое вы смогли расшифровать благодаря своей настойчивости.',
    NULL,
    'Скрытый текст',
    FALSE,
    NULL,
    NULL,
    7
  ),
  (
    'a0000000-0000-0000-0000-000000000008',
    'космос',
    'image',
    'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=800&h=800',
    NULL,
    'Туманность в далеком космосе',
    FALSE,
    NULL,
    NULL,
    8
  ),
  (
    'a0000000-0000-0000-0000-000000000009',
    'сообщение',
    'text',
    'Иногда самое важное скрыто на самом видном месте, стоит лишь присмотреться.',
    NULL,
    'Мудрость дня',
    FALSE,
    NULL,
    NULL,
    9
  )
ON CONFLICT (id) DO NOTHING;
