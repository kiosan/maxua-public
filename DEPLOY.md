# SQLite Blog Deployment Commands with Kamal

## Prerequisites

- Linux VPS server configured with SSH access
- Domain configured to point to your VPS
- Docker & Kamal installed locally

## Install Kamal

```bash
gem install kamal -v "~> 2.0"
```

## Setup

1. Create `.kamal/secrets` file (already done)
2. Ensure `config/deploy.yml` is configured (already done)

## Deployment Commands

```bash
# Deploy application
kamal deploy

# Check deployment status
kamal status

# View logs
kamal app logs

# Restart application
kamal app restart

# Execute commands in container
kamal app exec "ls -la"

# Access SQLite database
kamal app exec "sqlite3 database/app.sqlite"

# Rollback to previous version
kamal app rollback

# Manual database backup
ssh user@your-server-ip "cp /data/app_database/app.sqlite ~/backups/app-$(date +%Y%m%d).sqlite"
```

## Configuration Reference

- **Host**: your-domain.com with SSL
- **Server**: your-server-ip
- **Image**: username/app-name
- **Database**: SQLite in volume at `/data/app_database`
- **Health Check**: `/api/health`

Migrations run automatically during Docker image build.
