import { execSync } from 'child_process';
import { STOCK_VIDEO } from '../constants/index.js';

/**
 * Liệt kê GPU trên máy qua WMI, phân loại integrated / discrete.
 */
function detectGPUs() {
  const gpus = [];
  try {
    const raw = execSync('wmic path win32_videocontroller get name', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    for (const line of raw.split('\n')) {
      const name = line.trim();
      if (!name || name.toLowerCase() === 'name') continue;

      const lo = name.toLowerCase();
      let vendor = 'unknown';
      let type = 'unknown';

      if (lo.includes('nvidia') || lo.includes('geforce') || lo.includes('rtx') || lo.includes('gtx') || lo.includes('quadro')) {
        vendor = 'nvidia';
        type = 'discrete';
      } else if (lo.includes('intel')) {
        vendor = 'intel';
        type = lo.includes('arc') ? 'discrete' : 'integrated';
      } else if (lo.includes('amd') || lo.includes('radeon')) {
        vendor = 'amd';
        if (lo.includes('rx ') || lo.includes('pro ') || lo.includes('xt')) {
          type = 'discrete';
        } else {
          type = 'integrated';
        }
      }

      gpus.push({ name, vendor, type });
    }
  } catch {
    // wmic không khả dụng — bỏ qua, sẽ fallback theo test encoder
  }
  return gpus;
}

/**
 * Test 1 frame nhỏ để xác nhận encoder thực sự hoạt động trên máy.
 */
export function testEncoder(encoder) {
  try {
    execSync(`ffmpeg -hide_banner -loglevel error -f lavfi -i nullsrc=s=320x240:d=0.04 -c:v ${encoder} -f null -`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 20000,
    });
    console.log('🔍 Test encoder: true', encoder);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect toàn bộ phần cứng GPU + chọn encoder ffmpeg tốt nhất.
 * Ưu tiên: NVENC (NVIDIA rời) > AMF (AMD rời) > QSV (Intel tích hợp) > libx264 (CPU).
 */
function detectHardware() {
  const gpus = detectGPUs();

  const hasNvenc = testEncoder('h264_nvenc');
  const hasAmf = testEncoder('h264_amf');
  const hasQsv = testEncoder('h264_qsv');

  const { BITRATE, MAX_BITRATE, BUFSIZE } = STOCK_VIDEO;
  const bitrateArgs = ['-b:v', BITRATE, '-maxrate', MAX_BITRATE, '-bufsize', BUFSIZE];

  // [OPT-4] Bitrate thấp hơn cho video (720p, đã overlay, không cần bitrate cao)
  const reupBitrateArgs = ['-maxrate', '2M', '-bufsize', '3M'];

  const makeAudioBitrateArgs = ['-b:v', '1M', '-maxrate', '1.5M', '-bufsize', '2M'];

  let encoder, videoEncodeArgs, reupVideoEncodeArgs, makeAudioVideoEncodeArgs, encoderLabel, stockDecodeArgs;

  if (hasNvenc) {
    console.log('🔍 NVIDIA NVENC: true');
    encoder = 'h264_nvenc';
    stockDecodeArgs = ['-hwaccel', 'cuda'];
    videoEncodeArgs = [
      '-c:v',
      'h264_nvenc',
      '-preset',
      'p1',
      '-rc',
      'vbr',
      '-cq',
      '28',
      ...bitrateArgs,
      '-pix_fmt',
      'yuv420p',
      '-tag:v',
      'avc1',
    ];
    reupVideoEncodeArgs = [
      '-c:v',
      'h264_nvenc',
      '-preset',
      'p2',
      '-rc',
      'vbr',
      '-cq',
      '32',
      ...reupBitrateArgs,
      '-pix_fmt',
      'yuv420p',
      '-tag:v',
      'avc1',
    ];
    makeAudioVideoEncodeArgs = [
      '-c:v',
      'h264_nvenc',
      '-preset',
      'p1',
      '-rc',
      'vbr',
      '-cq',
      '32',
      ...makeAudioBitrateArgs,
      '-pix_fmt',
      'yuv420p',
      '-tag:v',
      'avc1',
    ];
    encoderLabel = 'GPU NVIDIA (h264_nvenc p1)';
  } else if (hasAmf) {
    console.log('🔍 AMD AMF: true');
    encoder = 'h264_amf';
    stockDecodeArgs = ['-hwaccel', 'd3d11va'];
    // AMF tuning: usage=transcoding (cân bằng tốc độ), bf=0 (B-frame AMF hay flaky + chậm),
    // async_depth=4 (pipeline GPU 4 frame), pix_fmt nv12 (native AMF, tránh swscale yuv420p→nv12 mỗi frame).
    const amfBaseArgs = ['-c:v', 'h264_amf', '-usage', 'transcoding', '-quality', 'speed', '-bf', '0', '-async_depth', '4'];
    videoEncodeArgs = [...amfBaseArgs, ...bitrateArgs, '-pix_fmt', 'nv12', '-tag:v', 'avc1'];
    reupVideoEncodeArgs = [...amfBaseArgs, ...reupBitrateArgs, '-pix_fmt', 'nv12', '-tag:v', 'avc1'];
    makeAudioVideoEncodeArgs = [...amfBaseArgs, ...makeAudioBitrateArgs, '-pix_fmt', 'nv12', '-tag:v', 'avc1'];
    encoderLabel = 'GPU AMD (h264_amf, async_depth=4)';
  } else if (hasQsv) {
    console.log('🔍 Intel Quick Sync Video: true');
    encoder = 'h264_qsv';
    stockDecodeArgs = ['-hwaccel', 'qsv'];
    videoEncodeArgs = ['-c:v', 'h264_qsv', '-preset', 'veryfast', ...bitrateArgs, '-pix_fmt', 'yuv420p', '-tag:v', 'avc1'];
    reupVideoEncodeArgs = ['-c:v', 'h264_qsv', '-preset', 'veryfast', ...reupBitrateArgs, '-pix_fmt', 'yuv420p', '-tag:v', 'avc1'];
    makeAudioVideoEncodeArgs = [
      '-c:v',
      'h264_qsv',
      '-preset',
      'veryfast',
      ...makeAudioBitrateArgs,
      '-pix_fmt',
      'yuv420p',
      '-tag:v',
      'avc1',
    ];
    encoderLabel = 'GPU Intel QSV (h264_qsv)';
  } else {
    console.log('🔍 libx264: true');
    encoder = 'libx264';
    stockDecodeArgs = [];
    videoEncodeArgs = ['-c:v', 'libx264', '-crf', '28', '-preset', 'ultrafast', ...bitrateArgs, '-pix_fmt', 'yuv420p', '-tag:v', 'avc1'];
    reupVideoEncodeArgs = [
      '-c:v',
      'libx264',
      '-crf',
      '30',
      '-preset',
      'ultrafast',
      ...reupBitrateArgs,
      '-pix_fmt',
      'yuv420p',
      '-tag:v',
      'avc1',
    ];
    makeAudioVideoEncodeArgs = [
      '-c:v',
      'libx264',
      '-crf',
      '32',
      '-preset',
      'ultrafast',
      ...makeAudioBitrateArgs,
      '-pix_fmt',
      'yuv420p',
      '-tag:v',
      'avc1',
    ];
    encoderLabel = 'CPU (libx264 ultrafast)';
  }

  return {
    gpus,
    encoder,
    videoEncodeArgs,
    reupVideoEncodeArgs,
    makeAudioVideoEncodeArgs,
    stockDecodeArgs,
    encoderLabel,
    hasNvenc,
    hasAmf,
    hasQsv,
    isHwAccelerated: hasNvenc || hasAmf || hasQsv,
  };
}

const GPU_INFO = detectHardware();

// Log kết quả detect
if (GPU_INFO.gpus.length > 0) {
  console.log('🖥️  GPU detected:');
  for (const g of GPU_INFO.gpus) {
    const tag = g.type === 'discrete' ? '🟢 rời' : g.type === 'integrated' ? '🔵 tích hợp' : '⚪ unknown';
    console.log(`   ${tag}  ${g.name} (${g.vendor})`);
  }
} else {
  console.log('🖥️  Không detect được GPU qua WMI.');
}
console.log(`🎬 Encoder: ${GPU_INFO.encoderLabel}`);

/** Backward compat — các file cũ import { HAS_NVENC } */
export const HAS_NVENC = GPU_INFO.hasNvenc;

export { GPU_INFO };
export default GPU_INFO;
