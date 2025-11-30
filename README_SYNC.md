# Быстрый старт: Синхронизация избранного

## Что нужно сделать для работы синхронизации

### 1. Создать проект в Supabase (5 минут)

1. Перейти на [supabase.com](https://supabase.com) → Start your project
2. Войти через GitHub
3. Создать новый проект (выбрать регион Europe West)
4. Подождать ~2 минуты пока создается

### 2. Создать таблицу (1 минута)

В Supabase → SQL Editor → выполнить:

```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  anime_id BIGINT NOT NULL,
  anime_slug TEXT NOT NULL,
  anime_name TEXT NOT NULL,
  anime_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE UNIQUE INDEX idx_favorites_user_anime ON favorites(user_id, anime_slug);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON favorites FOR ALL USING (true) WITH CHECK (true);
```
Error: Failed to run sql query: ERROR: 42P07: relation "favorites" already exists
### 3. Получить API ключи (30 секунд)

В Supabase → Project Settings → API:
- Скопировать **Project URL**
- Скопировать **anon/public key**

### 4. Добавить в .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=ваш-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-key
```

### 5. Перезапустить проект

```bash
npm run dev
```

## Готово! 🎉

Теперь:
- ✅ Войдите через Google
- ✅ Добавьте аниме в избранное
- ✅ Откройте сайт на другом устройстве - избранное синхронизируется!

## Для production

Добавьте те же переменные на хостинге:
- **Vercel**: Settings → Environment Variables
- **Render**: Dashboard → Environment
- **Netlify**: Site settings → Environment variables

## Подробная инструкция

См. файл `SUPABASE_SETUP.md`
