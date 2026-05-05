import type { ConstantsUiModel } from '@/types';

/** Gom các khóa Settings IPC (chỉ APP_SETTINGS) từ module constants đã merge. */
export function constantsModuleToUiModel(mod: Record<string, unknown>): ConstantsUiModel {
  return {
    APP_SETTINGS: mod.APP_SETTINGS as ConstantsUiModel['APP_SETTINGS'],
  };
}
