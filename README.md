# MovieRecommender

Веб-приложение для рекомендации фильмов на основе личных предпочтений пользователя.

## Стек технологий

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **ML-сервис**: Python + FastAPI
- **База данных**: PostgreSQL (2 базы данных)

## Быстрый старт

```bash
docker-compose up --build
```

Приложение доступно по адресу http://localhost:5173

## Сервисы

| Сервис | Порт | URL |
|--------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend | 3000 | http://localhost:3000 |
| Recommender | 8000 | http://localhost:8000 |

## Разработка

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
node server.js
```

### Recommender
```bash
cd recommender
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000
```

## Функции

- Регистрация и вход пользователей
- Просмотр фильмов с поиском и пагинацией
- Добавление фильмов в Избранное / Смотреть позже
- Персонализированные рекомендации на основе избранного
- Популярные фильмы, если избранное пусто

## API Endpoints

- `POST /api/register` - Регистрация пользователя
- `POST /api/login` - Вход пользователя
- `GET /api/movies` - Список фильмов (поддерживает `search`, `limit`, `offset`)
- `GET /api/movies/popular` - Популярные фильмы
- `POST /api/movies/by-ids` - Получить фильмы по ID
- `GET/POST/DELETE /api/favorites/:user_id` - Список избранного
- `GET/POST/DELETE /api/watch-later/:user_id` - Список "Смотреть позже"
- `GET/POST/DELETE /api/selected/:user_id` - Выбранные фильмы

## Структура проекта

```
backend/
├── config/database.js
├── controllers/       # auth, movies, userLists, selected
└── routes/           # Express роуты

frontend/src/
├── pages/            # Home, Recommend, WatchLater, Profile, Auth
└── components/       # Header, MovieCard, MovieModal
```