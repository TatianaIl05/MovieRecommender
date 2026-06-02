# Movie Recommender

Movie Recommender - веб-приложение для поиска фильмов, ведения личных списков и получения персонализированных рекомендаций.

Проект объединяет React-фронтенд, Express API, две PostgreSQL базы данных и отдельный FastAPI-сервис рекомендаций. Каталог поддерживает fuzzy search по названиям, фильтры и пагинацию, а рекомендательная часть использует признаки фильмов, TF-IDF и показатель популярности.

## Возможности

- Каталог фильмов с поиском, фильтрами и постраничной загрузкой.
- Главная выдача с weighted-random сортировкой: популярность повышает позицию фильма, но не убирает разнообразие.
- Регистрация с подтверждением email.
- Вход по логину или email.
- Пользовательские списки: избранное, смотреть позже, выбранное, не рекомендовать.
- Персональные рекомендации на основе избранных фильмов.
- Fallback на популярные фильмы для новых пользователей.
- Модальное окно фильма с постером, описанием, метаданными и быстрыми действиями.

## Архитектура

| Часть | Стек | Назначение |
| --- | --- | --- |
| Frontend | React 18, Vite | SPA-интерфейс |
| Backend | Node.js, Express | Auth, каталог, пользовательские списки |
| Recommender | Python, FastAPI | Рекомендательная логика |
| movies_db | PostgreSQL | Данные фильмов и поисковые индексы |
| users_db | PostgreSQL | Пользователи и личные списки |

Структура проекта:

```text
frontend/     React-приложение, страницы и компоненты
backend/      Express API, контроллеры, роуты, подключение к БД
recommender/  FastAPI-сервис и модель рекомендаций
movies_db/    init-скрипты и CSV-данные фильмов
users_db/     init-скрипты пользовательской БД
nginx/        пример конфигурации reverse proxy
```

## Рекомендации

`recommender/` загружает `movies.csv` и `tfidf.csv` при старте. Рекомендации строятся на похожести фильмов и дополнительно смешиваются с нормализованной популярностью через параметр `alpha`.

Главная страница использует deterministic weighted random: seed сохраняет стабильную пагинацию, а `popularity_norm` повышает шанс фильма оказаться выше в списке.

## Email Verification

При регистрации пользователь создаётся в неподтверждённом состоянии. Backend отправляет ссылку подтверждения email через Resend API по HTTPS. SMTP оставлен как fallback для окружений, где он доступен.

Создайте локальный `.env` на основе `.env.example`:

```env
PUBLIC_APP_URL=https://your-domain.example
RESEND_API_KEY=your_resend_api_key
MAIL_FROM="Movie Recommender <noreply@your-domain.example>"
```

Реальные `.env` файлы и API-ключи нельзя коммитить в репозиторий.

## Быстрый Старт

Запуск backend, recommender и баз данных:

```bash
docker compose up --build
```

Запуск frontend в dev-режиме:

```bash
cd frontend
npm install
npm run dev
```

Локальные адреса:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:3000/health`
- Recommender health check: `http://localhost:8000/health`

Vite dev server проксирует:

- `/api` в backend
- `/recommender` в recommender

## Проверка

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
node -c backend/server.js
node -c backend/controllers/authController.js
node -c backend/controllers/moviesController.js
node -c backend/controllers/userListsController.js
node -c backend/services/emailService.js
```

Recommender:

```bash
cd recommender
python -m py_compile api.py recommender.py
```

Docker Compose:

```bash
docker compose config
```

## API

Auth:

- `POST /api/register`
- `POST /api/login`
- `GET /api/verify-email?token=...`

Movies:

- `GET /api/movies`
- `GET /api/movies/suggest`
- `GET /api/movies/filters`
- `GET /api/movies/popular`
- `GET /api/movies/:movie_id`
- `POST /api/movies/by-ids`

User lists:

- `GET|POST /api/favorites/:user_id`
- `GET|POST /api/watch-later/:user_id`
- `GET|POST /api/selected/:user_id`
- `GET|POST /api/disliked/:user_id`
- `DELETE /api/<list>/:user_id/:movie_id`

Recommendations:

- `POST /recommender/api/recommend`
- `POST /recommender/api/recommend/by-title`

## Production Notes

В production frontend можно собрать в статические файлы и отдавать через nginx. Backend и recommender пересобираются через Docker Compose:

```bash
docker compose build --no-cache backend recommender
docker compose up -d backend recommender
```

Перед запуском backend на сервере задайте приватный `.env` с `PUBLIC_APP_URL`, `RESEND_API_KEY` и `MAIL_FROM`.

## Лицензия

MIT
