import { useEffect, useState } from 'react';
import type { BackgroundOption, VideoFromAudioConfig } from '../../types';
import { CustomSelect } from '../ui/CustomSelect';

interface Props {
  onConfirm: (config: VideoFromAudioConfig) => void;
  onCancel: () => void;
}

const CHANNEL_ICON = (
  <svg className='shrink-0' width='14' height='14' viewBox='0 0 16 16' fill='none' style={{ opacity: 0.7 }}>
    <path d='M2 4h12M2 8h12M2 12h12' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
);

export function VideoFromAudioPopup({ onConfirm, onCancel }: Props) {
  const [channel, setChannel] = useState('');
  const [background, setBackground] = useState('cat');
  const [stockVideoCount, setStockVideoCount] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(0.91);
  const [maxVideosPerBatch, setMaxVideosPerBatch] = useState(5);
  const [minDurationMinutes, setMinDurationMinutes] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);
  const [channels, setChannels] = useState<string[]>([]);

  useEffect(() => {
    const defaultBg = 'cat';
    window.runner
      .listBackgrounds()
      .then(list => {
        setBackgrounds(list);
        if (list.length > 0 && !list.some(bg => bg.id === defaultBg)) setBackground(list[0].id);
      })
      .catch(() => {});
    window.runner
      .listChannelFolders()
      .then(list => {
        setChannels(list);
        if (list.length > 0) setChannel(list[0]);
      })
      .catch(() => {});
  }, []);

  function handleSubmit() {
    onConfirm({
      channel,
      background,
      stockVideoCount,
      audioSpeed,
      maxVideosPerBatch,
      minDurationMinutes,
      showLogo,
    });
  }

  function adjustStock(delta: number) {
    setStockVideoCount(prev => Math.max(0, Math.min(50, prev + delta)));
  }

  function adjustMaxVideos(delta: number) {
    setMaxVideosPerBatch(prev => Math.max(1, Math.min(100, prev + delta)));
  }

  function adjustMinDuration(delta: number) {
    setMinDurationMinutes(prev => Math.max(0, Math.min(10080, prev + delta)));
  }

  const bgOptions = backgrounds.map(bg => ({ value: bg.id, label: bg.label }));
  const chOptions = channels.map(n => ({ value: n }));

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center'
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className='rounded-2xl w-full max-w-[420px] overflow-hidden'
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='px-5 pt-5 pb-3'>
          <h3 className='text-[15px] font-semibold m-0' style={{ color: 'var(--text-h)' }}>
            Cấu hình tạo video từ audio
          </h3>
          <p className='text-[11px] mt-1' style={{ color: 'var(--text)', opacity: 0.7 }}>
            Chọn tuỳ chỉnh trước khi chạy script
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Body */}
        <div className='px-5 py-4 space-y-4'>
          {/* Channel */}
          <div className='space-y-2'>
            <label className='block text-[11px] font-medium uppercase tracking-wider' style={{ color: 'var(--text)', opacity: 0.8 }}>
              Channel
            </label>
            <CustomSelect
              value={channel}
              options={chOptions}
              onChange={setChannel}
              placeholder='Chọn channel...'
              emptyText='Không tìm thấy folder trong MaVidMedia/channels/'
              icon={CHANNEL_ICON}
            />
          </div>

          {/* Background */}
          <div className='space-y-2'>
            <label className='block text-[11px] font-medium uppercase tracking-wider' style={{ color: 'var(--text)', opacity: 0.8 }}>
              Background video
            </label>
            <CustomSelect
              value={background}
              options={bgOptions}
              onChange={setBackground}
              emptyText='Không tìm thấy folder trong MaVidMedia/backgrounds'
            />
          </div>

          {/* Stock video count */}
          <div className='space-y-2'>
            <label className='block text-[11px] font-medium uppercase tracking-wider' style={{ color: 'var(--text)', opacity: 0.8 }}>
              Số lượng video stock
            </label>
            <div
              className='flex items-center rounded-lg overflow-hidden'
              style={{ border: '1px solid var(--border)', background: 'var(--code-bg)' }}
            >
              <button
                onClick={() => adjustStock(-1)}
                className='px-3 py-[9px] text-sm font-medium cursor-pointer transition-colors duration-100 shrink-0'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', borderRight: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                −
              </button>
              <input
                type='number'
                min={0}
                max={50}
                value={stockVideoCount}
                onChange={e => setStockVideoCount(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                className='flex-1 text-center text-sm outline-none py-[9px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', minWidth: 0 }}
              />
              <button
                onClick={() => adjustStock(1)}
                className='px-3 py-[9px] text-sm font-medium cursor-pointer transition-colors duration-100 shrink-0'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', borderLeft: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                +
              </button>
            </div>
            <p className='text-[10px]' style={{ color: 'var(--text)', opacity: 0.5 }}>
              Đặt 0 để tự tính theo thời lượng audio
            </p>
          </div>

          {/* Max videos per batch */}
          <div className='space-y-2'>
            <label className='block text-[11px] font-medium uppercase tracking-wider' style={{ color: 'var(--text)', opacity: 0.8 }}>
              Số video tối đa mỗi lần
            </label>
            <div
              className='flex items-center rounded-lg overflow-hidden'
              style={{ border: '1px solid var(--border)', background: 'var(--code-bg)' }}
            >
              <button
                type='button'
                onClick={() => adjustMaxVideos(-1)}
                className='px-3 py-[9px] text-sm font-medium cursor-pointer transition-colors duration-100 shrink-0'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', borderRight: '1px solid var(--border)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                −
              </button>
              <input
                type='number'
                min={1}
                max={100}
                value={maxVideosPerBatch}
                onChange={e => setMaxVideosPerBatch(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className='flex-1 text-center text-sm outline-none py-[9px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', minWidth: 0 }}
              />
              <button
                type='button'
                onClick={() => adjustMaxVideos(1)}
                className='px-3 py-[9px] text-sm font-medium cursor-pointer transition-colors duration-100 shrink-0'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', borderLeft: '1px solid var(--border)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                +
              </button>
            </div>
            <p className='text-[10px]' style={{ color: 'var(--text)', opacity: 0.5 }}>
              Mặc định 5 — tối đa 100 mỗi lần chạy
            </p>
          </div>

          {/* Min duration (minutes) */}
          <div className='space-y-2'>
            <label className='block text-[11px] font-medium uppercase tracking-wider' style={{ color: 'var(--text)', opacity: 0.8 }}>
              Độ dài tối thiểu (phút)
            </label>
            <div
              className='flex items-center rounded-lg overflow-hidden'
              style={{ border: '1px solid var(--border)', background: 'var(--code-bg)' }}
            >
              <button
                type='button'
                onClick={() => adjustMinDuration(-5)}
                className='px-3 py-[9px] text-sm font-medium cursor-pointer transition-colors duration-100 shrink-0'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', borderRight: '1px solid var(--border)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                −
              </button>
              <input
                type='number'
                min={0}
                max={10080}
                value={minDurationMinutes}
                onChange={e => setMinDurationMinutes(Math.max(0, Math.min(10080, Number(e.target.value) || 0)))}
                className='flex-1 text-center text-sm outline-none py-[9px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', minWidth: 0 }}
              />
              <button
                type='button'
                onClick={() => adjustMinDuration(5)}
                className='px-3 py-[9px] text-sm font-medium cursor-pointer transition-colors duration-100 shrink-0'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', borderLeft: '1px solid var(--border)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                +
              </button>
            </div>
            <p className='text-[10px]' style={{ color: 'var(--text)', opacity: 0.5 }}>
              0 = không lọc; &gt;0 = chỉ dòng có DURATION ≥ N phút trong Excel
            </p>
          </div>

          {/* Audio speed */}
          <div className='space-y-2'>
            <label className='block text-[11px] font-medium uppercase tracking-wider' style={{ color: 'var(--text)', opacity: 0.8 }}>
              Audio speed
            </label>
            <div
              className='flex items-center rounded-lg overflow-hidden'
              style={{ border: '1px solid var(--border)', background: 'var(--code-bg)' }}
            >
              <button
                onClick={() => setAudioSpeed(prev => Math.max(0.5, +(prev - 0.01).toFixed(2)))}
                className='px-3 py-[9px] text-sm font-medium cursor-pointer transition-colors duration-100 shrink-0'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', borderRight: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                −
              </button>
              <input
                type='number'
                min={0.5}
                max={2}
                step={0.01}
                value={audioSpeed}
                onChange={e => setAudioSpeed(Math.max(0.5, Math.min(2, +(Number(e.target.value) || 0.91).toFixed(2))))}
                className='flex-1 text-center text-sm outline-none py-[9px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', minWidth: 0 }}
              />
              <button
                onClick={() => setAudioSpeed(prev => Math.min(2, +(prev + 0.01).toFixed(2)))}
                className='px-3 py-[9px] text-sm font-medium cursor-pointer transition-colors duration-100 shrink-0'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none', borderLeft: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                +
              </button>
            </div>
            <p className='text-[10px]' style={{ color: 'var(--text)', opacity: 0.5 }}>
              {'< 1 = chậm hơn (dài hơn), > 1 = nhanh hơn (ngắn hơn)'}
            </p>
          </div>

          {/* Show logo */}
          <div
            className='flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-colors duration-150'
            style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}
            onClick={() => setShowLogo(!showLogo)}
          >
            <span className='text-xs font-medium' style={{ color: 'var(--text-h)' }}>
              Hiển thị logo
            </span>
            <div
              className='relative w-[38px] h-[22px] rounded-full transition-colors duration-200 shrink-0'
              style={{ background: showLogo ? 'var(--accent)' : 'rgba(255,255,255,0.12)' }}
            >
              <span
                className='absolute top-[3px] left-[3px] w-4 h-4 rounded-full transition-transform duration-200'
                style={{
                  background: showLogo ? '#fff' : 'var(--text)',
                  transform: showLogo ? 'translateX(16px)' : 'translateX(0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Footer */}
        <div className='flex gap-2 justify-end px-5 py-3.5'>
          <button
            onClick={onCancel}
            className='rounded-lg px-4 py-[7px] text-xs font-medium cursor-pointer transition-colors duration-150'
            style={{ color: 'var(--text)', background: 'transparent', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className='rounded-lg px-5 py-[7px] text-xs font-medium cursor-pointer transition-all duration-150'
            style={{
              color: '#fff',
              background: 'var(--accent)',
              border: '1px solid var(--accent)',
              boxShadow: '0 1px 4px rgba(192,132,252,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            Chạy
          </button>
        </div>
      </div>
    </div>
  );
}
