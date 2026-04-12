# Setting Up Lavalink

Lavalink is the industry-standard solution for Discord music bots. It bypasses YouTube bot detection.

## Quick Setup

### 1. Download Lavalink

```bash
# Create lavalink directory
mkdir lavalink
cd lavalink

# Download latest Lavalink.jar
wget https://github.com/lavalink-devs/Lavalink/releases/download/4.0.4/Lavalink.jar

# Download application.yml config
wget https://github.com/lavalink-devs/Lavalink/blob/master/LavalinkServer/application.yml.example -O application.yml
```

### 2. Configure Lavalink

Edit `application.yml`:

```yaml
server:
  port: 2333
  address: 0.0.0.0

lavalink:
  server:
    password: "youshallnotpass"
    sources:
      youtube: true
      bandcamp: true
      soundcloud: true
      twitch: true
      vimeo: true
      http: true
      local: false
    bufferDurationMs: 400
    frameBufferDurationMs: 5000
    youtubePlaylistLoadLimit: 6
    playerUpdateInterval: 5
    youtubeSearchEnabled: true
    soundcloudSearchEnabled: true
    gc-warnings: true

metrics:
  prometheus:
    enabled: false
    endpoint: /metrics

sentry:
  dsn: ""
  environment: ""

logging:
  file:
    path: ./logs/

  level:
    root: INFO
    lavalink: INFO

  logback:
    rollingpolicy:
      max-file-size: 1GB
      max-history: 30
```

### 3. Start Lavalink

```bash
java -jar Lavalink.jar
```

Keep this running in a separate terminal.

### 4. Update Your Bot

Install erela.js:

```bash
npm install erela.js
```

Replace bot code with Lavalink version - see LAVALINK_BOT.md

## Why This Works

- Lavalink runs as a separate Java process
- It has better YouTube handling than Node.js libraries
- Used by all major Discord music bots (Rythm, Groovy, etc.)
- Actively maintained and updated
- No cookie hassles

## Production Deployment

For production, run Lavalink on a VPS:
- Digital Ocean ($5/month)
- AWS EC2 free tier
- Heroku (with Java buildpack)

Your bot connects to Lavalink via WebSocket, so they can be on different servers.
