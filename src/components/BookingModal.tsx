import { useState } from 'react';

import { BRAND } from '../data/mock';
import { useApp } from '../store';
import { Icon, Modal, Tag, cx } from './ui';

const dates = [
  ['Thu', '24'],
  ['Fri', '25'],
  ['Mon', '28'],
  ['Wed', '30'],
] as const;
const slots = ['3:00 PM - 3:30 PM', '4:30 PM - 5:00 PM', '6:00 PM - 6:30 PM', '7:30 PM - 8:00 PM'];
const topics = ['SCS supplemental essay', 'Course planning', 'Research & labs', 'Campus life'];

export function BookingPanel({ mentorName, onDone }: { mentorName: string; onDone?: () => void }) {
  const showToast = useApp((s) => s.showToast);
  const [video, setVideo] = useState(true);
  const [date, setDate] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  const [topic, setTopic] = useState(topics[0]);

  const confirm = () => {
    if (slot === null) return;
    const [day, num] = dates[date];
    showToast(`Session confirmed: ${day} ${num}, ${slots[slot].split(' - ')[0]} with ${mentorName}`);
    setSlot(null);
    onDone?.();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-headline text-lg font-semibold text-primary">Schedule Mentorship</h3>
        <Tag tone="green">Free Peer Session</Tag>
      </div>
      <p className="mt-0.5 text-sm text-on-surface-variant">with {mentorName}</p>

      <p className="eyebrow mt-5">Format</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[
          [true, '1:1 Video Call (30m)', 'videocam'],
          [false, 'Async Essay Review', 'description'],
        ].map(([value, label, icon]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setVideo(value as boolean)}
            className={cx(
              'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-semibold',
              video === value ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant',
            )}
          >
            <Icon name={icon as string} className="!text-[18px]" />
            {label as string}
          </button>
        ))}
      </div>

      <p className="eyebrow mt-5">Select Date</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {dates.map(([day, num], i) => (
          <button
            key={num}
            type="button"
            onClick={() => setDate(i)}
            className={cx('rounded-lg py-2 text-center', date === i ? 'bg-secondary text-white' : 'bg-surface-container-low text-primary hover:bg-surface-container')}
          >
            <div className={cx('text-xs font-semibold', date === i ? 'text-white/75' : 'text-on-surface-variant')}>{day}</div>
            <div className="text-lg font-bold">{num}</div>
          </button>
        ))}
      </div>

      <p className="eyebrow mt-5">Available Slots (EST)</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {slots.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlot(i)}
            className={cx('rounded-lg py-2.5 text-xs font-semibold', slot === i ? 'bg-secondary text-white' : 'bg-surface-container-low hover:bg-surface-container')}
          >
            {s}
          </button>
        ))}
      </div>

      <label className="eyebrow mt-5 block">
        Primary Discussion Topic
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="input mt-2 normal-case tracking-normal text-on-surface">
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>

      <button type="button" onClick={confirm} disabled={slot === null} className="btn-primary mt-5 w-full !h-11">
        <Icon name="verified" />
        {slot === null ? 'Pick a time slot' : 'Confirm Mentorship Session'}
      </button>
      <p className="mt-2 text-center text-xs text-on-surface-variant">Protected by {BRAND} Academic Honor Protocol</p>
    </div>
  );
}

export default function BookingModal({ mentorName, open, onClose }: { mentorName: string; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label={`Book a session with ${mentorName}`} width="max-w-md">
      <div className="relative p-6 pt-12">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-surface-container-low" aria-label="Close">
          <Icon name="close" />
        </button>
        <BookingPanel mentorName={mentorName} onDone={onClose} />
      </div>
    </Modal>
  );
}
