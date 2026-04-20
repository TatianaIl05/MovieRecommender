# Production Deployment Guide

## Architecture

- **nginx** - reverse proxy on host (port 80/443)
- **backend** - Node.js/Express in Docker (port 3000)
- **recommender** - Python/FastAPI in Docker (port 8000)
- **movies_db** - PostgreSQL in Docker (port 5432)
- **users_db** - PostgreSQL in Docker (port 5433)

## Prerequisites

1. Domain: `movierecommender.icu` pointing to server IP
2. SSL certificates in `/etc/nginx/ssl/`:
   - `movierecommender.icu.crt`
   - `movierecommender.icu.key`
3. Docker and Docker Compose installed
4. nginx installed on host

## Setup Steps

### 1. Copy nginx configuration

```bash
sudo cp nginx/movierecommender.icu.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/movierecommender.icu.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Build and start Docker services

```bash
docker-compose up --build -d
```

This starts:
- movies_db (PostgreSQL on 5432)
- users_db (PostgreSQL on 5433)
- backend (Node.js on 3000)
- recommender (FastAPI on 8000)

### 3. Build frontend and copy to nginx

```bash
cd frontend
npm install
npm run build
sudo mkdir -p /var/www/movierecommender
sudo cp -r dist/* /var/www/movierecommender/
sudo chown -R www-data:www-data /var/www/movierecommender
```

### 4. Verify services

```bash
curl http://localhost:3000/health
curl http://localhost:8000/health
curl https://movierecommender.icu
```

## SSL Certificate Setup

### Using Let's Encrypt (Recommended)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d movierecommender.icu -d www.movierecommender.icu
```

Certificates will be in `/etc/letsencrypt/live/movierecommender.icu/`

Update nginx config paths:
```nginx
ssl_certificate /etc/letsencrypt/live/movierecommender.icu/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/movierecommender.icu/privkey.pem;
```

### Auto-renewal

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Environment Variables

Backend uses Docker Compose service names for database connections (already configured in `docker-compose.yml`).

Frontend environment variables are set during build via `.env.production`.

## Monitoring

Check service logs:

```bash
docker-compose logs -f backend
docker-compose logs -f recommender
docker-compose logs -f movies_db
docker-compose logs -f users_db
```

Check nginx logs:

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Updating

### Update backend/recommender

```bash
docker-compose up --build -d backend recommender
```

### Update frontend

```bash
cd frontend
npm run build
sudo cp -r dist/* /var/www/movierecommender/
```

## Troubleshooting

**502 Bad Gateway**: Check if backend/recommender containers are running
```bash
docker-compose ps
```

**Connection refused**: Verify ports are not blocked
```bash
sudo netstat -tlnp | grep -E ':(3000|8000|5432|5433)'
```

**SSL errors**: Verify certificate paths and permissions
```bash
sudo ls -la /etc/nginx/ssl/
```

**Database connection issues**: Check container logs
```bash
docker-compose logs movies_db users_db
```
