# Lavalink Bot Setup

## Prerequisites

1. **Lavalink server running** (see LAVALINK_SETUP.md)
2. **Java installed** on your system

## Installation

### 1. Install erela.js

```bash
npm install erela.js
```

### 2. Replace bot.js

The new Lavalink-based bot is in `bot-lavalink.js`. To use it:

**Option A: Replace the current bot**
```bash
mv bot.js bot-old.js
mv bot-lavalink.js bot.js
```

**Option B: Run alongside (for testing)**
```bash
# Keep both files, run the Lavalink version:
node bot-lavalink.js
```

### 3. Start Lavalink

In a separate terminal:

```bash
cd lavalink
java -jar Lavalink.jar
```

Wait for: `Lavalink is ready to accept connections.`

### 4. Start the Bot

```bash
npm start
# or
npm run dev
```

## New Commands

The Lavalink bot has additional commands:

- `/play {spotify_url}` - Play a Spotify track
- `/stop` - Stop and clear queue
- `/skip` - Skip current song
- `/queue` - Show current queue

## How It Works

```
Discord Bot (Node.js)
    ↓
Lavalink Server (Java)
    ↓
YouTube/Spotify/etc.
```

1. Your bot sends requests to Lavalink
2. Lavalink handles YouTube streaming
3. Lavalink sends audio back to Discord
4. No bot detection issues!

## Configuration

Edit `bot-lavalink.js` if your Lavalink is on a different server:

```javascript
const manager = new Manager({
    nodes: [
        {
            host: 'localhost',  // Change to your Lavalink server IP
            port: 2333,
            password: 'youshallnotpass',  // Match your application.yml
        }
    ],
    // ...
});
```

## Troubleshooting

### "Lavalink node error"

- Make sure Lavalink is running: `java -jar Lavalink.jar`
- Check the password matches in both files
- Verify port 2333 is not blocked

### "Failed to load the track"

- Lavalink might be starting up (wait 10 seconds)
- Check Lavalink console for errors
- Try restarting Lavalink

### "No results found"

- The Spotify track couldn't be found on YouTube
- Try a different track
- Check Spotify API credentials

## Production Deployment

For production, run Lavalink on a VPS:

1. **Deploy Lavalink** to a server (DigitalOcean, AWS, etc.)
2. **Update bot config** with server IP
3. **Keep Lavalink running** (use systemd or pm2)

Example systemd service for Lavalink:

```ini
[Unit]
Description=Lavalink Audio Server
After=network.target

[Service]
Type=simple
User=lavalink
WorkingDirectory=/opt/lavalink
ExecStart=/usr/bin/java -jar Lavalink.jar
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Benefits Over Direct Streaming

✅ **No YouTube bot detection**
✅ **Better performance**
✅ **More reliable**
✅ **Supports multiple sources** (YouTube, SoundCloud, Bandcamp, etc.)
✅ **Industry standard** (used by all major music bots)
✅ **Active development**

## Next Steps

Once working, you can:
- Add more commands (pause, resume, volume)
- Add playlist support
- Add YouTube URL support (it works with Lavalink!)
- Deploy to production
