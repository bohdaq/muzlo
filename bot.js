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
        console.error('Error authenticating with Spotify:', error.message || error);
        // Retry after 30 seconds on network errors
        console.log('Retrying Spotify authentication in 30 seconds...');
        setTimeout(authenticateSpotify, 30000);
    }
}

async function getSpotifyTrackInfo(url) {
    try {
        // Validate URL format
        if (!url || !url.includes('spotify.com/track/')) {
            console.error('Invalid Spotify URL format:', url);
            return null;
        }

        // Extract track ID
        const trackPart = url.split('/track/')[1];
        if (!trackPart) {
            console.error('Could not extract track ID from URL:', url);
            return null;
        }

        const trackId = trackPart.split('?')[0].split('/')[0];
        console.log('Fetching Spotify track:', trackId);

        const track = await spotifyApi.getTrack(trackId);

        const searchQuery = `${track.body.artists[0].name} ${track.body.name}`;
        return {
            title: `${track.body.artists[0].name} - ${track.body.name}`,
            query: searchQuery
        };
    } catch (error) {
        console.error('Error fetching Spotify track:', error.message || error);
        return null;
    }
}

async function getSpotifyPlaylistInfo(url) {
    try {
        // Validate URL format
        if (!url || !url.includes('spotify.com/playlist/')) {
            console.error('Invalid Spotify playlist URL format:', url);
            return null;
        }

        // Extract playlist ID
        const playlistPart = url.split('/playlist/')[1];
        if (!playlistPart) {
            console.error('Could not extract playlist ID from URL:', url);
            return null;
        }

        const playlistId = playlistPart.split('?')[0].split('/')[0];
        console.log('Fetching Spotify playlist:', playlistId);

        // Fetch playlist with all tracks (handle pagination)
        const playlist = await spotifyApi.getPlaylist(playlistId, { limit: 100 });

        // Validate response
        if (!playlist || !playlist.body || !playlist.body.tracks || !playlist.body.tracks.items) {
            console.error('Invalid playlist response structure:', playlist);
            return null;
        }

        const tracks = [];

        // Add tracks from first page
        for (const item of playlist.body.tracks.items) {
            if (item.track && item.track.artists && item.track.artists.length > 0) {
                const searchQuery = `${item.track.artists[0].name} ${item.track.name}`;
                tracks.push({
                    title: `${item.track.artists[0].name} - ${item.track.name}`,
                    query: searchQuery
                });
            }
        }

        // Fetch remaining tracks if playlist has more than 100
        let offset = 100;
        while (playlist.body.tracks.next) {
            const nextPage = await spotifyApi.getPlaylistTracks(playlistId, { limit: 100, offset });
            for (const item of nextPage.body.items) {
                if (item.track && item.track.artists && item.track.artists.length > 0) {
                    const searchQuery = `${item.track.artists[0].name} ${item.track.name}`;
                    tracks.push({
                        title: `${item.track.artists[0].name} - ${item.track.name}`,
                        query: searchQuery
                    });
                }
            }
            offset += 100;
            if (!nextPage.body.next) break;
        }

        return {
            name: playlist.body.name,
            tracks: tracks
        };
    } catch (error) {
        console.error('Error fetching Spotify playlist:', error.message || error);
        if (error.body) {
            console.error('Spotify API error details:', JSON.stringify(error.body, null, 2));
        }
        if (error.statusCode) {
            console.error('HTTP Status Code:', error.statusCode);
        }
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
            let searchQueries = [];
            let isPlaylist = false;
            let playlistName = '';

            if (url.includes('spotify.com/playlist/')) {
                // Handle playlist
                const spotifyPlaylist = await getSpotifyPlaylistInfo(url);
                if (!spotifyPlaylist) {
                    return message.reply('Could not access that Spotify playlist. It may be private, region-locked, or the URL is invalid. Try a different playlist or make sure it\'s public.');
                }
                if (spotifyPlaylist.tracks.length === 0) {
                    return message.reply('That Spotify playlist is empty!');
                }
                isPlaylist = true;
                playlistName = spotifyPlaylist.name;
                searchQueries = spotifyPlaylist.tracks.map(t => ({ query: t.query, title: t.title }));
            } else if (url.includes('spotify.com/track/')) {
                // Handle single track
                const spotifyTrack = await getSpotifyTrackInfo(url);
                if (!spotifyTrack) {
                    return message.reply('Could not find that Spotify track.');
                }
                searchQueries = [{ query: spotifyTrack.query, title: spotifyTrack.title }];
            } else {
                return message.reply('Please provide a valid Spotify track or playlist URL!');
            }

            // Create or get player with best quality settings
            const player = manager.createPlayer({
                guildId: message.guild.id,
                voiceChannelId: message.member.voice.channel.id,
                textChannelId: message.channel.id,
                selfDeaf: true,
                selfMute: false,
                volume: 100,
                instaUpdateFiltersFix: true,
                applyVolumeAsFilter: false
            });

            // Connect to voice channel
            if (!player.connected) await player.connect();

            if (isPlaylist) {
                // Handle playlist - search and add all tracks
                message.reply(`Loading playlist: **${playlistName}** (${searchQueries.length} tracks)...`);

                let addedCount = 0;
                for (const track of searchQueries) {
                    try {
                        console.log(`Searching SoundCloud for: ${track.query}`);
                        const res = await player.search({ query: `scsearch:${track.query}` }, message.author);

                        if (res.loadType !== 'error' && res.loadType !== 'empty' && res.tracks.length > 0) {
                            player.queue.add(res.tracks[0]);
                            addedCount++;
                        }
                    } catch (err) {
                        console.error(`Failed to add track: ${track.title}`, err);
                    }
                }

                message.reply(`Added **${addedCount}** tracks from playlist: **${playlistName}**`);
            } else {
                // Handle single track
                const track = searchQueries[0];
                console.log(`Searching SoundCloud for: ${track.query}`);
                const res = await player.search({ query: `scsearch:${track.query}` }, message.author);

                if (res.loadType === 'error' || res.loadType === 'empty') {
                    console.error('Search failed:', res);
                    return message.reply(`Failed to load the track or no results found. Error: ${res.exception?.message || 'Unknown'}`);
                }

                player.queue.add(res.tracks[0]);
                message.reply(`Added to queue: **${track.title || res.tracks[0].info.title}**`);
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
