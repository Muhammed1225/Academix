import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Avatar, Icon, Modal, cx } from '../components/ui';
import { sanitizeRichText } from '../components/RichText';
import { colleges, composerForums, currentUser } from '../data/mock';
import { useApp } from '../store';

const MAX = 4000;
const MIN_BODY = 40;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const attachmentTypes = [
  { icon: 'picture_as_pdf', label: 'PDF Dossier' },
  { icon: 'poll', label: 'Student Poll' },
  { icon: 'link', label: 'Course Link' },
];

function hasTextInFormat(editor: HTMLElement, tags: string[]) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.textContent?.trim()) {
      let parent = node.parentElement;
      while (parent && parent !== editor) {
        if (tags.includes(parent.tagName)) return true;
        parent = parent.parentElement;
      }
    }
    node = walker.nextNode();
  }
  return false;
}

function wrapEditorText(editor: HTMLElement, tag: 'strong' | 'em', existingTags: string[]) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    if (node.textContent?.trim()) {
      let parent = node.parentElement;
      let alreadyFormatted = false;
      while (parent && parent !== editor) {
        if (existingTags.includes(parent.tagName)) {
          alreadyFormatted = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!alreadyFormatted) textNodes.push(node as Text);
    }
    node = walker.nextNode();
  }
  for (const textNode of textNodes) {
    const wrapper = document.createElement(tag);
    textNode.parentNode?.replaceChild(wrapper, textNode);
    wrapper.appendChild(textNode);
  }
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Unable to read the selected image.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

