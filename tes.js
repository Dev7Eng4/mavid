import { getYoutubePublishPlan } from './contents/utils/youtube.util.js';

function createPublishPlan() {
  const publishPlan = getYoutubePublishPlan({ channelFolder: 'UCZkK8tFfoedlr4LcNN2UxpA', email: 'duongbich9n7@gmail.com', uploadCount: 6 });
  console.log('🚀 ~ createPublishPlan ~ publishPlan:', publishPlan);
}

createPublishPlan();
