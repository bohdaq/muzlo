# Alternative Solution: Using yt-dlp

If `play-dl` cookies continue to fail, here's an alternative approach using `yt-dlp` which is more reliable.

## Why yt-dlp?

- More actively maintained
- Better cookie handling
- Works as a system command (no Node.js library issues)
- Used by many production Discord bots

## Installation

### 1. Install yt-dlp

**macOS:**
```bash
brew install yt-dlp
```

**Linux:**
```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 2. Install ytdl-exec (Node.js wrapper)

```bash
npm install ytdl-exec
```

### 3. Update bot.js

Replace the `playSong` function to use yt-dlp instead of play-dl:

```javascript
const ytdl = require('ytdl-exec');

async function playSong(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(guild.id);
        return;
    }

    try {
        // Use yt-dlp with cookies
        const stream = ytdl.exec(song.url, {
            output: '-',
            quiet: true,
            format: 'bestaudio',
            cookies: './cookies.txt'
        });

        const resource = createAudioResource(stream, {
            inputType: 'arbitrary'
        });
        
        serverQueue.player.play(resource);
        serverQueue.playing = true;

        const displayTitle = song.title !== 'YouTube Video' ? song.title : 'your requested video';
        serverQueue.textChannel.send(`Now playing: **${displayTitle}**`);

        serverQueue.player.on(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            playSong(guild, serverQueue.songs[0]);
        });

        serverQueue.player.on('error', error => {
            console.error('Error playing audio:', error);
            serverQueue.textChannel.send('An error occurred while playing the song.');
            serverQueue.songs.shift();
            playSong(guild, serverQueue.songs[0]);
        });

        serverQueue.connection.subscribe(serverQueue.player);
    } catch (error) {
        console.error('Error in playSong:', error);
        serverQueue.textChannel.send('Failed to play the song.');
        serverQueue.songs.shift();
        playSong(guild, serverQueue.songs[0]);
    }
}
```

## Benefits

- ✓ Cookies work reliably
- ✓ Better error handling
- ✓ More format options
- ✓ Actively maintained
- ✓ Works with age-restricted videos

## Drawbacks

- Requires system installation (not just npm)
- Slightly slower startup
- Larger dependency

This is the recommended solution if play-dl continues to have cookie issues.
