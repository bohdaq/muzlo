const play = require('play-dl');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testCookies() {
    console.log('Testing YouTube cookie authentication...\n');
    
    if (!process.env.YOUTUBE_COOKIE) {
        console.error('ERROR: YOUTUBE_COOKIE not found in .env file');
        return;
    }
    
    const cookiePath = path.join(__dirname, 'cookies.txt');
    let cookieContent = process.env.YOUTUBE_COOKIE;
    cookieContent = cookieContent.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    
    fs.writeFileSync(cookiePath, cookieContent, 'utf8');
    console.log(`✓ Cookie file created: ${cookiePath}`);
    console.log(`✓ Cookie file size: ${fs.statSync(cookiePath).size} bytes\n`);
    
    console.log('First 200 characters of cookie file:');
    console.log(cookieContent.substring(0, 200));
    console.log('...\n');
    
    try {
        await play.setToken({
            youtube: {
                cookie: cookiePath
            }
        });
        console.log('✓ Cookies loaded into play-dl\n');
    } catch (error) {
        console.error('✗ Error loading cookies:', error.message);
        return;
    }
    
    console.log('Testing YouTube video access...');
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    try {
        const info = await play.video_info(testUrl);
        console.log('✓ Successfully accessed video:', info.video_details.title);
        console.log('\n✓✓✓ COOKIES ARE WORKING! ✓✓✓\n');
    } catch (error) {
        console.error('✗ Failed to access video:', error.message);
        console.error('\nPossible issues:');
        console.error('1. Cookies are expired - get fresh cookies from YouTube');
        console.error('2. Cookie format is incorrect - make sure you exported from youtube.com');
        console.error('3. You need to be logged into YouTube when exporting cookies');
        console.error('\nPlease export fresh cookies and try again.');
    }
}

testCookies();
