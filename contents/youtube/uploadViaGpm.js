/**
 * Upload tuần tự file .mp4 lên YouTube qua trình duyệt profile GPM (API Local + CDP).
 * Mỗi thư mục con (sắp xếp tên) trong `MaVidMedia/channels/{channelFolder}/` có ít nhất một .mp4 → một lần upload.
 *
 * @param {object} params
 * @param {string} params.gpmProfileId — id profile GPM (UUID)
 * @param {string} params.channelFolder — tên thư mục kênh (an toàn, không ..)
 * @param {number | null | undefined} params.maxUploads — giới hạn số video; null/undefined = tất cả thư mục hợp lệ
 * @param {string[]} [params.uploadFolderNames] — nếu có: chỉ upload các thư mục con này, đúng thứ tự (khớp batch vừa tạo)
 * @param {string} [params.gpmApiBase] — ưu tiên; nếu thiếu dùng `process.env.GPM_API_BASE` (vd. http://127.0.0.1:19995/api/v3), sau đó `GPM_API_ORIGIN` (chỉ origin), cuối cùng mặc định cục bộ — không cần build lại app khi đổi qua biến môi trường.
 * @param {string} [params.email] — email kênh trong `mavid-channel-config.json` → `getYoutubePublishPlan` (ngày/giờ public) ở bước Schedule.
 */
import path from 'path';
import { delay } from '../utils/dom.util.js';
import { connectPlaywrightToGpmProfile, closeProfile } from '../scripts/openGpmPlaywright.js';
import { syncChannelAfterYoutubeUpload } from './uploadAfterSync.js';
import { moveSuccessfulUploadFoldersToVideosArchive } from './moveUploadedFoldersToVideosArchive.js';
import { getYoutubePublishPlan } from './publishSchedule.util.js';
import { apiRootForPlaywright, listUploadJobs } from './uploadJobs.util.js';
import { assertSafeChannelFolder } from './channelFolder.util.js';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { openYoutubeUpload, selectFile, fillVideoDetails, addRelatedVideo, chooseVisibility } from './studioUploadFlow.js';

/**
 * @param {Record<string, unknown>} raw
 */
