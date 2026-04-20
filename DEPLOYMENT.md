# Руководство по развертыванию на Production

## Архитектура

- **nginx** - reverse proxy на хосте (порты 80/443)
- **backend** - Node.js/Express в Docker (порт 3000)
- **recommender** - Python/FastAPI в Docker (порт 8000)
- **movies_db** - PostgreSQL в Docker (порт 5432)
- **users_db** - PostgreSQL в Docker (порт 5433)

## Предварительные требования

1. Домен: `movierecommender.icu` указывает на IP сервера
2. SSL сертификаты в `/etc/letsencrypt/live/movierecommender.icu/`:
   - `fullchain.pem`
   - `privkey.pem`
3. Docker и Docker Compose установлены
4. nginx установлен на хосте

## Этапы развертывания

### 1. Копирование конфигурации nginx

```bash
sudo cp nginx/movierecommender.icu.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/movierecommender.icu.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Запуск Docker сервисов

```bash
docker-compose up --build -d
```

Запускает:
- movies_db (PostgreSQL на 5432)
- users_db (PostgreSQL на 5433)
- backend (Node.js на 3000)
- recommender (FastAPI на 8000)

### 3. Сборка frontend и копирование в nginx

```bash
cd frontend
npm install
npm run build
sudo mkdir -p /var/www/movierecommender
sudo cp -r dist/* /var/www/movierecommender/
sudo chown -R www-data:www-data /var/www/movierecommender
```

**Важно:** Файлы копируются напрямую в `/var/www/movierecommender/` (не в `/var/www/movierecommender/dist/`)

### 4. Проверка сервисов

```bash
curl http://localhost:3000/health
curl http://localhost:8000/health
curl https://movierecommender.icu
```

## Настройка SSL сертификата

### Использование Let's Encrypt (Рекомендуется)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d movierecommender.icu -d www.movierecommender.icu
```

Сертификаты будут в `/etc/letsencrypt/live/movierecommender.icu/`

Пути в nginx конфиге уже указаны правильно:
```nginx
ssl_certificate /etc/letsencrypt/live/movierecommender.icu/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/movierecommender.icu/privkey.pem;
```

### Автоматическое обновление

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Переменные окружения

Backend использует имена сервисов Docker для подключения к БД (уже настроено в `docker-compose.yml`).

Frontend переменные окружения устанавливаются во время сборки через `.env.production`.

## Мониторинг

Просмотр логов сервисов:

```bash
# Docker сервисы
docker-compose logs -f backend
docker-compose logs -f recommender
docker-compose logs -f movies_db
docker-compose logs -f users_db
```

Просмотр логов nginx:

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Обновление

### Обновление backend/recommender

```bash
docker-compose up --build -d backend recommender
```

### Обновление frontend

```bash
cd frontend
npm run build
sudo cp -r dist/* /var/www/movierecommender/
```

## Решение проблем

**502 Bad Gateway**: Проверьте, запущены ли контейнеры backend/recommender
```bash
docker-compose ps
```

**Ошибка подключения**: Проверьте, не заблокированы ли порты
```bash
sudo netstat -tlnp | grep -E ':(3000|8000|5432|5433)'
```

**Ошибки SSL**: Проверьте пути к сертификатам и права доступа
```bash
sudo ls -la /etc/letsencrypt/live/movierecommender.icu/
```

**Ошибки подключения к БД**: Проверьте логи контейнеров
```bash
docker-compose logs movies_db users_db
```
