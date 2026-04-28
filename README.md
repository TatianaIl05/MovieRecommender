# MovieRecommender

Веб-приложение для рекомендации фильмов на основе личных предпочтений пользователя с использованием машинного обучения.

## Стек технологий

- **Frontend**: React 18 + Vite 5
- **Backend**: Node.js 20 + Express
- **ML-сервис**: Python 3.12 + FastAPI
- **База данных**: PostgreSQL 16 (2 базы: movies_db, users_db)
- **Деплой**: Docker Compose + nginx + GitHub Actions CI/CD

## Быстрый старт

### 1. Запуск Backend и Recommender через Docker

```bash
docker-compose up --build
```

### 2. Запуск Frontend отдельно

```bash
cd frontend
npm install
npm run dev
```

Приложение доступно по адресу http://localhost:5173

### Проверка работоспособности

- Frontend: http://localhost:5173
- Backend: http://localhost:3000/health
- Recommender: http://localhost:8000/health

## Архитектура

### Почему фронтенд не в Docker?

**Production архитектура:**
- Frontend собирается в статические файлы (`npm run build`) и раздается через **nginx на хосте**
- Backend и Recommender работают в **Docker контейнерах**
- nginx на хосте управляет SSL сертификатами и проксирует запросы к API

**Преимущества такого подхода:**
- ✅ Максимальная производительность раздачи статики через nginx
- ✅ Централизованное управление SSL (Let's Encrypt автообновление)
- ✅ Единая точка входа для всех запросов
- ✅ Стандартная production практика для SPA приложений
- ✅ Меньше контейнеров = проще мониторинг

**Development режим:**
- Frontend запускается локально через `npm run dev` (Vite dev server)
- Vite автоматически проксирует API запросы к Docker контейнерам

### Схема сервисов

| Сервис | Порт | Где работает | Описание |
|--------|------|--------------|----------|
| Frontend (dev) | 5173 | Локально | Vite dev server для разработки |
| Frontend (prod) | 80/443 | nginx на хосте | Статические файлы через nginx |
| Backend | 3000 | Docker | REST API на Express |
| Recommender | 8000 | Docker | ML-сервис рекомендаций на FastAPI |
| movies_db | 5432 | Docker | PostgreSQL с данными фильмов |
| users_db | 5433 | Docker | PostgreSQL с данными пользователей |

## Разработка

### Frontend (отдельно от Docker)

```bash
cd frontend
npm install
npm run dev
```

Vite автоматически проксирует запросы:
- `/api` → http://localhost:3000 (backend)
- `/recommender` → http://localhost:8000 (ML-сервис)

### Backend (отдельно от Docker)

**Важно**: Измени хосты БД на `localhost` в `backend/config/database.js` перед запуском

```bash
cd backend
npm install
node server.js
```

### Recommender (отдельно от Docker)

```bash
cd recommender
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000
```

## Функциональность

- Регистрация и аутентификация пользователей
- Каталог фильмов с поиском и пагинацией (40 фильмов на страницу)
- Добавление фильмов в "Избранное" и "Смотреть позже"
- Персонализированные рекомендации на основе избранного (до 30000 фильмов)
- Популярные фильмы для новых пользователей
- Модальные окна с детальной информацией о фильмах

## API Endpoints

### Аутентификация
- `POST /api/register` - Регистрация пользователя
- `POST /api/login` - Вход пользователя

### Фильмы
- `GET /api/movies?search=query&limit=20&offset=0` - Список фильмов с поиском
- `GET /api/movies/popular?limit=20&offset=0` - Популярные фильмы
- `GET /api/movies/:id` - Детали фильма
- `POST /api/movies/by-ids` - Получить фильмы по массиву ID

### Пользовательские списки
- `GET /api/favorites/:user_id` - Получить избранное
- `POST /api/favorites/:user_id` - Добавить в избранное
- `DELETE /api/favorites/:user_id/:movie_id` - Удалить из избранного
- `GET /api/watch-later/:user_id` - Получить список "Смотреть позже"
- `POST /api/watch-later/:user_id` - Добавить в "Смотреть позже"
- `DELETE /api/watch-later/:user_id/:movie_id` - Удалить из "Смотреть позже"

### ML-рекомендации
- `POST /recommender/api/recommend` - Рекомендации по tmdb_id
  ```json
  {"tmdb_ids": [550, 680], "k": 10, "alpha": 0.75}
  ```
- `POST /recommender/api/recommend/by-title` - Рекомендации по названиям
  ```json
  {"movies": ["Inception", "Interstellar"], "k": 10, "alpha": 0.75}
  ```

## Структура проекта

```
MovieRecommender/
├── backend/
│   ├── config/
│   │   └── database.js       # Подключение к PostgreSQL с retry логикой
│   ├── controllers/          # Бизнес-логика
│   │   ├── authController.js
│   │   ├── moviesController.js
│   │   ├── userListsController.js
│   │   └── selectedController.js
│   ├── routes/              # Express роуты
│   ├── Dockerfile
│   └── server.js            # Точка входа
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # Home, Recommend, WatchLater, Profile, Auth
│   │   ├── components/      # Header, MovieCard, MovieModal
│   │   └── App.jsx
│   ├── vite.config.js       # Proxy конфигурация
│   └── package.json
│
├── recommender/
│   ├── api.py               # FastAPI endpoints
│   ├── recommender.py       # ML модель
│   ├── requirements.txt
│   └── Dockerfile
│
├── .github/workflows/       # CI/CD конфигурация
│   ├── backend-ci.yml
│   ├── frontend-ci.yml
│   ├── recommender-ci.yml
│   ├── deploy-backend.yml
│   ├── deploy-frontend.yml
│   └── deploy-recommender.yml
│
├── nginx/                   # Конфигурация nginx для продакшена
├── docker-compose.yml
└── AGENTS.md               # Инструкции для AI агентов
```

## CI/CD

Проект использует GitHub Actions для автоматического тестирования и деплоя:

### CI (Continuous Integration)
- Запускается на каждый push/PR в ветки `main` и `develop`
- Проверяет синтаксис и собирает проект
- Деплой происходит только если CI тесты прошли успешно

### CD (Continuous Deployment)
- Автоматический деплой на продакшн при push в `main`
- Frontend: сборка и копирование в `/var/www/movierecommender/`
- Backend/Recommender: пересборка Docker контейнеров

**Требуемые GitHub Secrets:**
- `SERVER_HOST` - IP или hostname сервера
- `SERVER_USER` - SSH пользователь
- `SSH_PRIVATE_KEY` - Приватный SSH ключ

Подробнее: `.github/workflows/README.md`

## Продакшн деплой

### Требования
- Ubuntu 22.04+
- Docker и Docker Compose
- Node.js 20+ (для сборки фронтенда)
- nginx
- SSL сертификаты (Let's Encrypt)

### Ручной деплой

```bash
# Backend и Recommender
docker-compose up -d --build backend recommender

# Frontend
cd frontend
npm install
npm run build
sudo cp -r dist/* /var/www/movierecommender/
```

### nginx конфигурация

nginx проксирует запросы:
- `/` → статические файлы из `/var/www/movierecommender/`
- `/api/` → backend:3000
- `/recommender/` → recommender:8000

Конфигурация: `nginx/movierecommender.icu.conf`

## Особенности реализации

- **Retry логика**: Backend переподключается к БД до 20 раз с задержкой 2 секунды
- **Lazy loading**: ML модель загружается при старте recommender сервиса
- **Client-side пагинация**: Рекомендации загружаются пачкой (k=30000), отображаются по 40
- **Bulk fetch**: Детали фильмов загружаются пачками через `/api/movies/by-ids`
- **Fallback**: Если нет избранного, показываются популярные фильмы

## Лицензия

MIT