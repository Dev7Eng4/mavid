import { AppButton } from '@/components/ui/AppButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import React, { useState } from 'react';
import { VISUAL_RESOURCE_TYPE } from '../constants';

interface AddResourceProps {
  onClose: VoidFunction;
  onConfirm: (form: typeof initialForm) => void;
}

const initialForm = {
  link: '',
  type: VISUAL_RESOURCE_TYPE[0].id,
};

const AddResource = ({ onClose, onConfirm }: AddResourceProps) => {
  const [form, setForm] = useState<typeof initialForm>(initialForm);

  const handleConfirm = () => {
    onConfirm(form);
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden'
      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
      onClick={() => {}}
      role='presentation'
    >
      <div
        className='max-w-lg w-full my-8 rounded-2xl p-6 sm:p-8 shadow-xl overflow-visible relative z-1 max-h-[min(90vh,720px)] flex flex-col min-h-0'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal
        aria-labelledby='create-video-dialog-title'
      >
        <h2 id='create-video-dialog-title' className='text-lg font-semibold shrink-0' style={{ color: 'var(--text-h)' }}>
          Thêm visual resource
        </h2>

        <div className='grid grid-cols-1 gap-y-4 mt-4 min-h-0 flex-1 pr-1 content-start overflow-visible'>
          <div className='min-w-0'>
            <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }} htmlFor='create-max-videos'>
              Link source
            </label>
            <input
              value={form.link}
              onChange={e => {
                setForm(prev => ({ ...prev, link: e.target.value }));
              }}
              placeholder='Nhập link tài nguyên'
              className='w-full rounded-xl px-3 py-2.5 text-base outline-none border transition-colors duration-150'
              style={{
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                borderColor: 'var(--border)',
              }}
            />
          </div>

          <div className='min-w-0'>
            <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }} htmlFor='create-max-videos'>
              Loại tài nguyên
            </label>
            <CustomSelect
              value={form.type}
              onChange={value => {
                setForm(prev => ({ ...prev, type: value }));
              }}
              placeholder='Chọn loại tài nguyên'
              options={VISUAL_RESOURCE_TYPE.map(item => ({ value: item.id, label: item.label }))}
              menuZIndex={1000}
            />
          </div>
        </div>

        <div
          className='flex flex-wrap justify-end gap-2 shrink-0 border-t'
          style={{ marginTop: '16px', paddingTop: '16px', borderColor: 'var(--border)' }}
        >
          <AppButton type='button' variant='neutral' onClick={onClose}>
            Hủy
          </AppButton>
          <AppButton type='button' variant='primary' onClick={handleConfirm}>
            Xác nhận
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export default AddResource;
