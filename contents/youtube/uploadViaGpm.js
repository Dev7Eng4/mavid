/**
 * Upload tuần tự file .mp4 lên YouTube qua trình duyệt profile GPM (API Local + CDP).
 * Mỗi thư mục con trong `MaVidMedia/channels/{channelFolder}/` có ít nhất một .mp4 và một ảnh thumbnail (.png/.jpg/.jpeg) → một lần upload.
 * Sau khi upload + archive: promise trả về ngay; chờ 15 phút rồi gọi GPM `close` + tắt Playwright chạy nền (không chặn hàng đợi upload nhiều kênh).
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
import { getChannelDirPath } from '../api/urls/getListAllPaths.js';
import { closeProfile, connectPlaywrightToGpmProfile } from '../scripts/openGpmPlaywright.js';
import { delay } from '../utils/dom.util.js';
import { resolveGpmProfileIdByEmail } from '../utils/gpm.util.js';
import { logToLogsPage } from '../utils/logToLogsPage.util.js';
import { assertSafeChannelFolder } from './channelFolder.util.js';
import { moveSuccessfulUploadFoldersToVideosArchive } from './moveUploadedFoldersToVideosArchive.js';
import { getYoutubePublishPlan } from './publishSchedule.util.js';
import { scheduleSlotToLocalDate } from './publishScheduleByDuration.util.js';
import { addRelatedVideo, chooseVisibility, fillVideoDetails, openYoutubeUpload, selectFile } from './studioUploadFlow.js';
import { syncChannelAfterYoutubeUpload } from './uploadAfterSync.js';
import { apiRootForPlaywright, listUploadJobs } from './uploadJobs.util.js';

/**
 * Mốc publish → ms (dùng sắp thứ tự upload: sớm → muộn). Ưu tiên `iso` nếu có.
 * @param {{ date?: string, time?: string, iso?: string } | null | undefined} s
 */
function scheduleSlotToUnixMs(s) {
  if (!s || typeof s !== 'object') return Number.MAX_SAFE_INTEGER;
  const iso = String(s.iso ?? '').trim();
  if (iso) {
    const t = new Date(iso).getTime();
    if (Number.isFinite(t)) return t;
  }
  const d = scheduleSlotToLocalDate(/** @type {{ date: string, time: string, iso?: string }} */ (s));
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}

/**
 * Email kênh trong `mavid-channel-config.json` → `getYoutubePublishPlan` (ngày/giờ public) ở bước Schedule.
 * @param {string} email
 * @param {string} id
 * @param {string} channelFolder
 * @param {number | null | undefined} maxUploads
 * @param {string[]} [uploadFolderNames]
 * @param {string} [gpmApiBase]
 */
