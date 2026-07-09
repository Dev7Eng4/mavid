import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Crops the bottom 2/5 height of an MP4 video, keeping the full width.
 * 
 * @param {string} inputPath - Absolute or relative path to the input MP4 file.
 * @param {string} outputPath - Absolute or relative path to save the cropped MP4 file.
 * @returns {void}
 */
export function cropBottomTwoFifths(inputPath, outputPath) {
  // FFmpeg crop filter syntax: crop=w:h:x:y
  // - w: iw (input width)
  // - h: ih*2/5 (2/5 of input height)
  // - x: 0 (start from left)
  // - y: ih-oh (input height minus output height, which gets the bottom 2/5)
  // We use -y to overwrite output if it exists.
  const command = `ffmpeg -y -i "${inputPath}" -vf "crop=iw:ih*2/5:0:ih-oh" "${outputPath}"`;
  
  console.log(`[FFmpeg] Running command:\n${command}`);
  execSync(command, { stdio: 'inherit' });
}

// Self-execution logic: if this script is executed directly (e.g. `node crop.js`),
// it will scan its own directory and crop all .mp4 files.
if (process.argv[1] === __filename) {
  try {
    const files = fs.readdirSync(__dirname);
    const mp4Files = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      // Only process .mp4 files and skip files that are already cropped
      return ext === '.mp4' && !file.endsWith('_bottom.mp4');
    });

    if (mp4Files.length === 0) {
      console.log(`No input .mp4 files found in directory: ${__dirname}`);
      console.log(`Please place your .mp4 files in this folder and run: node crop.js`);
    } else {
      console.log(`Found ${mp4Files.length} MP4 file(s) to crop...`);
      for (const file of mp4Files) {
        const inputPath = path.join(__dirname, file);
        const outputName = `${path.basename(file, '.mp4')}_bottom.mp4`;
        const outputPath = path.join(__dirname, outputName);

        console.log(`\n--------------------------------------------`);
        console.log(`Processing: ${file}`);
        console.log(`Output:     ${outputName}`);
        console.log(`--------------------------------------------`);
        
        try {
          cropBottomTwoFifths(inputPath, outputPath);
          console.log(`✓ Done cropping: ${outputName}`);
        } catch (error) {
          console.error(`✗ Error cropping ${file}:`, error.message);
        }
      }
    }
  } catch (err) {
    console.error('An error occurred during execution:', err);
  }
}
