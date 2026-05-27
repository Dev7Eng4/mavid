import { convertTranscript } from './convertTranscript.js';
import { main as processBeats } from './processBeats.js';

/**
 * Test nhanh cho `convertTranscript(folder)`.
 * - Tạo thư mục tạm
 * - Tạo 1 file .srt
 * - Gọi convertTranscript và kiểm tra output
 */
export async function testConvertTranscript() {
  const result = await convertTranscript();
  const beats = await processBeats(result);
  console.log('🚀 ~ testConvertTranscript ~ beats:', beats);

  return result;
}

testConvertTranscript();
