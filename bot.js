const { Client, GatewayIntentBits } = require('discord.js');
const { LavalinkManager } = require('lavalink-client');
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

// Initialize Lavalink Manager
const manager = new LavalinkManager({
    nodes: [
        {
            authorization: 'youshallnotpass',
            host: 'localhost',
            port: 2333,
            id: 'main-node'
        }
    ],
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    client: {
        id: process.env.CLIENT_ID || '',
        username: 'Muzlo'
    }
});

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
    try {
        const trackId = url.split('/track/')[1].split('?')[0];
        const track = await spotifyApi.getTrack(trackId);

        const searchQuery = `${track.body.artists[0].name} ${track.body.name}`;
        return {
            title: `${track.body.artists[0].name} - ${track.body.name}`,
            query: searchQuery
        };
    } catch (error) {
        console.error('Error fetching Spotify track:', error);
        return null;
    }
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    manager.options.client.id = client.user.id;
    await manager.init(client.user);
    authenticateSpotify();
});

client.on('raw', (d) => {
    if (d.t === 'VOICE_SERVER_UPDATE' || d.t === 'VOICE_STATE_UPDATE') {
        manager.sendRawData(d);
    }
});

manager.nodeManager.on('connect', (node) => {
    console.log(`Lavalink node "${node.id}" connected`);
});

manager.nodeManager.on('disconnect', (node, reason) => {
    console.log(`Lavalink node "${node.id}" disconnected:`, reason);
});

manager.nodeManager.on('error', (node, error) => {
    console.error(`Lavalink node "${node.id}" error:`, error.message);
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
            return message.reply('Please provide a Spotify URL!');
        }

        const url = args[0];

        try {
            let searchQuery;
            let trackTitle;

            if (url.includes('spotify.com')) {
                const spotifyTrack = await getSpotifyTrackInfo(url);
                if (!spotifyTrack) {
                    return message.reply('Could not find that Spotify track.');
                }
                searchQuery = spotifyTrack.query;
                trackTitle = spotifyTrack.title;
            } else {
                return message.reply('Please provide a valid Spotify URL!');
            }

            // Create or get player
            const player = manager.createPlayer({
                guildId: message.guild.id,
                voiceChannelId: message.member.voice.channel.id,
                textChannelId: message.channel.id,
                selfDeaf: true,
                selfMute: false
            });

            // Connect to voice channel
            if (!player.connected) await player.connect();

            // Search for track on SoundCloud (no bot detection)
            console.log(`Searching SoundCloud for: ${searchQuery}`);
            const res = await player.search({ query: `scsearch:${searchQuery}` }, message.author);
            console.log(`Search result:`, res);

            if (res.loadType === 'error' || res.loadType === 'empty') {
                console.error('Search failed:', res);
                return message.reply(`Failed to load the track or no results found. Error: ${res.exception?.message || 'Unknown'}`);
            }

            // Add track to queue
            if (res.loadType === 'playlist') {
                player.queue.add(res.tracks);
                message.reply(`Added playlist: **${res.playlist.name}** (${res.tracks.length} tracks)`);
            } else {
                player.queue.add(res.tracks[0]);
                message.reply(`Added to queue: **${trackTitle || res.tracks[0].info.title}**`);
            }

            // Play if not already playing
            if (!player.playing && player.queue.tracks.length > 0) {
                await player.play();
            }

        } catch (error) {
            console.error('Error in play command:', error);
            message.reply('An error occurred while trying to play the song.');
        }
    }

    if (command === 'stop') {
        const player = manager.getPlayer(message.guild.id);

        if (!player) {
            return message.reply('There is no music playing!');
        }

        if (!message.member.voice.channel) {
            return message.reply('You need to be in a voice channel to stop the music!');
        }

        player.destroy();
        message.reply('Music stopped and left the voice channel.');
    }

    if (command === 'skip') {
        const player = manager.getPlayer(message.guild.id);

        if (!player) {
            return message.reply('There is no music playing!');
        }

        if (!message.member.voice.channel) {
            return message.reply('You need to be in a voice channel to skip!');
        }

        await player.skip();
        message.reply('Skipped to the next song.');
    }

    if (command === 'queue') {
        const player = manager.getPlayer(message.guild.id);

        if (!player) {
            return message.reply('There is no music playing!');
        }

        const current = player.queue.current;

        if (!current) {
            return message.reply('The queue is empty.');
        }

        let queueString = `**Now Playing:**\n${current.info.title}\n\n**Queue:**\n`;

        if (player.queue.tracks.length === 0) {
            queueString += 'Empty';
        } else {
            queueString += player.queue.tracks.slice(0, 10).map((track, i) => {
                return `${i + 1}. ${track.info.title}`;
            }).join('\n');

            if (player.queue.tracks.length > 10) {
                queueString += `\n\n...and ${player.queue.tracks.length - 10} more`;
            }
        }

        message.reply(queueString);
    }
});

manager.on('trackStart', (player, track) => {
    console.log(`Track started: ${track.info.title}`);
    console.log(`Player state:`, { connected: player.connected, playing: player.playing, paused: player.paused });
    const channel = client.channels.cache.get(player.textChannelId);
    if (channel) channel.send(`Now playing: **${track.info.title}**`);
});

manager.on('queueEnd', (player) => {
    const channel = client.channels.cache.get(player.textChannelId);
    if (channel) channel.send('Queue finished. Leaving voice channel.');
    player.destroy();
});

client.login(process.env.DISCORD_TOKEN);
