export const MOTION_PRESETS = {
  text_infographic: {
    effect: 'center_zoom_in',
    fromScale: 1.0,
    toScale: 1.035,
    reason: 'Giữ chữ dễ đọc, không làm lệch bố cục',
  },

  warning_scene: {
    effect: 'center_zoom_in',
    fromScale: 1.0,
    toScale: 1.04,
    reason: 'Tạo cảm giác chú ý nhưng không quá căng',
  },

  comparison_slide: {
    effect: 'slight_pan_left_to_right',
    fromScale: 1.025,
    toScale: 1.045,
    reason: 'Phù hợp ảnh có bảng so sánh trái/phải',
  },

  checklist_slide: {
    effect: 'slight_pan_down',
    fromScale: 1.025,
    toScale: 1.04,
    reason: 'Hợp với ảnh dạng danh sách/checklist',
  },

  emotional_lifestyle: {
    effect: 'slow_zoom_out',
    fromScale: 1.055,
    toScale: 1.0,
    reason: 'Tạo cảm giác nhẹ, thở, ít áp lực',
  },

  family_discussion: {
    effect: 'very_slow_zoom_in',
    fromScale: 1.0,
    toScale: 1.03,
    reason: 'Giữ sự tự nhiên, không gây chóng mặt',
  },
};
