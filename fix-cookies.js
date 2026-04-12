const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('Fixing cookie file format for yt-dlp...\n');

if (!process.env.YOUTUBE_COOKIE) {
    console.error('ERROR: YOUTUBE_COOKIE not found in .env file');
    process.exit(1);
}

const cookiePath = path.join(__dirname, 'cookies.txt');
let cookieContent = process.env.YOUTUBE_COOKIE;

cookieContent = cookieContent.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

const lines = cookieContent.split('\n');
const fixedLines = [];

for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) {
        fixedLines.push(line);
        continue;
    }
    
    const parts = line.split(/\s+/);
    
    if (parts.length >= 7) {
        const [domain, flag, path, secure, expiration, name, ...valueParts] = parts;
        const value = valueParts.join(' ');
        
        const fixedLine = [domain, flag, path, secure, expiration, name, value].join('\t');
        fixedLines.push(fixedLine);
    } else {
        fixedLines.push(line);
    }
}

const fixedContent = fixedLines.join('\n');

fs.writeFileSync(cookiePath, fixedContent, 'utf8');

console.log(`✓ Cookie file fixed and saved to: ${cookiePath}`);
console.log(`✓ Total lines: ${fixedLines.length}`);
console.log(`✓ Cookie entries: ${fixedLines.filter(l => !l.startsWith('#') && l.trim() !== '').length}`);
console.log('\nFirst 3 cookie lines:');
fixedLines.filter(l => !l.startsWith('#') && l.trim() !== '').slice(0, 3).forEach(line => {
    console.log(line.substring(0, 100) + '...');
});

console.log('\n✓ Done! Try running the bot now.');
