import { useCallback, useEffect, useState } from 'react';
import { AppButton } from '@/components/ui/AppButton';
import { PageHeader } from '@/components/ui/PageHeader';
import AddResource from './components/AddResource';
import { VISUAL_RESOURCE_TYPE } from './constants';

interface VisualResource {
  channelId: string;
  channelName: string;
  type: string;
}

export default function VisualPage() {
  const [resources, setResources] = useState<VisualResource[]>([]);
  const [actionStatus, setActionStatus] = useState<{
    type: 'add' | 'edit';
    data: null;
  } | null>(null);

  const loadResources = useCallback(async () => {
    try {
      const list = await window.runner.listVisualResources();
      setResources(list ?? []);
    } catch (err) {
      console.error('[visual-resource] Lỗi khi load danh sách:', err);
    }
  }, []);

  const onAdd = useCallback(() => {
    setActionStatus({ type: 'add', data: null });
  }, []);

  const handleAddResource = async (form: { link: string; type: string }) => {
    try {
      const result = await window.runner.runScript('addVisualResource', {
        url: form.link,
        type: form.type,
      });
      console.log('[visual-resource] Kết quả:', result);
      setActionStatus(null);
      await loadResources();
    } catch (err) {
      console.error('[visual-resource] Lỗi:', err);
    }
  };

  const handleDeleteResource = async (channelId: string) => {
    try {
      const result = await window.runner.runScript('deleteVisualResource', { channelId });
      console.log('[visual-resource] Kết quả:', result);
      await loadResources();
    } catch (err) {
      console.error('[visual-resource] Lỗi:', err);
    }
  };

  useEffect(() => {
    window.runner
      .listVisualResources()
      .then(list => setResources(list ?? []))
      .catch(() => setResources([]));
  }, []);

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageHeader
        align='start'
        title='Visual Resource'
        description=''
        actions={
          <AppButton type='button' variant='primary' onClick={onAdd}>
            Add Visual
          </AppButton>
        }
      />

      <div
        className='rounded-2xl w-full min-w-0 overflow-hidden'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className='overflow-auto w-full min-w-0'>
          <table className='w-full min-w-0 text-base' style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--code-bg)' }}>
                <th
                  className='text-left px-4 py-3 font-medium uppercase text-base tracking-wider w-16'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  #
                </th>
                <th
                  className='text-left px-4 py-3 font-medium uppercase text-base tracking-wider'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  Channel Name
                </th>
                <th
                  className='text-left px-4 py-3 font-medium uppercase text-base tracking-wider'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  Type
                </th>
                <th
                  className='text-right px-4 py-3 font-medium uppercase text-base tracking-wider whitespace-nowrap w-1'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource, index) => (
                <tr key={resource.channelId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className='px-4 py-3 text-base tabular-nums' style={{ color: 'var(--text-muted)' }}>
                    {index + 1}
                  </td>
                  <td className='px-4 py-3 wrap-break-word text-base' style={{ color: 'var(--text-h)' }}>
                    {resource.channelName}
                  </td>
                  <td className='px-4 py-3 text-base' style={{ color: 'var(--text-h)' }}>
                    {VISUAL_RESOURCE_TYPE.find(t => t.id === resource.type)?.label || ''}
                  </td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    <AppButton
                      type='button'
                      variant='danger'
                      size='md'
                      onClick={() => handleDeleteResource(resource.channelId)}
                      className='py-1.5'
                    >
                      Delete
                    </AppButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {actionStatus?.type === 'add' && <AddResource onClose={() => setActionStatus(null)} onConfirm={handleAddResource} />}
    </div>
  );
}
