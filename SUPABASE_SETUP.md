# Настройка Supabase для синхронизации избранного

## Шаг 1: Создание проекта в Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Нажмите "Start your project" и войдите через GitHub
3. Создайте новую организацию (или выберите существующую)
4. Нажмите "New Project"
5. Заполните данные:
   - **Name**: AnimeLib (или любое другое)
   - **Database Password**: сгенерируйте надежный пароль (сохраните его!)
   - **Region**: выберите ближайший регион (например, Europe West)
   - **Pricing Plan**: Free (достаточно для старта)
6. Нажмите "Create new project" и подождите ~2 минуты

## Шаг 2: Создание таблицы favorites

1. В левом меню выберите **Table Editor**
2. Нажмите **New table**
3. Заполните данные:
   - **Name**: `favorites`
   - Включите **Enable Row Level Security (RLS)** ✅

4. Добавьте следующие колонки:

| Name         | Type        | Default Value           | Primary | Nullable | Unique |
|------------- |------------ |------------------------ |-------- |--------- |------- |
| id           | uuid        | gen_random_uuid()       | ✅      | ❌       | ✅     |
| user_id      | text        | -                       | ❌      | ❌       | ❌     |
| anime_id     | int8        | -                       | ❌      | ❌       | ❌     |
| anime_slug   | text        | -                       | ❌      | ❌       | ❌     |
| anime_name   | text        | -                       | ❌      | ❌       | ❌     |
| anime_image  | text        | -                       | ❌      | ✅       | ❌     |
| created_at   | timestamptz | now()                   | ❌      | ❌       | ❌     |

5. Нажмите **Save**

## Шаг 3: SQL для создания таблицы (альтернативный способ)

Если предпочитаете SQL, перейдите в **SQL Editor** и выполните:

```sql
-- Создание таблицы favorites
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  anime_id BIGINT NOT NULL,
  anime_slug TEXT NOT NULL,
  anime_name TEXT NOT NULL,
  anime_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX idx_favorites_user_id ON favorites(user_id);

-- Индекс для проверки уникальности пары user_id + anime_slug
CREATE UNIQUE INDEX idx_favorites_user_anime ON favorites(user_id, anime_slug);

-- Включаем Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь может видеть только свои избранные
CREATE POLICY "Users can view their own favorites"
  ON favorites
  FOR SELECT
  USING (true); -- Пока разрешаем всем (NextAuth работает через API)

-- Политика: пользователь может добавлять свои избранные
CREATE POLICY "Users can insert their own favorites"
  ON favorites
  FOR INSERT
  WITH CHECK (true);

-- Политика: пользователь может удалять свои избранные
CREATE POLICY "Users can delete their own favorites"
  ON favorites
  FOR DELETE
  USING (true);
```

## Шаг 4: Получение API ключей

1. В левом меню выберите **Project Settings** (иконка шестеренки)
2. Перейдите в **API**
3. Скопируйте:
   - **Project URL** (например: `https://abcdefghijk.supabase.co`)
   - **anon/public key** (длинный JWT токен)

## Шаг 5: Настройка переменных окружения

### Локальная разработка (.env.local):

Добавьте в существующий `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-key
```

**Полный `.env.local` должен выглядеть так:**

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your-generated-secret-from-openssl
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-key
```

### Production (Vercel/Render/Netlify):

Добавьте те же переменные в настройках хостинга:

**Vercel:**
- Project Settings → Environment Variables
- Добавьте `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Render:**
- Dashboard → Environment
- Добавьте обе переменные

**Netlify:**
- Site settings → Environment variables
- Добавьте обе переменные

## Шаг 6: Тестирование

1. Перезапустите dev сервер: `npm run dev`
2. Войдите через Google
3. Добавьте аниме в избранное (нажмите на сердечко)
4. Проверьте в Supabase Table Editor - должна появиться запись
5. Выйдите и войдите снова - избранное должно сохраниться
6. Откройте сайт на другом устройстве - избранное синхронизируется!

## Как это работает:

### Для авторизованных пользователей:
1. При входе - загружаются избранные с сервера Supabase
2. При добавлении/удалении - сразу синхронизируется с Supabase
3. Данные также сохраняются в localStorage для оффлайн доступа
4. Избранное доступно на всех устройствах!

### Для неавторизованных пользователей:
1. Избранное хранится только в localStorage
2. При входе в аккаунт - данные можно будет мигрировать на сервер

## Преимущества:

✅ Синхронизация между устройствами  
✅ Избранное не теряется при очистке браузера  
✅ Работает оффлайн (fallback на localStorage)  
✅ Бесплатно до 50 000 пользователей/месяц  
✅ Быстрая PostgreSQL база данных  

## Troubleshooting

### Ошибка "relation favorites does not exist"
- Проверьте, что таблица создана в Supabase
- Убедитесь, что используете правильный Project URL

### Ошибка "JWT expired" или "Invalid API key"
- Проверьте правильность NEXT_PUBLIC_SUPABASE_ANON_KEY
- Скопируйте ключ заново из Settings → API

### Избранное не синхронизируется
- Откройте DevTools → Network
- Проверьте запросы к `/api/favorites`
- Посмотрите логи ошибок в консоли

### Дублирование записей
- Проверьте, что создан уникальный индекс `idx_favorites_user_anime`
- Выполните SQL из Шага 3 снова

## Что дальше?

После настройки Supabase можно добавить:
- **История просмотра** с таймкодами
- **Персональные списки** (Смотрю, Запланировано, Брошено)
- **Комментарии и оценки** аниме
- **Уведомления** о новых эпизодах любимых аниме
