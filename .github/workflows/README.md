# GitHub Actions CI/CD Setup

This repository uses GitHub Actions for continuous integration and deployment.

## Workflows

### CI Workflows (run on push/PR)
- **frontend-ci.yml** - Builds frontend with Node.js 20, uploads artifacts
- **backend-ci.yml** - Checks backend syntax with Node.js 20
- **recommender-ci.yml** - Checks Python syntax with Python 3.12

### CD Workflows (deploy on push to main)
- **deploy-frontend.yml** - Builds and copies to `/var/www/movierecommender/`
- **deploy-backend.yml** - Rebuilds backend Docker container
- **deploy-recommender.yml** - Rebuilds recommender Docker container

## Required GitHub Secrets

Configure these in repository Settings → Secrets and variables → Actions:

- `SERVER_HOST` - Production server IP or hostname
- `SERVER_USER` - SSH username (e.g., `root`)
- `SSH_PRIVATE_KEY` - Private SSH key for server access

## SSH Key Setup

Generate SSH key pair on your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
```

Add public key to server:

```bash
ssh-copy-id -i ~/.ssh/github_actions.pub user@server
```

Copy private key content to GitHub secret `SSH_PRIVATE_KEY`:

```bash
cat ~/.ssh/github_actions
```

## Manual Deployment

Trigger manual deployment via Actions tab → Select workflow → Run workflow

## Notes

- Frontend builds on server (not in Docker) and requires Node.js 20+
- Backend/recommender deploy via `docker-compose up -d --build`
- Repository must exist at `/root/MovieRecommender` on server
- Frontend deployment requires sudo access for copying to `/var/www/`
