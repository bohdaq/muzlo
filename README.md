# Muzlo - Discord Music Bot

A Discord bot that plays music from YouTube and Spotify using simple commands.

## Features

-  Play music from Spotify URLs
- ⏹️ Stop playback and leave voice channel
- 📝 Queue system for multiple songs
- 🔍 Automatic YouTube search for Spotify tracks

## Commands

- `/play {spotify_url}` - Play a song from Spotify URL
- `/stop` - Stop the current song and clear the queue

**Note:** YouTube direct URLs are not supported due to YouTube's bot detection. The bot automatically finds YouTube videos for Spotify tracks.

## Setup

### Prerequisites

- Node.js (v16.9.0 or higher)
- A Discord Bot Token
- Spotify API Credentials (Client ID and Secret)
- FFmpeg installed on your system

### Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd muzlo
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your credentials in `.env`:
   - **DISCORD_TOKEN**: Get from [Discord Developer Portal](https://discord.com/developers/applications)
   - **SPOTIFY_CLIENT_ID** & **SPOTIFY_CLIENT_SECRET**: Get from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

### Getting Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Copy the token and paste it in your `.env` file
5. Enable these Privileged Gateway Intents:
   - Message Content Intent
6. Go to OAuth2 > URL Generator
7. Select scopes: `bot`
8. Select bot permissions: `Send Messages`, `Connect`, `Speak`
9. Copy the generated URL and invite the bot to your server

### Getting Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create an App"
4. Fill in the app name and description
5. Copy the Client ID and Client Secret to your `.env` file

## Running the Bot

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

## Usage

1. Join a voice channel in your Discord server
2. Use `/play https://open.spotify.com/track/...`
3. The bot will:
   - Fetch the track info from Spotify
   - Search for it on YouTube
   - Join your channel and start playing
4. Use `/stop` to stop playback

## Troubleshooting

### FFmpeg not found
Make sure FFmpeg is installed on your system:
- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### Bot doesn't respond
- Check that Message Content Intent is enabled in Discord Developer Portal
- Verify your bot token is correct in `.env`
- Make sure the bot has proper permissions in your server

### Spotify links don't work
- Verify your Spotify Client ID and Secret are correct
- Check that the Spotify track is available in your region

## License

ISC
