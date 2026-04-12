# How to Get YouTube Cookies

YouTube is blocking bot requests. To fix this, you need to provide your YouTube cookies to authenticate the bot.

## Method 1: Using Browser Extension (Recommended)

1. Install a cookie export extension:
   - Chrome/Edge: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   - Firefox: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

2. Go to [YouTube](https://www.youtube.com) and make sure you're logged in

3. Click the extension icon and export cookies for `youtube.com`

4. Open the downloaded `cookies.txt` file

5. Copy the entire content and add it to your `.env` file in **one of two ways**:

   **Option A: Multi-line (easier to read)**
   ```
   YOUTUBE_COOKIE="# Netscape HTTP Cookie File
   # This is a generated file! Do not edit.
   
   .youtube.com	TRUE	/	TRUE	...
   .youtube.com	TRUE	/	FALSE	...
   ..."
   ```
   
   **Option B: Single-line with \n (more reliable)**
   Replace all line breaks with `\n` and tabs with `\t`:
   ```
   YOUTUBE_COOKIE="# Netscape HTTP Cookie File\n# This is a generated file! Do not edit.\n\n.youtube.com\tTRUE\t/\tTRUE\t...\n.youtube.com\tTRUE\t/\tFALSE\t..."
   ```
   
   **Important:** 
   - Wrap the entire cookie content in double quotes
   - Keep all the lines including headers
   - The bot will automatically convert `\n` to newlines and `\t` to tabs

## Method 2: Manual Cookie Extraction

1. Go to [YouTube](https://www.youtube.com) in your browser (logged in)

2. Open Developer Tools (F12)

3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)

4. Click on **Cookies** → `https://www.youtube.com`

5. Find these important cookies and copy their values:
   - `VISITOR_INFO1_LIVE`
   - `CONSENT`
   - `PREF`
   - `YSC`

6. Format them as a cookie string in your `.env` file:
   ```
   YOUTUBE_COOKIE=VISITOR_INFO1_LIVE=value1; CONSENT=value2; PREF=value3; YSC=value4
   ```

## Important Notes

- **Security**: Never share your cookies publicly or commit them to git
- **Expiration**: Cookies may expire after some time. If the bot stops working, refresh your cookies
- **Account**: Use a dedicated YouTube account for the bot, not your personal account
- The `.env` file is already in `.gitignore` to prevent accidental commits

## Testing

After adding cookies to `.env`:

1. Restart the bot: `npm start`
2. You should see: `YouTube cookie authentication enabled`
3. Try playing a YouTube video with `/play <url>`

If you still get errors, your cookies may have expired or be invalid. Try exporting fresh cookies.
