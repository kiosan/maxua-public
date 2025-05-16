# Deploying the SBondar Blog to a VPS with Kamal 2.x

This guide explains how to deploy your SQLite-based Node.js blog to a VPS using [Kamal 2.x](https://kamal-deploy.org/).

## Prerequisites

1. A VPS running Linux (Ubuntu 20.04+ recommended)
2. Docker installed on your development machine
3. SSH access to your VPS
4. Kamal installed on your development machine

## Installing Kamal 2.x

If you don't have Kamal 2.x installed, you can install it using:

```bash
gem install kamal -v "~> 2.0"
```

Or to update from an older version:

```bash
gem update kamal
```

Verify you have Kamal 2.x installed:

```bash
kamal version
```

## Setup

### 1. Configure Environment Variables

Create a `.env` file in your project root:

```
ADMIN_PASSWORD=your_secure_admin_password
RESEND_API_KEY=your_resend_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
BLUESKY_IDENTIFIER=your_bluesky_identifier
BLUESKY_PASSWORD=your_bluesky_password
SENTRY_DSN=your_sentry_dsn
KAMAL_REGISTRY_PASSWORD=your_registry_password
```

### 2. Update the deploy.yml Configuration

Edit `config/deploy.yml` to set your:
- Container registry details
- Server IP address (under `servers.web.hosts`)
- SSH options (if not using the default SSH port)
- Customize environment variables under `service.env`

## Deployment

### 1. Build and Push the Docker Image

In Kamal 2.x, the setup and deploy steps are combined:

```bash
kamal deploy
```

This will build the Docker image, push it to your registry, and deploy it to your server(s).

### 2. Verify the Deployment

```bash
kamal status
```

## Database Management

Your SQLite database is stored in a persistent volume at `/app/database` on the host. Kamal will create this directory during deployment.

### Automatic Backups

The configuration includes a daily backup of your SQLite database. Backups are stored in the `~/backups` directory on your server and older than 7 days will be automatically deleted.

You can manually trigger a backup with:

```bash
kamal accessory run backup
```

### Accessing the Database

To access the SQLite database directly in Kamal 2.x:

```bash
kamal app exec --reuse "sqlite3 database/sbondar.sqlite"
```

## Maintenance

### Restarting the Application

```bash
kamal app restart
```

### Viewing Logs

```bash
kamal app logs
```

### Updating the Application

Make your changes locally, then:

```bash
kamal deploy
```

## Rollback

If something goes wrong, you can rollback to the previous version with Kamal 2.x:

```bash
kamal app rollback
```

## Benefits of SQLite-based Deployment

Your blog application now uses SQLite instead of PostgreSQL, which offers several advantages:

1. Simplified deployment - no separate database server needed
2. Easy backups - just copy the single SQLite file
3. Lower resource requirements - great for small VPS instances
4. Automatic migrations - runs on startup

Since all data is stored in a single file and persisted using Docker volumes, your blog's data will remain safe even if the container is restarted or updated.
