import { useApp } from '../store';
import AdvisorChat from './AdvisorChat';
import { Modal } from './ui';

export default function AdvisorDrawer() {
  const open = useApp((s) => s.advisorOpen);
  const setOpen = useApp((s) => s.setAdvisorOpen);
  const close = () => setOpen(false);
  return (
    <Modal open={open} onClose={close} label="AI College Match" width="max-w-xl">
      <AdvisorChat mode="collegeMatch" onClose={close} className="h-[80vh] sm:h-[640px]" />
    </Modal>
  );
}
