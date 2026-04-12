const { Client, GatewayIntentBits } = require('discord.js');
const { Manager } = require('erela.js');
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
const manager = new Manager({
    nodes: [
        {
            host: 'localhost',
            port: 2333,
            password: 'youshallnotpass',
        }
    ],
    send: (id, payload) => {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
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

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    manager.init(client.user.id);
    authenticateSpotify();
});

client.on('raw', (d) => manager.updateVoiceState(d));

manager.on('nodeConnect', node => {
    console.log(`Lavalink node "${node.options.identifier}" connected`);
});

manager.on('nodeError', (node, error) => {
    console.error(`Lavalink node "${node.options.identifier}" error:`, error.message);
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
            const player = manager.create({
                guild: message.guild.id,
                voiceChannel: message.member.voice.channel.id,
                textChannel: message.channel.id,
                selfDeafen: true
            });

            // Connect to voice channel
            if (!player.connected) player.connect();

            // Search for track
            const res = await manager.search(searchQuery, message.author);

            if (res.loadType === 'LOAD_FAILED') {
                return message.reply('Failed to load the track.');
            }

            if (res.loadType === 'NO_MATCHES') {
                return message.reply('No results found.');
            }

            // Add track to queue
            if (res.loadType === 'PLAYLIST_LOADED') {
                player.queue.add(res.tracks);
                message.reply(`Added playlist: **${res.playlist.name}** (${res.tracks.length} tracks)`);
            } else {
                player.queue.add(res.tracks[0]);
                message.reply(`Added to queue: **${trackTitle || res.tracks[0].title}**`);
            }

            // Play if not already playing
            if (!player.playing && !player.paused && !player.queue.size) {
                player.play();
            }

        } catch (error) {
            console.error('Error in play command:', error);
            message.reply('An error occurred while trying to play the song.');
        }
    }

    if (command === 'stop') {
        const player = manager.get(message.guild.id);

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
        const player = manager.get(message.guild.id);

        if (!player) {
            return message.reply('There is no music playing!');
        }

        if (!message.member.voice.channel) {
            return message.reply('You need to be in a voice channel to skip!');
        }

        player.stop();
        message.reply('Skipped to the next song.');
    }

    if (command === 'queue') {
        const player = manager.get(message.guild.id);

        if (!player) {
            return message.reply('There is no music playing!');
        }

        const queue = player.queue;
        const current = player.queue.current;

        if (!current) {
            return message.reply('The queue is empty.');
        }

        let queueString = `**Now Playing:**\n${current.title}\n\n**Queue:**\n`;

        if (queue.length === 0) {
            queueString += 'Empty';
        } else {
            queueString += queue.slice(0, 10).map((track, i) => {
                return `${i + 1}. ${track.title}`;
            }).join('\n');

            if (queue.length > 10) {
                queueString += `\n\n...and ${queue.length - 10} more`;
            }
        }

        message.reply(queueString);
    }
});

manager.on('trackStart', (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    channel.send(`Now playing: **${track.title}**`);
});

manager.on('queueEnd', (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    channel.send('Queue finished. Leaving voice channel.');
    player.destroy();
});

client.login(process.env.DISCORD_TOKEN);
