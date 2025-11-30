# Настройка Google OAuth для AnimeLib

## Шаг 1: Создание проекта в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Название проекта: `AnimeLib` (или любое другое)

## Шаг 2: Настройка OAuth consent screen

1. В меню слева выберите **APIs & Services** → **OAuth consent screen**
2. Выберите тип пользователя: **External** (для публичного доступа)
3. Заполните форму:
   - **App name**: AnimeLib
   - **User support email**: ваш email
   - **Developer contact email**: ваш email
4. Нажмите **Save and Continue**
5. Пропустите раздел **Scopes** (нажмите **Save and Continue**)
6. Добавьте тестовых пользователей (ваш email для тестирования)
7. Нажмите **Save and Continue**

## Шаг 3: Создание OAuth 2.0 Client ID

1. В меню слева выберите **APIs & Services** → **Credentials**
2. Нажмите **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `AnimeLib Web Client`
5. **Authorized redirect URIs** - добавьте следующие URL:

### Для локальной разработки:
```
http://localhost:3000/api/auth/callback/google
```

### Для production (замените на ваш домен):

**Vercel:**
```
https://your-app.vercel.app/api/auth/callback/google
```

**Render:**
```
https://your-app.onrender.com/api/auth/callback/google
```

**Netlify:**
```
https://your-app.netlify.app/api/auth/callback/google
```

**Custom domain:**
```
https://your-domain.com/api/auth/callback/google
```

6. Нажмите **Create**
7. Скопируйте **Client ID** и **Client Secret**

## Шаг 4: Настройка переменных окружения

### Локальная разработка:

1. Создайте файл `.env.local` в корне проекта:

```bash
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=ваш-client-id-из-google-console
GOOGLE_CLIENT_SECRET=ваш-client-secret-из-google-console
```

2. Сгенерируйте `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Production (Vercel/Render/Netlify):

В настройках вашего хостинга добавьте переменные окружения:

**Vercel:**
1. Project Settings → Environment Variables
2. Добавьте все переменные из `.env.local`
3. `NEXTAUTH_URL` = `https://your-app.vercel.app`

**Render:**
1. Dashboard → Environment
2. Добавьте все переменные
3. `NEXTAUTH_URL` = `https://your-app.onrender.com`

**Netlify:**
1. Site settings → Environment variables
2. Добавьте все переменные
3. `NEXTAUTH_URL` = `https://your-app.netlify.app`

## Шаг 5: Обновление redirect URI после деплоя

После деплоя на production:
1. Вернитесь в Google Cloud Console
2. Credentials → ваш OAuth Client
3. Добавьте реальный production URL в Authorized redirect URIs
4. Сохраните изменения

## Шаг 6: Тестирование

1. Запустите проект: `npm run dev`
2. Откройте http://localhost:3000
3. Нажмите кнопку "Войти" в header
4. Выберите Google аккаунт
5. Разрешите доступ к профилю

## Что дальше?

После успешной настройки авторизации:
- Добавьте базу данных (Supabase/PlanetScale) для хранения пользовательских данных
- Синхронизируйте избранное с сервером
- Добавьте историю просмотра с таймкодами
- Реализуйте персональные списки аниме

## Устранение проблем

### Ошибка "redirect_uri_mismatch"
- Проверьте, что URL в Google Console точно совпадает с NEXTAUTH_URL
- URL должен включать `/api/auth/callback/google`
- Проверьте протокол (http vs https)

### Ошибка "invalid_client"
- Проверьте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET
- Убедитесь, что переменные окружения загружены

### Сессия не сохраняется
- Проверьте NEXTAUTH_SECRET
- Убедитесь, что куки не блокируются браузером
