# Troubleshooting YouTube Cookie Issues

If you're getting "Sign in to confirm you're not a bot" errors, follow these steps:

## Step 1: Test Your Cookies

Run the cookie test script:

```bash
node test-cookies.js
```

This will tell you if your cookies are working or not.

## Step 2: Common Issues

### Issue: "Cookies are expired"

**Solution:** YouTube cookies expire frequently (sometimes within hours). You need to:

1. Go to YouTube and make sure you're logged in
2. Export **fresh** cookies using the browser extension
3. Replace the `YOUTUBE_COOKIE` value in your `.env` file
4. Restart the bot

### Issue: "Cookie format is incorrect"

**Solution:** Make sure you're exporting cookies in Netscape format:

1. The file should start with `# Netscape HTTP Cookie File`
2. Each cookie line should have 7 tab-separated fields
3. Export from `youtube.com` (not `music.youtube.com` or other domains)

### Issue: "Invalid character in header"

**Solution:** The `.env` file format is wrong:

1. Wrap the entire cookie content in double quotes
2. Make sure there are no extra quotes or special characters
3. The multi-line format should work, but if it doesn't, try the single-line format with `\n`

## Step 3: Get Fresh Cookies

### Quick Method:

1. **Clear your browser cache** for YouTube (optional but recommended)
2. **Log into YouTube** in your browser
3. **Visit a video** to make sure you're fully authenticated
4. **Export cookies** using the browser extension
5. **Immediately** copy them to your `.env` file
6. **Restart the bot**

### Important Notes:

- Use a **dedicated YouTube account** for the bot (not your personal account)
- Some YouTube accounts may have additional security that blocks bots
- If cookies keep expiring quickly, try using a different YouTube account
- **Never share or commit your cookies** - they give full access to your YouTube account

## Step 4: Alternative Solution

If cookies continue to fail, you may need to:

1. Use a different library (like `yt-dlp` wrapper)
2. Use a proxy service
3. Host the bot on a server with a different IP
4. Wait for `play-dl` to update their YouTube handling

## Still Not Working?

Check the bot console output when it starts. You should see:

```
Cookie file written to: /path/to/cookies.txt
Cookie file size: XXXX bytes
YouTube cookie authentication enabled
```

If you don't see this, your `.env` file is not formatted correctly.

If you see this but still get errors, your cookies are likely expired or invalid.
