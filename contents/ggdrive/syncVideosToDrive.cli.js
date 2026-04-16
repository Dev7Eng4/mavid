#!/usr/bin/env node
import runSyncVideosToDrive from './syncVideosToDrive.flow.js';

runSyncVideosToDrive()
  .then(r => {
    console.log('[syncVideosToDrive.cli] Kết quả:', JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