export default function ComposePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const publish = useApp((s) => s.publish);
  const showToast = useApp((s) => s.showToast);
  const bodyRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [forum, setForum] = useState(composerForums[0]);
  const [anonymous, setAnonymous] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [image, setImage] = useState<{ fileName: string; src: string } | null>(null);
  const [imageError, setImageError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, quote: false, code: false, heading: false });
  const [pendingInlineMarks, setPendingInlineMarks] = useState({ bold: false, italic: false });
  const universityId = searchParams.get('university');
  const university = colleges.find((college) => college.id === universityId);
  const askingAffiliatedStudents = searchParams.get('intent') === 'question' && Boolean(university);

  const dirty = Boolean(title || bodyText || attachments.length || image);
  const error =
    title.trim().length < 8 ? 'Add a descriptive title (8+ characters)' : bodyText.trim().length < MIN_BODY ? `Write at least ${MIN_BODY} characters` : null;

  // Sayfadan ayrılırken kaydedilmemiş taslak uyarısı.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const applyFormat = (command: string, value?: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const canPendInlineMark = !el.innerText.trim() && (command === 'bold' || command === 'italic');
    if (canPendInlineMark) {
      const mark = command as 'bold' | 'italic';
      const nextValue = !pendingInlineMarks[mark];
      setPendingInlineMarks((current) => ({ ...current, [mark]: !current[mark] }));
      setActiveFormats((current) => ({ ...current, [mark]: nextValue }));
    }
    el.focus();
    document.execCommand(command, false, value);
    setBodyHtml(el.innerHTML);
    setBodyText(el.innerText);
    if (!canPendInlineMark) updateActiveFormats();
  };

  const updateActiveFormats = useCallback(() => {
    const editor = bodyRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) {
      setActiveFormats({ bold: false, italic: false, quote: false, code: false, heading: false });
      return;
    }

    const hasAncestor = (tags: string[]) => {
      let node: Node | null = selection.anchorNode;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      while (node && node !== editor) {
        if (node instanceof HTMLElement && tags.includes(node.tagName)) return true;
        node = node.parentNode;
      }
      return false;
    };
    const blockFormat = document.queryCommandValue('formatBlock').toLowerCase().replace(/[<>]/g, '');
    const isEmpty = !editor.innerText.trim();

    setActiveFormats({
      bold: hasAncestor(['B', 'STRONG']) || document.queryCommandState('bold') || (isEmpty && pendingInlineMarks.bold),
      italic: hasAncestor(['I', 'EM']) || document.queryCommandState('italic') || (isEmpty && pendingInlineMarks.italic),
      quote: hasAncestor(['BLOCKQUOTE']) || blockFormat === 'blockquote',
      code: hasAncestor(['PRE']) || blockFormat === 'pre',
      heading: hasAncestor(['H2']) || blockFormat === 'h2',
    });
  }, [pendingInlineMarks]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, [updateActiveFormats]);

  const updateEditor = (el: HTMLDivElement) => {
    if (el.innerText.trim()) {
      if (pendingInlineMarks.bold && !hasTextInFormat(el, ['B', 'STRONG'])) wrapEditorText(el, 'strong', ['B', 'STRONG']);
      if (pendingInlineMarks.italic && !hasTextInFormat(el, ['I', 'EM'])) wrapEditorText(el, 'em', ['I', 'EM']);
      setPendingInlineMarks({ bold: false, italic: false });
    }
    let text = el.innerText;
    if (text.length > MAX) {
      text = text.slice(0, MAX);
      el.innerText = text;
    }
    setBodyText(text);
    setBodyHtml(el.innerHTML);
  };

  const leave = () => (dirty ? setConfirmDiscard(true) : navigate(-1));

  const submit = () => {
    if (error) return;
    publish({
      title: title.trim(),
      body: sanitizeRichText(bodyHtml).trim(),
      forum,
      anonymous,
      image: image ?? undefined,
      universityId: university?.id,
    });
    showToast(anonymous ? 'Dispatch published anonymously' : 'Dispatch published to the feed', 'send');
    navigate('/');
  };

  const selectImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!imageTypes.includes(file.type)) {
      setImage(null);
      setImageError('Choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImage(null);
      setImageError('Choose an image no larger than 5 MB.');
      return;
    }
    try {
      setImage({ fileName: file.name, src: await readImageAsDataUrl(file) });
      setImageError('');
    } catch {
      setImage(null);
      setImageError('Unable to read this image. Please try another file.');
    }
  };

  const authorName = anonymous ? 'Anonymous Scholar' : currentUser.name;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-semibold text-primary">
            {askingAffiliatedStudents ? `Ask the campus community at ${university?.name}` : 'Collegiate Post Composer'}
          </h1>
          <p className="mt-1 text-on-surface-variant">
            {askingAffiliatedStudents
              ? 'Ask a question for this university’s campus community.'
              : 'Draft verified dispatches, syllabus teardowns, or admissions advice for the network.'}
          </p>
        </div>
        <button type="button" onClick={leave} className="btn-ghost">
          <Icon name="close" /> Back to Feed
        </button>
      </div>

      <div className="grid gap-6">
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

          {university && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary-fixed px-3 py-2 text-sm text-on-secondary-fixed">
              <Icon name="account_balance" />
              <span>
                {askingAffiliatedStudents ? 'Question tagged to' : 'Experience tagged to'} <strong>{university.name}</strong>
              </span>
            </div>
          )}

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
            placeholder={askingAffiliatedStudents ? 'What would you like to ask?' : 'Title of Academic Dispatch'}
            className="input !py-3 font-headline !text-xl font-semibold"
          />

          <div className="overflow-hidden rounded-xl border border-outline-variant/60 focus-within:border-secondary/50 focus-within:ring-2 focus-within:ring-secondary/20">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-outline-variant/50 bg-surface-container-low px-2 py-1.5">
              {[
                ['format_bold', () => applyFormat('bold'), 'Bold', 'bold'],
                ['format_italic', () => applyFormat('italic'), 'Italic', 'italic'],
                ['format_quote', () => applyFormat('formatBlock', 'blockquote'), 'Quote', 'quote'],
                ['code', () => applyFormat('formatBlock', 'pre'), 'Code block', 'code'],
                ['title', () => applyFormat('formatBlock', 'h2'), 'Heading', 'heading'],
              ].map(([icon, fn, label, format]) => {
                const active = activeFormats[format as keyof typeof activeFormats];
                return (
                  <button
                    key={label as string}
                    type="button"
                    title={label as string}
                    aria-label={label as string}
                    aria-pressed={active}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={fn as () => void}
                    className={cx(
                      'rounded-md p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      active ? 'bg-secondary text-white shadow-sm ring-1 ring-secondary' : 'text-on-surface-variant hover:bg-white',
                    )}
                  >
                    <Icon name={icon as string} />
                  </button>
                );
              })}
              <div className="flex-1" />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={selectImage}
                className="sr-only"
                aria-label="Choose an image to attach"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-secondary hover:bg-white"
              >
                <Icon name="image" className="!text-[17px]" /> Add Picture
              </button>
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
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Write your academic dispatch"
              aria-multiline="true"
              data-placeholder={askingAffiliatedStudents ? 'Write your question for affiliated students...' : 'Share syllabus teardowns, admissions advice, or research openings...'}
              onInput={(event) => updateEditor(event.currentTarget)}
              className="editor-content min-h-72 max-h-[32rem] overflow-y-auto bg-white px-4 py-3 text-[15px] leading-relaxed outline-none"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Formatting is applied as you write</span>
            <span className={cx('font-semibold', bodyText.length > MAX * 0.9 && 'text-error')}>
              {bodyText.length.toLocaleString()} / {MAX.toLocaleString()} characters
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

          {image && (
            <div className="rounded-xl border border-outline-variant/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-semibold">{image.fileName}</span>
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="btn-ghost !h-8 !px-2 text-error"
                  aria-label={`Remove ${image.fileName}`}
                >
                  <Icon name="close" /> Remove
                </button>
              </div>
              <img src={image.src} alt={`Preview of ${image.fileName}`} className="max-h-64 max-w-full rounded-lg object-contain" />
            </div>
          )}
          {imageError && <p role="alert" className="text-sm font-medium text-error">{imageError}</p>}

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
