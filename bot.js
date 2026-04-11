const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const SpotifyWebApi = require('spotify-web-api-node');
const yts = require('yt-search');
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
        const searchResult = await yts(searchQuery);
        
        if (searchResult.videos.length > 0) {
            return {
                title: track.body.name,
                url: searchResult.videos[0].url,
                artist: track.body.artists[0].name
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
        const stream = ytdl(song.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });

        const resource = createAudioResource(stream);
        serverQueue.player.play(resource);
        serverQueue.playing = true;

        serverQueue.textChannel.send(`Now playing: **${song.title}**`);

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
                songInfo = {
                    title: `${spotifyTrack.artist} - ${spotifyTrack.title}`,
                    url: spotifyTrack.url
                };
            } else if (ytdl.validateURL(url)) {
                const info = await ytdl.getInfo(url);
                songInfo = {
                    title: info.videoDetails.title,
                    url: info.videoDetails.video_url
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

client.login(process.env.DISCORD_TOKEN);