export default async function main(raw = {}) {
  const gpmProfileId = typeof raw.gpmProfileId === 'string' ? raw.gpmProfileId.trim() : '';
  if (!gpmProfileId) throw new Error('Thiếu gpmProfileId.');

  const channelFolder = assertSafeChannelFolder(typeof raw.channelFolder === 'string' ? raw.channelFolder : '');
  const scheduleEmail = typeof raw.email === 'string' ? raw.email.trim() : '';
  const maxRaw = raw.maxUploads;
  const maxUploads =
    maxRaw == null || maxRaw === '' ? null : Number.isFinite(Number(maxRaw)) && Number(maxRaw) > 0 ? Math.floor(Number(maxRaw)) : null;

  const apiBase = apiRootForPlaywright(typeof raw.gpmApiBase === 'string' ? raw.gpmApiBase.trim() : '');

  const uploadFolderNames = Array.isArray(raw.uploadFolderNames)
    ? raw.uploadFolderNames.map(x => String(x ?? '').trim()).filter(Boolean)
    : null;

  const channelAbs = path.join(resolveChannelsDir(), channelFolder);
  const jobs = listUploadJobs(channelAbs, maxUploads, uploadFolderNames && uploadFolderNames.length > 0 ? uploadFolderNames : null);

  if (jobs.length === 0) {
    throw new Error(
      `Không có thư mục con nào chứa file .mp4 trong ${channelAbs} (đã giới hạn ${maxUploads == null ? 'tất cả' : maxUploads} video).`
    );
  }

  console.log(`[upload] Kênh «${channelFolder}»: ${jobs.length} video — GPM profile ${gpmProfileId}`);

  /** @type {Array<{ date: string, time: string, iso: string }> | null} */
  let publishSchedule = null;
  /** `uploadedVideos` trong config trước batch (cho addRelatedVideo). */
  let baselineUploadedVideosFromConfig = 0;
  if (scheduleEmail) {
    try {
      const { schedule, settings } = getYoutubePublishPlan({
        channelFolder,
        email: scheduleEmail,
        uploadCount: jobs.length,
      });
      publishSchedule = schedule;
      baselineUploadedVideosFromConfig = Number.isFinite(Number(settings?.uploadedVideos))
        ? Math.max(0, Math.floor(Number(settings.uploadedVideos)))
        : 0;
      console.log(`[upload] getYoutubePublishPlan: ${schedule.length} mốc (email «${scheduleEmail}»).`);
    } catch (e) {
      console.warn('[upload] getYoutubePublishPlan:', e instanceof Error ? e.message : e);
    }
  } else {
    console.warn('[upload] Thiếu email — không tính lịch publish, chỉ bấm Schedule.');
  }

  const gpmOpts = { apiBase };

  let browser;
  /** @type {import('playwright').BrowserContext | undefined} */
  let context;
  /** Profile id thực tế từ GPM sau khi start — dùng cho API đóng Chrome. */
  let profileIdToStop = /** @type {string | null} */ (null);
  try {
    const connected = await connectPlaywrightToGpmProfile(gpmProfileId, gpmOpts);
    browser = connected.browser;
    context = connected.context;
    let page = connected.page;
    profileIdToStop = String(connected.gpm?.profileId || gpmProfileId).trim() || gpmProfileId;

    /** Thư mục video đã chạy xong toàn bộ bước upload + schedule (theo thứ tự jobs). */
    const successfulFolderNames = [];
    /** Mốc schedule (getYoutubePublishPlan) của video upload thành công cuối cùng — ghi `latestUpload*` trong mavid-channel-config. */
    let latestSuccessfulScheduleSlot = /** @type {{ date: string, time: string, iso?: string } | null} */ (null);

    for (let i = 0; i < jobs.length; i++) {
      const { folderName, folderPath, mp4Path } = jobs[i];
      console.log(`[upload] (${i + 1}/${jobs.length}) Thư mục «${folderName}» → ${path.basename(mp4Path)}`);

      try {
        if (i === 0) {
          await openYoutubeUpload(page, mp4Path);
        } else {
          await selectFile(page, mp4Path);
        }

        await fillVideoDetails(page, folderPath);
        await addRelatedVideo(page, baselineUploadedVideosFromConfig === 2, mp4Path);
        await chooseVisibility(page, {
          slot: publishSchedule?.[i] ?? null,
          jobIndex: i,
          totalJobs: jobs.length,
        });
        baselineUploadedVideosFromConfig++;
        successfulFolderNames.push(folderName);
        const slot = publishSchedule?.[i];
        latestSuccessfulScheduleSlot =
          slot && String(slot.date || '').trim() && String(slot.time || '').trim() ? slot : null;
      } catch (e) {
        console.warn('[upload]', e instanceof Error ? e.message : e);
      }

      if (i < jobs.length - 1) {
        await delay(2500 + Math.random() * 1500);
      }
    }

    await syncChannelAfterYoutubeUpload({
      channelFolder,
      email: scheduleEmail,
      successfulFolderNames,
      publishSchedule,
      latestScheduleSlot: latestSuccessfulScheduleSlot,
    });

    const videosArchive = moveSuccessfulUploadFoldersToVideosArchive({
      channelFolder,
      successfulFolderNames,
    });

    return {
      ok: true,
      uploaded: jobs.length,
      uploadedSuccessful: successfulFolderNames.length,
      channelFolder,
      jobs: jobs.map(j => ({ folder: j.folderName, file: path.basename(j.mp4Path) })),
      videosArchive,
    };
  } finally {
    /* Chrome do GPM mở: bắt buộc GPM Local API `profiles/close/{id}` (cùng `gpmApi.closeProfile`), sau đó mới ngắt CDP. */
    if (profileIdToStop) {
      try {
        await closeProfile(profileIdToStop, { apiBase: gpmOpts.apiBase });
        console.log(`[upload] GPM API closeProfile — ${profileIdToStop}`);
      } catch (e) {
        console.warn('[upload] closeProfile:', e instanceof Error ? e.message : e);
      }
    }
    if (context) {
      try {
        await context.close();
      } catch {
        /* ignore */
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }
}
