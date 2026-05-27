import { PATHS } from '../constants/paths';

export async function main(folder = PATHS.DOWNLOADS) {
  const transcriptObjects = await convertTranscript(folder);

  const beats = await processBeats(transcriptObjects);

  return beats;
}

main();
