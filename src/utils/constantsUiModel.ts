import type { ConstantsUiModel } from '@/types';
import { CONSTANT_EXPORT_KEYS } from '@contents/constants/constantsExportKeys.js';

/** Gom đúng các khóa Settings IPC từ object module constants (defaults hoặc đã merge overlay). */
export function constantsModuleToUiModel(mod: Record<string, unknown>): ConstantsUiModel {
  const model: Record<string, unknown> = {};
  for (const key of CONSTANT_EXPORT_KEYS) {
    model[key] = mod[key];
  }
  return model as unknown as ConstantsUiModel;
}
