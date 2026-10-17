import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Avatar, Icon, Modal, cx } from '../components/ui';
import { composerForums, currentUser } from '../data/mock';
import { useApp } from '../store';

const MAX = 4000;
const MIN_BODY = 40;

const attachmentTypes = [
  { icon: 'picture_as_pdf', label: 'PDF Dossier' },
  { icon: 'poll', label: 'Student Poll' },
  { icon: 'link', label: 'Course Link' },
];

/** Basit markdown → JSX: **kalın**, _italik_, `kod`, > alıntı, ## başlık. */
function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    const inline = line.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return <em key={j}>{part.slice(1, -1)}</em>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={j} className="rounded bg-surface-container px-1 text-[0.9em]">{part.slice(1, -1)}</code>;
      return part;
    });
    if (line.startsWith('## ')) return <h4 key={i} className="mt-3 font-headline text-lg font-semibold text-primary">{inline.map((p) => (typeof p === 'string' ? p.replace(/^## /, '') : p))}</h4>;
    if (line.startsWith('> ')) return <blockquote key={i} className="my-2 border-l-4 border-secondary-fixed-dim pl-3 italic">{inline.map((p) => (typeof p === 'string' ? p.replace(/^> /, '') : p))}</blockquote>;
    return line ? <p key={i} className="mb-2">{inline}</p> : <br key={i} />;
  });
}

export default function ComposePage() {
  const navigate = useNavigate();
  const publish = useApp((s) => s.publish);
  const showToast = useApp((s) => s.showToast);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [forum, setForum] = useState(composerForums[0]);
  const [anonymous, setAnonymous] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = Boolean(title || body || attachments.length);
  const error =
    title.trim().length < 8 ? 'Add a descriptive title (8+ characters)' : body.trim().length < MIN_BODY ? `Write at least ${MIN_BODY} characters` : null;

  // Sayfadan ayrılırken kaydedilmemiş taslak uyarısı.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const wrap = (left: string, right = '') => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const next = body.slice(0, s) + left + body.slice(s, e) + right + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + left.length, e + left.length);
    });
  };

  const leave = () => (dirty ? setConfirmDiscard(true) : navigate(-1));

  const submit = () => {
    if (error) return;
    publish({ title: title.trim(), body: body.trim(), forum, anonymous });
    showToast(anonymous ? 'Dispatch published anonymously' : 'Dispatch published to the feed', 'send');
    navigate('/');
  };

  const authorName = anonymous ? 'Anonymous Scholar' : currentUser.name;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-semibold text-primary">Collegiate Post Composer</h1>
          <p className="mt-1 text-on-surface-variant">Draft verified dispatches, syllabus teardowns, or admissions advice for the network.</p>
        </div>
        <button type="button" onClick={leave} className="btn-ghost">
          <Icon name="close" /> Back to Feed
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="card space-y-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar src={anonymous ? undefined : currentUser.avatar} name={anonymous ? '?' : currentUser.name} size={44} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{authorName}</div>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                <Icon name="school" className="!text-[14px]" />
                {anonymous ? 'Identity hidden • credential still verified' : "Carnegie Mellon '25 (SCS Verified)"}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <span>Post Anonymously</span>
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="peer sr-only" />
              <span className="relative h-6 w-11 rounded-full bg-outline-variant transition peer-checked:bg-secondary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
            </label>
          </div>

          <label className="block text-sm font-semibold">
            Target Forum
            <select value={forum} onChange={(e) => setForum(e.target.value)} className="input mt-1.5">
              {composerForums.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title of Academic Dispatch"
            className="input !py-3 font-headline !text-xl font-semibold"
          />

          <div className="overflow-hidden rounded-xl border border-outline-variant/60 focus-within:border-secondary/50 focus-within:ring-2 focus-within:ring-secondary/20">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-outline-variant/50 bg-surface-container-low px-2 py-1.5">
              {[
                ['format_bold', () => wrap('**', '**'), 'Bold'],
                ['format_italic', () => wrap('_', '_'), 'Italic'],
                ['format_quote', () => wrap('\n> '), 'Quote'],
                ['code', () => wrap('`', '`'), 'Code'],
                ['title', () => wrap('\n## '), 'Heading'],
              ].map(([icon, fn, label]) => (
                <button key={label as string} type="button" title={label as string} onClick={fn as () => void} className="rounded-md p-2 text-on-surface-variant hover:bg-white">
                  <Icon name={icon as string} />
                </button>
              ))}
              <div className="flex-1" />
              {attachmentTypes.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => setAttachments((list) => [...list, a.label])}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-secondary hover:bg-white"
                >
                  <Icon name={a.icon} className="!text-[17px]" /> {a.label}
                </button>
              ))}
            </div>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX))}
              rows={12}
              placeholder="Share syllabus teardowns, admissions advice, or research openings..."
              className="w-full resize-y bg-white px-4 py-3 text-[15px] leading-relaxed outline-none"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Markdown formatting supported</span>
            <span className={cx('font-semibold', body.length > MAX * 0.9 && 'text-error')}>
              {body.length.toLocaleString()} / {MAX.toLocaleString()} characters
            </span>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <span key={`${a}-${i}`} className="chip bg-secondary-fixed text-on-secondary-fixed">
                  {a}
                  <button type="button" onClick={() => setAttachments((list) => list.filter((_, j) => j !== i))} aria-label={`Remove ${a}`}>
                    <Icon name="close" className="!text-[15px]" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-outline-variant/50 pt-5">
            <span className={cx('mb-3 flex items-center gap-1 text-xs font-semibold', error ? 'text-on-surface-variant' : 'text-on-tertiary-container')}>
              <Icon name={error ? 'info' : 'check_circle'} className="!text-[16px]" />
              {error ?? 'Ready to publish'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => (dirty ? setConfirmDiscard(true) : null)} disabled={!dirty} className="btn-ghost !text-error">
              <Icon name="delete" /> Discard Draft
            </button>
            <div className="flex-1" />
            <button type="button" disabled={!dirty} onClick={() => showToast('Saved as private draft', 'save')} className="btn-outline">
              Save as Private Draft
            </button>
            <button type="button" disabled={Boolean(error)} onClick={submit} className="btn-primary">
              <Icon name="send" /> Publish Dispatch
            </button>
          </div>
        </section>

        <aside>
          <div className="card sticky top-24 p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Live Reader Preview</p>
              <span className="text-xs text-on-surface-variant">Formatted Output</span>
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <Avatar src={anonymous ? undefined : currentUser.avatar} name={anonymous ? '?' : 'Maya Patel'} size={36} />
              <div>
                <div className="text-sm font-semibold">{authorName}</div>
                <div className="text-xs text-on-surface-variant">CMU SCS Senior • .edu Verified</div>
              </div>
            </div>
            <h3 className="mt-4 font-headline text-xl font-semibold text-primary">{title || 'Your title appears here'}</h3>
            <div className="mt-2 text-[15px] leading-relaxed text-on-surface-variant">
              {body ? renderMarkdown(body) : <p className="italic">Start writing to see how scholars will read your dispatch.</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="chip bg-surface-container-low text-on-surface-variant">{forum}</span>
              {attachments.map((a, i) => (
                <span key={`${a}-p-${i}`} className="chip bg-surface-container-low text-on-surface-variant">
                  <Icon name="attach_file" className="!text-[14px]" /> {a}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <Modal open={confirmDiscard} onClose={() => setConfirmDiscard(false)} label="Discard draft" width="max-w-sm">
        <div className="p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-error">
            <Icon name="delete" />
          </span>
          <h2 className="mt-3 font-headline text-xl font-semibold text-primary">Discard Draft?</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Are you sure you want to discard your draft? All unsaved dispatch text will be cleared.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className="btn-outline" onClick={() => setConfirmDiscard(false)}>
              Continue Editing
            </button>
            <button type="button" className="btn bg-error text-white hover:bg-error/90" onClick={() => navigate('/')}>
              Discard
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
