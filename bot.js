const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
const play = require('play-dl');
const youtubedl = require('youtube-dl-exec');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

const queue = new Map();

async function initializePlayDl() {
    const fs = require('fs');
    const path = require('path');

    if (process.env.YOUTUBE_COOKIE) {
        const cookiePath = path.join(__dirname, 'cookies.txt');

        let cookieContent = process.env.YOUTUBE_COOKIE;
        cookieContent = cookieContent.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

        fs.writeFileSync(cookiePath, cookieContent, 'utf8');
        console.log(`Cookie file written to: ${cookiePath}`);
        console.log(`Cookie file size: ${fs.statSync(cookiePath).size} bytes`);

        try {
            await play.setToken({
                youtube: {
                    cookie: cookiePath
                }
            });
            console.log('YouTube cookie authentication enabled');

            console.log('Verifying cookies work...');
            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            await play.video_info(testUrl);
            console.log('✓ Cookies verified and working!');
        } catch (error) {
            console.error('✗ Error with YouTube cookies:', error.message);
            console.error('CRITICAL: Cookies are not working. Bot will not be able to play YouTube videos.');
            console.error('Please check TROUBLESHOOTING.md and get fresh cookies.');
        }
    } else {
        console.warn('WARNING: No YouTube cookies found. Bot may not work due to YouTube bot detection.');
        console.warn('Please add YOUTUBE_COOKIE to your .env file. See YOUTUBE_COOKIES.md for instructions.');
    }
}

async function authenticateSpotify() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log('Spotify authenticated successfully');

        setTimeout(authenticateSpotify, data.body['expires_in'] * 1000 - 60000);
    } catch (error) {
        console.error('Error authenticating with Spotify:', error);
    }
}

async function getSpotifyTrackInfo(url) {
    const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1];
    if (!trackId) return null;

    try {
        const track = await spotifyApi.getTrack(trackId);
        const searchQuery = `${track.body.artists[0].name} ${track.body.name}`;
        const searchResult = await play.search(searchQuery, { limit: 1 });

        if (searchResult.length > 0) {
            return {
                title: `${track.body.artists[0].name} - ${track.body.name}`,
                url: searchResult[0].url
            };
        }
    } catch (error) {
        console.error('Error fetching Spotify track:', error);
    }
    return null;
}

function createServerQueue(connection, textChannel) {
    return {
        connection,
        player: createAudioPlayer(),
        songs: [],
        textChannel,
        playing: false
    };
}

async function playSong(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(guild.id);
        return;
    }

    try {
        const fs = require('fs');
        const path = require('path');
        const cookiePath = path.join(__dirname, 'cookies.txt');

        const stream = youtubedl.exec(song.url, {
            output: '-',
            quiet: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: [
                'referer:youtube.com',
                'user-agent:googlebot'
            ],
            ...(fs.existsSync(cookiePath) && { cookies: cookiePath })
        });

        const resource = createAudioResource(stream.stdout, {
            inputType: StreamType.Arbitrary
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

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    authenticateSpotify();
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('/')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        if (!message.member.voice.channel) {
            return message.reply('You need to be in a voice channel to play music!');
        }

        if (!args[0]) {
            return message.reply('Please provide a YouTube or Spotify URL!');
        }

        const url = args[0];
        let songInfo;

        try {
            if (url.includes('spotify.com')) {
                const spotifyTrack = await getSpotifyTrackInfo(url);
                if (!spotifyTrack) {
                    return message.reply('Could not find that Spotify track on YouTube.');
                }
                songInfo = spotifyTrack;
            } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
                songInfo = {
                    title: 'YouTube Video',
                    url: url
                };
            } else {
                return message.reply('Please provide a valid YouTube or Spotify URL!');
            }

            const serverQueue = queue.get(message.guild.id);

            if (!serverQueue) {
                const connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator
                });

                connection.on(VoiceConnectionStatus.Disconnected, () => {
                    queue.delete(message.guild.id);
                });

                const queueConstruct = createServerQueue(connection, message.channel);
                queueConstruct.songs.push(songInfo);
                queue.set(message.guild.id, queueConstruct);

                message.reply(`Added to queue: **${songInfo.title}**`);
                playSong(message.guild, queueConstruct.songs[0]);
            } else {
                serverQueue.songs.push(songInfo);
                message.reply(`Added to queue: **${songInfo.title}**`);
            }
        } catch (error) {
            console.error('Error in play command:', error);
            message.reply('An error occurred while trying to play the song.');
        }
    }

    if (command === 'stop') {
        const serverQueue = queue.get(message.guild.id);
        if (!serverQueue) {
            return message.reply('There is no music playing!');
        }

        if (!message.member.voice.channel) {
            return message.reply('You need to be in a voice channel to stop the music!');
        }

        serverQueue.songs = [];
        serverQueue.player.stop();
        serverQueue.connection.destroy();
        queue.delete(message.guild.id);
        message.reply('Music stopped and left the voice channel.');
    }
});

(async () => {
    await initializePlayDl();
    client.login(process.env.DISCORD_TOKEN);
})();
