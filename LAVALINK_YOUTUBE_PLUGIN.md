# Adding YouTube Plugin to Lavalink

The YouTube source plugin provides better YouTube support and bypasses bot detection.

## Installation

### 1. Download the Plugin

```bash
cd ~/git/lavalink

# Create plugins directory
mkdir -p plugins

# Download latest YouTube source plugin
cd plugins
wget https://github.com/lavalink-devs/youtube-source/releases/download/1.7.4/youtube-plugin-1.7.4.jar
```

### 2. Update application.yml

Edit `~/git/lavalink/application.yml` and add the plugins section:

```yaml
lavalink:
  plugins:
    - dependency: "dev.lavalink.youtube:youtube-plugin:1.7.4"
      repository: "https://maven.lavalink.dev/releases"
  
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

plugins:
  youtube:
    enabled: true
    allowSearch: true
    allowDirectVideoIds: true
    allowDirectPlaylistIds: true
    clients:
      - MUSIC
      - ANDROID_TESTSUITE
      - WEB
      - TVHTML5EMBEDDED

server:
  port: 2333
  address: 0.0.0.0

logging:
  level:
    root: INFO
    lavalink: INFO
```

### 3. Restart Lavalink

```bash
cd ~/git/lavalink
java -jar Lavalink.jar
```

You should see in the logs:
```
INFO ... Loading plugin: youtube-plugin
INFO ... YouTube source plugin loaded
```

## How It Works

The plugin uses multiple YouTube clients (Music, Android, Web, TV) to bypass bot detection:
- If one client is blocked, it tries another
- Uses different user agents and API endpoints
- Rotates between clients automatically
- Much more reliable than default YouTube support

## Testing

After restarting Lavalink, try the bot again:
```
/play https://open.spotify.com/track/...
```

The bot should now successfully play YouTube videos!
