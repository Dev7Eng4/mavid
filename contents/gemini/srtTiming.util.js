/**
 * Ước lượng thời lượng video (phút) từ các cue SRT.
 * @param {string[]} cuesArray
 */
export function getSrtDurationInMinutes(cuesArray) {
  if (!cuesArray || cuesArray.length === 0) return 0;
  const lastCue = cuesArray[cuesArray.length - 1];
  const match = lastCue.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/g);
  if (match && match.length > 0) {
    const timeStr = match[match.length - 1];
    const parts = timeStr.split(/[:,.]/);
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    return hours * 60 + minutes + seconds / 60;
  }
  return 0;
}