export default async function main(raw = {}) {
  if (!raw.id || !raw.channelFolder) {
    logToLogsPage(`[upload] Thiếu id. Không thể upload YouTube qua GPM.`, 'error');
    return;
  }

  if (!raw.email) {
    logToLogsPage(`[upload] Thiếu email. Không thể upload YouTube qua GPM.`, 'error');
    return;
  }

  const scheduleEmail = raw.email.trim();

  const gpmProfileId = await resolveGpmProfileIdByEmail(scheduleEmail);

  if (!gpmProfileId) {
    logToLogsPage(`[upload] Không tìm thấy profile GPM cho email ${scheduleEmail}`, 'error');
    return;
  }

  const channelFolder = assertSafeChannelFolder(typeof raw.channelFolder === 'string' ? raw.channelFolder : '');
  const maxRaw = raw.maxUploads;
  const maxUploads = !!maxRaw ? maxRaw : 5;

  const apiBase = apiRootForPlaywright(typeof raw.gpmApiBase === 'string' ? raw.gpmApiBase.trim() : '');

  const uploadFolderNames = Array.isArray(raw.uploadFolderNames)
    ? raw.uploadFolderNames.map(x => String(x ?? '').trim()).filter(Boolean)
    : null;

  const channelAbs = getChannelDirPath(channelFolder);

  const jobs = await listUploadJobs(
    channelFolder,
    raw.id,
    maxUploads,
    uploadFolderNames && uploadFolderNames.length > 0 ? uploadFolderNames : null
  );

  if (jobs.length === 0) {
    throw new Error(
      `Không có thư mục con nào đủ điều kiện (.mp4 + thumbnail .png/.jpg/.jpeg) trong ${channelAbs} (đã giới hạn ${
        maxUploads == null ? 'tất cả' : maxUploads
      } video).`
    );
  }

  const showErrorLogs = message => {
    logToLogsPage(`[upload] Channel ${channelFolder} - Email ${scheduleEmail} - ${message}`, 'error');
  };

  // console.log(`[upload] Kênh «${channelFolder}»: ${jobs.length} video — GPM profile ${gpmProfileId}`);

  /** @type {Array<{ date: string, time: string, iso: string }> | null} */
  let publishSchedule = null;
  /** `uploadedVideos` trong config trước batch (cho addRelatedVideo). */
  let baselineUploadedVideosFromConfig = 0;
  try {
    const { schedule, settings } = await getYoutubePublishPlan({
      channelFolder,
      id: raw.id,
      uploadCount: jobs.length,
    });
    /** Thứ tự slot trùng thứ tự upload: video 1 → mốc 1, video 2 → mốc 2, … (từ publishTimes + preset trong config). */
    publishSchedule = schedule;
    baselineUploadedVideosFromConfig = Number.isFinite(Number(settings?.uploadedVideos))
      ? Math.max(0, Math.floor(Number(settings.uploadedVideos)))
      : 0;
    // console.log(`[upload] getYoutubePublishPlan: ${schedule.length} mốc (email «${scheduleEmail}»).`);
  } catch (e) {
    console.warn('[upload] getYoutubePublishPlan:', e instanceof Error ? e.message : e);
  }

  /** Cặp (job, slot) theo cùng chỉ số, rồi sắp theo mốc publish tăng dần (gần → xa). */
  const uploadQueue = (() => {
    const pairs = jobs.map((job, idx) => ({
      job,
      slot: publishSchedule && publishSchedule[idx] != null ? publishSchedule[idx] : null,
    }));
    if (!publishSchedule || publishSchedule.length !== jobs.length) return pairs;
    return [...pairs].sort((a, b) => scheduleSlotToUnixMs(a.slot) - scheduleSlotToUnixMs(b.slot));
  })();

  const gpmOpts = { apiBase };

  let browser;
  /** @type {import('playwright').BrowserContext | undefined} */
  let context;
  /** Profile id thực tế từ GPM sau khi start — dùng cho API đóng Chrome. */
  let profileIdToStop = /** @type {string | null} */ (null);
  /** Chỉ true khi upload + sync + archive xong bình thường — chờ trước khi đóng GPM. */
  let delayBeforeGpmClose = false;
  /** 15 phút (ms) giữ browser GPM mở sau khi xong để xử lý hậu kỳ / YouTube. */
  const GPM_CLOSE_DELAY_MS = 15 * 60 * 1000;
  try {
    const connected = await connectPlaywrightToGpmProfile(gpmProfileId, gpmOpts);
    browser = connected.browser;
    context = connected.context;
    let page = connected.page;
    profileIdToStop = String(connected.gpm?.profileId || gpmProfileId).trim() || gpmProfileId;

    /** Thư mục video đã chạy xong toàn bộ bước upload + schedule (thứ tự giống thứ tự upload theo mốc giờ). */
    const successfulFolderNames = [];

    for (let i = 0; i < uploadQueue.length; i++) {
      const { job, slot } = uploadQueue[i];
      const { folderName, folderPath, mp4Path } = job;
      console.log(
        `[upload] (${i + 1}/${uploadQueue.length}) Thư mục «${folderName}» → ${path.basename(mp4Path)} (mốc: ${slot?.date ?? '—'} ${
          slot?.time ?? ''
        })`
      );

      try {
        if (i === 0) {
          await openYoutubeUpload(page, mp4Path, i);
        } else {
          await selectFile(page, mp4Path);
        }

        await fillVideoDetails(page, folderPath, showErrorLogs);
        await addRelatedVideo(page, baselineUploadedVideosFromConfig === 2, mp4Path, showErrorLogs);
        await chooseVisibility(page, {
          slot: slot ?? null,
          jobIndex: i,
          totalJobs: jobs.length,
        });
        baselineUploadedVideosFromConfig++;
        successfulFolderNames.push(folderName);

        const forLatest = slot && String(slot.date ?? '').trim() && String(slot.time ?? '').trim() ? slot : null;
        try {
          await syncChannelAfterYoutubeUpload({
            channelFolder,
            id: raw.id,
            successfulFolderNames: [folderName],
            latestScheduleSlot: forLatest,
          });
        } catch (syncErr) {
          console.warn('[upload] syncChannelAfterYoutubeUpload sau 1 video:', syncErr instanceof Error ? syncErr.message : syncErr);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[upload]', msg);
        showErrorLogs(`Dừng batch — lỗi ở video ${i + 1}/${uploadQueue.length} («${folderName}»): ${msg}`);
        break;
      }

      if (i < uploadQueue.length - 1) {
        await delay(2500 + Math.random() * 1500);
      }
    }

    const videosArchive = moveSuccessfulUploadFoldersToVideosArchive({
      channelFolder,
      successfulFolderNames,
    });

    delayBeforeGpmClose = true;
    return {
      ok: true,
      uploaded: jobs.length,
      uploadedSuccessful: successfulFolderNames.length,
      channelFolder,
      jobs: jobs.map(j => ({ folder: j.folderName, file: path.basename(j.mp4Path) })),
      videosArchive,
    };
  } finally {
    if (!profileIdToStop) {
      /* chưa kết nối GPM */
    } else if (delayBeforeGpmClose) {
      /**
       * Không chặn `return` tới `run-script` (Electron) — hàng đợi nhiều kênh song song
       * cần resolve ngay khi upload + archive xong; chờ 15p + đóng profile chạy nền.
       */
      const pid = String(profileIdToStop).trim();
      const api = gpmOpts.apiBase;
      const ctx = context;
      const brw = browser;
      const delayMs = GPM_CLOSE_DELAY_MS;
      void (async () => {
        try {
          logToLogsPage(`[upload] Đã xong — chờ ${delayMs / 60000} phút (nền) rồi mới đóng trình duyệt GPM (profile ${pid}).`, 'info');
          await delay(delayMs);
        } catch (e) {
          console.warn('[upload] Chờ trước khi đóng GPM:', e instanceof Error ? e.message : e);
        }
        try {
          // await closeProfile(pid, { apiBase: api });
          console.log(`[upload] GPM API closeProfile — ${pid}`);
        } catch (e) {
          console.warn('[upload] closeProfile:', e instanceof Error ? e.message : e);
        }
        if (ctx) {
          try {
            await ctx.close();
          } catch {
            /* ignore */
          }
        }
        if (brw) {
          try {
            await brw.close();
          } catch {
            /* ignore */
          }
        }
      })().catch(e => {
        console.warn('[upload] Tác vụ nền đóng GPM:', e instanceof Error ? e.message : e);
      });
    } else {
      /* Lỗi trước khi bật delay — đóng nhanh, không chặn tụ lại nhiều 15p nền */
      try {
        // await closeProfile(String(profileIdToStop).trim(), { apiBase: gpmOpts.apiBase });
        console.log(`[upload] GPM API closeProfile — ${profileIdToStop}`);
      } catch (e) {
        console.warn('[upload] closeProfile:', e instanceof Error ? e.message : e);
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
}
