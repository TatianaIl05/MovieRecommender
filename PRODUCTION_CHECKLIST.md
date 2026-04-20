# Чеклист развертывания на Production

## Перед развертыванием

### SSL сертификаты
- [ ] Получить SSL сертификаты для movierecommender.icu
- [ ] Поместить сертификаты в `/etc/letsencrypt/live/movierecommender.icu/` или обновить пути в конфиге nginx
- [ ] Проверить права доступа к сертификатам (читаемы для nginx)

### Подготовка сервера
- [ ] Установить Docker и Docker Compose
- [ ] Установить nginx на хосте (не в контейнере)
- [ ] Убедиться, что порты 80, 443, 3000, 5432, 5433, 8000 доступны
- [ ] Настроить firewall для разрешения портов 80/443 из интернета

### Конфигурация DNS
- [ ] Указать A запись movierecommender.icu на IP сервера
- [ ] Указать A запись www.movierecommender.icu на IP сервера
- [ ] Проверить распространение DNS с помощью `nslookup movierecommender.icu`

## Этапы развертывания

### 1. Конфигурация nginx
```bash
sudo cp nginx/movierecommender.icu.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/movierecommender.icu.conf /etc/nginx/sites-enabled/
sudo nginx -t
```

### 2. Сборка frontend
```bash
cd frontend
npm install
npm run build
sudo mkdir -p /var/www/movierecommender
sudo cp -r dist/* /var/www/movierecommender/
sudo chown -R www-data:www-data /var/www/movierecommender
```

### 3. Запуск Docker сервисов
```bash
cd /path/to/MovieRecommender
docker-compose up --build -d
```

### 4. Запуск nginx
```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Проверка после развертывания

### Проверка здоровья сервисов
- [ ] Backend: `curl http://localhost:3000/health`
- [ ] Recommender: `curl http://localhost:8000/health`
- [ ] Frontend: `curl https://movierecommender.icu`
- [ ] API через nginx: `curl https://movierecommender.icu/api/movies?limit=1`
- [ ] Recommender через nginx: `curl https://movierecommender.icu/recommender/health`

### Docker контейнеры
- [ ] Проверить, что все контейнеры запущены: `docker-compose ps`
- [ ] Проверить логи на ошибки:
  ```bash
  docker-compose logs backend
  docker-compose logs recommender
  docker-compose logs movies_db
  docker-compose logs users_db
  ```

### Подключение к БД
- [ ] Backend подключается к movies_db (проверить логи backend)
- [ ] Backend подключается к users_db (проверить логи backend)
- [ ] Данные БД сохраняются в `./movies_db/data` и `./users_db/data`

### nginx
- [ ] nginx запущен: `sudo systemctl status nginx`
- [ ] Нет ошибок в логах: `sudo tail -f /var/log/nginx/error.log`
- [ ] SSL работает: открыть https://movierecommender.icu в браузере
- [ ] HTTP редирект на HTTPS работает

### Frontend
- [ ] Статические файлы загружаются корректно
- [ ] JavaScript/CSS загружаются без ошибок (проверить консоль браузера)
- [ ] API вызовы работают (проверить вкладку Network)
- [ ] Вызовы Recommender API работают

## Чеклист безопасности

- [ ] Изменить пароли БД по умолчанию в docker-compose.yml
- [ ] Обновить пароли в backend/config/database.js
- [ ] Ограничить доступ к портам БД (5432, 5433) только localhost
- [ ] Ограничить доступ к портам backend/recommender (3000, 8000) только localhost
- [ ] Включить UFW/firewall: разрешить только 22, 80, 443
- [ ] Настроить автоматическое обновление SSL сертификатов с certbot
- [ ] Проверить настройки CORS в backend и recommender
- [ ] Добавить rate limiting в nginx (опционально)

## Настройка мониторинга

- [ ] Настроить ротацию логов nginx
- [ ] Настроить ротацию логов Docker контейнеров
- [ ] Настроить мониторинг свободного места на диске
- [ ] Настроить мониторинг доступности (опционально)
- [ ] Настроить резервное копирование томов БД

## Обслуживание

### Обновление приложения
```bash
# Получить последний код
git pull

# Пересобрать и перезапустить сервисы
docker-compose up --build -d

# Пересобрать frontend
cd frontend && npm run build
sudo cp -r dist/* /var/www/movierecommender/
```

### Просмотр логов
```bash
# Docker сервисы
docker-compose logs -f --tail=100 backend
docker-compose logs -f --tail=100 recommender

# nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Резервное копирование БД
```bash
# Резервная копия movies_db
docker exec movierecommender-movies_db-1 pg_dump -U admin movies > movies_backup.sql

# Резервная копия users_db
docker exec movierecommender-users_db-1 pg_dump -U admin users > users_backup.sql
```

## Решение проблем

### 502 Bad Gateway
- Проверить, запущены ли контейнеры backend/recommender
- Проверить логи backend/recommender на ошибки
- Проверить, слушают ли порты 3000 и 8000: `netstat -tlnp | grep -E ':(3000|8000)'`

### Ошибки SSL сертификата
- Проверить пути к сертификатам в конфиге nginx
- Проверить срок действия сертификата: `openssl x509 -in /etc/letsencrypt/live/movierecommender.icu/fullchain.pem -noout -dates`
- Убедиться, что nginx может читать сертификаты: `sudo ls -la /etc/letsencrypt/live/movierecommender.icu/`

### Ошибки подключения к БД
- Проверить, запущены ли контейнеры БД: `docker-compose ps`
- Проверить логи БД: `docker-compose logs movies_db users_db`
- Проверить, совпадают ли учетные данные в docker-compose.yml и backend/config/database.js

### Frontend не загружается
- Проверить, существуют ли файлы: `ls -la /var/www/movierecommender/`
- Проверить логи nginx: `sudo tail -f /var/log/nginx/error.log`
- Проверить конфиг nginx: `sudo nginx -t`

## Оптимизация производительности (Опционально)

- [ ] Включить gzip сжатие в nginx
- [ ] Настроить кеширование nginx для статических ассетов
- [ ] Настроить connection pooling для PostgreSQL
- [ ] Добавить Redis для управления сессиями
- [ ] Настроить CDN для статических ассетов
