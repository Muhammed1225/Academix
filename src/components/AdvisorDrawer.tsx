import type { CSSProperties, Ref } from 'react';

import { useApp } from '../store';
import AdvisorChat, { type AdvisorHeaderDragHandlers } from './AdvisorChat';
import { Modal } from './ui';

export default function AdvisorDrawer({
  open,
  onClose,
  dialogStyle,
  dialogRef,
  headerDragHandlers,
}: {
  open?: boolean;
  onClose?: () => void;
  dialogStyle?: CSSProperties;
  dialogRef?: Ref<HTMLDivElement>;
  headerDragHandlers?: AdvisorHeaderDragHandlers;
}) {
  const setOpen = useApp((s) => s.setAdvisorOpen);
  const storeOpen = useApp((s) => s.advisorOpen);
  const isOpen = open ?? storeOpen;
  const close = onClose ?? (() => setOpen(false));
  return (
    <Modal open={isOpen} onClose={close} label="AI College Match" width="max-w-xl" dialogStyle={dialogStyle} dialogRef={dialogRef}>
      <AdvisorChat
        mode="collegeMatch"
        onClose={close}
        className="h-[min(640px,80vh,calc(100dvh-var(--chat-dock-height,0px)-2rem))]"
        headerDragHandlers={headerDragHandlers}
      />
    </Modal>
  );
}
