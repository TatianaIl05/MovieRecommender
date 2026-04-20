# Production Deployment Checklist

## Pre-Deployment

### SSL Certificates
- [ ] Obtain SSL certificates for movierecommender.icu
- [ ] Place certificates in `/etc/nginx/ssl/` or update nginx config with Let's Encrypt paths
- [ ] Verify certificate permissions (readable by nginx)

### Server Setup
- [ ] Install Docker and Docker Compose
- [ ] Install nginx on host (not in container)
- [ ] Ensure ports 80, 443, 3000, 5432, 5433, 8000 are available
- [ ] Configure firewall to allow 80/443 from internet

### DNS Configuration
- [ ] Point movierecommender.icu A record to server IP
- [ ] Point www.movierecommender.icu A record to server IP
- [ ] Verify DNS propagation with `nslookup movierecommender.icu`

## Deployment Steps

### 1. nginx Configuration
```bash
sudo cp nginx/movierecommender.icu.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/movierecommender.icu.conf /etc/nginx/sites-enabled/
sudo nginx -t
```

### 2. Build Frontend
```bash
cd frontend
npm install
npm run build
sudo mkdir -p /var/www/movierecommender
sudo cp -r dist/* /var/www/movierecommender/
sudo chown -R www-data:www-data /var/www/movierecommender
```

### 3. Start Docker Services
```bash
cd /path/to/MovieRecommender
docker-compose up --build -d
```

### 4. Start nginx
```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Post-Deployment Verification

### Service Health Checks
- [ ] Backend: `curl http://localhost:3000/health`
- [ ] Recommender: `curl http://localhost:8000/health`
- [ ] Frontend: `curl https://movierecommender.icu`
- [ ] API through nginx: `curl https://movierecommender.icu/api/movies?limit=1`
- [ ] Recommender through nginx: `curl https://movierecommender.icu/recommender/health`

### Docker Containers
- [ ] Verify all containers running: `docker-compose ps`
- [ ] Check logs for errors:
  ```bash
  docker-compose logs backend
  docker-compose logs recommender
  docker-compose logs movies_db
  docker-compose logs users_db
  ```

### Database Connectivity
- [ ] Backend connects to movies_db (check backend logs)
- [ ] Backend connects to users_db (check backend logs)
- [ ] Database data persisted in `./movies_db/data` and `./users_db/data`

### nginx
- [ ] nginx running: `sudo systemctl status nginx`
- [ ] No errors in logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] SSL working: visit https://movierecommender.icu in browser
- [ ] HTTP redirects to HTTPS

### Frontend
- [ ] Static files served correctly
- [ ] JavaScript/CSS loading without errors (check browser console)
- [ ] API calls working (check Network tab)
- [ ] Recommender API calls working

## Security Checklist

- [ ] Change default database passwords in docker-compose.yml
- [ ] Update passwords in backend/config/database.js
- [ ] Restrict database ports (5432, 5433) to localhost only
- [ ] Restrict backend/recommender ports (3000, 8000) to localhost only
- [ ] Enable UFW/firewall: allow only 22, 80, 443
- [ ] Set up SSL auto-renewal with certbot
- [ ] Review CORS settings in backend and recommender
- [ ] Add rate limiting in nginx (optional)

## Monitoring Setup

- [ ] Set up log rotation for nginx
- [ ] Set up log rotation for Docker containers
- [ ] Configure disk space monitoring
- [ ] Set up uptime monitoring (optional)
- [ ] Configure backup for database volumes

## Maintenance

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart services
docker-compose up --build -d

# Rebuild frontend
cd frontend && npm run build
sudo cp -r dist/* /var/www/movierecommender/
```

### View Logs
```bash
# Docker services
docker-compose logs -f --tail=100 backend
docker-compose logs -f --tail=100 recommender

# nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Database
```bash
# Backup movies_db
docker exec movierecommender-movies_db-1 pg_dump -U admin movies > movies_backup.sql

# Backup users_db
docker exec movierecommender-users_db-1 pg_dump -U admin users > users_backup.sql
```

## Troubleshooting

### 502 Bad Gateway
- Check if backend/recommender containers are running
- Check backend/recommender logs for errors
- Verify ports 3000 and 8000 are listening: `netstat -tlnp | grep -E ':(3000|8000)'`

### SSL Certificate Errors
- Verify certificate paths in nginx config
- Check certificate expiration: `openssl x509 -in /etc/nginx/ssl/movierecommender.icu.crt -noout -dates`
- Ensure nginx can read certificates: `sudo ls -la /etc/nginx/ssl/`

### Database Connection Errors
- Check if database containers are running: `docker-compose ps`
- Check database logs: `docker-compose logs movies_db users_db`
- Verify database credentials match in docker-compose.yml and backend/config/database.js

### Frontend Not Loading
- Check if files exist: `ls -la /var/www/movierecommender/`
- Check nginx error log: `sudo tail -f /var/log/nginx/error.log`
- Verify nginx config: `sudo nginx -t`

## Performance Optimization (Optional)

- [ ] Enable gzip compression in nginx
- [ ] Set up nginx caching for static assets
- [ ] Configure PostgreSQL connection pooling
- [ ] Add Redis for session management
- [ ] Set up CDN for static assets
