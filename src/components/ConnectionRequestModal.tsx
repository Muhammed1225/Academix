import { useEffect, useRef, useState } from 'react';

import { Icon, Modal } from './ui';
import { sendConnectionRequest } from '../connectionService';

const NOTE_LIMIT = 300;

export default function ConnectionRequestModal({
  personId,
  personName,
  open,
  onClose,
  onSent,
}: {
  personId: string;
  personName: string;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const okButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setNote('');
    setError('');
    setSent(false);
    const frame = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!sent) return;
    const frame = window.requestAnimationFrame(() => okButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [sent]);

  useEffect(() => {
    if (!open) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [open]);

  const send = async (message: string) => {
    setSending(true);
    setError('');
    try {
      await sendConnectionRequest(personId, message);
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send the connection request.');
    } finally {
      setSending(false);
    }
  };

  const close = () => {
    if (sent) {
      onSent();
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      label={`Add a note to your invitation to ${personName}`}
      dialogRef={dialogRef}
      width="max-w-xl"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-headline text-xl font-semibold text-primary">Add a note to your invitation</h2>
            {!sent && <p className="mt-1 text-sm text-on-surface-variant">A personal note can help {personName} recognize your request.</p>}
          </div>
          <button type="button" onClick={close} disabled={sending} className="btn-ghost h-10 w-10 shrink-0 p-0" aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        {sent ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Icon name="check_circle" className="!text-5xl text-secondary" fill />
            <p className="mt-3 text-lg font-semibold text-primary">Sent successfully</p>
            <button ref={okButtonRef} type="button" onClick={close} className="btn-primary mt-6">OK</button>
          </div>
        ) : (
          <>
            <label htmlFor="connection-note" className="mt-5 block text-sm font-semibold text-primary">Note (optional)</label>
            <textarea
              ref={textareaRef}
              id="connection-note"
              value={note}
              maxLength={NOTE_LIMIT}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note (optional)"
              rows={5}
              disabled={sending}
              className="mt-2 min-h-32 w-full resize-y rounded-xl border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant/70 focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:bg-surface-container-low"
              aria-describedby="connection-note-count"
            />
            <div id="connection-note-count" className="mt-1 text-right text-xs text-on-surface-variant">
              {note.length}/{NOTE_LIMIT}
            </div>
            {error && <p role="alert" className="mt-3 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">Something went wrong. Please try again.</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => void send('')} disabled={sending} className="btn-outline">
                {sending ? 'Sending...' : 'Send without a note'}
              </button>
              <button
                type="button"
                onClick={() => void send(note.trim())}
                disabled={sending || !note.trim()}
                className="btn-primary"
              >
                <Icon name="send" /> Send
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
