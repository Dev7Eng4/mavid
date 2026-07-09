import fs from 'fs';
import path from 'path';
import downloadVideo, { getVideoInfo } from '../video-info/downloadVideo.js';
import { PATHS } from '../constants/paths.js';

// Fix constant URL in code as requested by the user
const VIDEO_URL = 'https://www.youtube.com/watch?v=_ktpH2g9yE8'; // Replace with the target video link

const main = async () => {
  const outputDir = PATHS.DOWNLOADS;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n============================================`);
  console.log(`Starting HD Video Download`);
  console.log(`URL: ${VIDEO_URL}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`============================================\n`);

  let videoTitle = '';
  try {
    const info = await getVideoInfo(VIDEO_URL);
    videoTitle = info?.title || '';
    console.log(`Fetched Video Title: "${videoTitle}"`);
  } catch (err) {
    console.warn(`[Warning] Could not retrieve video title:`, err.message);
  }

  try {
    // Calling the helper downloadVideo function
    // It is configured to automatically download the best quality H.264 (up to 1080p HD) and merge to MP4.
    await downloadVideo(VIDEO_URL, { outputDir });
    console.log(`\n✓ HD Video downloaded successfully!`);
    console.log(`Saved in: ${outputDir}`);
  } catch (err) {
    console.error(`\n✗ Error occurred during download:`, err.message);
    if (err.stderr) {
      console.error(`Details:`, err.stderr);
    }
  }
};

main();
