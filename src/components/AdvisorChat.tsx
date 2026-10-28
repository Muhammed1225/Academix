import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';

import { BRAND } from '../data/mock';
import { Icon, cx } from './ui';

export type AdvisorMode = 'collegeMatch' | 'majorAdvisor';

interface ChatMessage {
  text: string;
  fromUser: boolean;
  highlight?: { title: string; body: string };
}

const prompts: Record<AdvisorMode, string[]> = {
  collegeMatch: ['Reach vs target schools?', 'Is my SAT enough for CMU?', 'Best schools for AI research'],
  majorAdvisor: ['Compare CS vs ECE at CMU', 'Prereq for 15-122?', 'Can I double major in CS and Drama?', 'Job outcomes for international students?'],
};

/** Backend bağlanana kadar anahtar kelimeye göre hazır cevap. */
function answer(question: string, field: string) {
  const q = question.toLowerCase();
  if (q.includes('15-122') || q.includes('prereq'))
    return '15-122 requires 15-112 or a passing score on the SCS placement exam. If you place out, review C pointers and loop invariants over the summer — that is where most students feel the jump.';
  if (q.includes('ece'))
    return 'CS at CMU emphasizes algorithms, systems software, and theory; ECE goes deeper into circuits, signals, and hardware design. Both share 15-213, and many ECE students take a CS minor.';
  if (q.includes('drama') || q.includes('double'))
    return 'It is possible but rare: Drama is a conservatory program with heavy studio hours. A more common path is a CS major with a minor in Music Technology or a BXA intercollege degree.';
  if (q.includes('international') || q.includes('job'))
    return '98% of the Class of 2024 were employed or in graduate school within 6 months. International students typically work under OPT with the STEM extension (up to 3 years).';
  if (q.includes('15-213') || q.includes('systems'))
    return '15-213 (Intro to Computer Systems) is a rite of passage at CMU SCS. It covers machine representation, caches, and concurrency in C. AP CS A helps with logic, but practice C pointers and the Linux command line beforehand!';
  if (q.includes('sat') || q.includes('score'))
    return 'The middle 50% SAT range for SCS admits is 1550-1580. A 1540 is within reach if your essays and projects show deep technical curiosity — testing is one factor among many.';
  if (q.includes('reach') || q.includes('target'))
    return `For ${field}, I would frame CMU, MIT, and Stanford as reaches; Georgia Tech, UIUC, and Michigan as targets; and add two strong honors programs as likely admits.`;
  if (q.includes('ai') || q.includes('research'))
    return 'For undergraduate AI research access, CMU (LTI, Robotics Institute), MIT CSAIL, Stanford, and Berkeley stand out. CMU also offers the first dedicated B.S. in Artificial Intelligence.';
  return 'Great question. Based on verified CMU mentor answers, I recommend booking a 15-minute session with a current student in that program — they can share the exact course load and culture.';
}

const initialMessages: Record<AdvisorMode, ChatMessage[]> = {
  collegeMatch: [
    {
      fromUser: false,
      text: '👋 Hello! Based on your 3.92 unweighted GPA and 1540 SAT, you are well-positioned for top-tier CS programs. What tier of research lab access or campus size matters most to you?',
      highlight: {
        title: '1. Carnegie Mellon (Target / Reach)',
        body: 'Exceptional fit for your systems interest. Strong recommendation to highlight low-level architecture projects in supplemental essays.',
      },
    },
  ],
  majorAdvisor: [
    { fromUser: true, text: 'How difficult is 15-213 Computer Systems, and does taking AP CS A help?' },
    {
      fromUser: false,
      text: '15-213 (Intro to Computer Systems) is considered a rite of passage at CMU SCS! It teaches low-level machine representation, bitwise operations, cache memory, and concurrency in C. While AP CS A gives you solid object-oriented logic in Java, 15-213 focuses heavily on memory pointers and assembly. Students recommend mastering C pointers and the Linux command line beforehand!',
    },
  ],
};

export interface AdvisorHeaderDragHandlers {
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => void;
}

interface AdvisorChatProps {
  mode: AdvisorMode;
  onClose?: () => void;
  className?: string;
  headerDragHandlers?: AdvisorHeaderDragHandlers;
}

export default function AdvisorChat({ mode, onClose, className, headerDragHandlers }: AdvisorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages[mode]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [field, setField] = useState('CS & Systems');
  const listRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || typing) return;
    setInput('');
    setMessages((m) => [...m, { text, fromUser: true }]);
    setTyping(true);
    timer.current = window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { text: answer(text, field), fromUser: false }]);
    }, 900);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  const isMatch = mode === 'collegeMatch';

  return (
    <div className={cx('flex min-h-0 flex-col', className)}>
      <div
        {...headerDragHandlers}
        className={cx('flex items-center gap-3 border-b border-outline-variant/50 px-5 py-4', headerDragHandlers && 'cursor-grab touch-none active:cursor-grabbing')}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
          <Icon name={isMatch ? 'auto_awesome' : 'smart_toy'} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-primary">{isMatch ? `${BRAND} AI Advisor` : `${BRAND} AI Major Advisor`}</div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className="h-2 w-2 animate-pulse rounded-full bg-on-tertiary-container" />
            {isMatch ? "Targeting Fall '25 Admissions" : 'Verified CMU SCS knowledge base'}
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-container-low" aria-label="Close advisor">
            <Icon name="close" />
          </button>
        )}
      </div>

      {isMatch && (
        <div className="flex gap-2 overflow-x-auto border-b border-outline-variant/40 px-5 py-3">
          <span className="chip bg-primary-container text-white">GPA 3.92</span>
          <span className="chip bg-primary-container text-white">SAT 1540</span>
          {['CS & Systems', 'AI / Machine Learning', 'Electrical Eng', 'Bioengineering'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setField(f)}
              className={cx('chip whitespace-nowrap', field === f ? 'bg-secondary text-white' : 'bg-surface-container-low text-on-surface-variant')}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m, i) => (
          <div key={i} className={cx('flex', m.fromUser ? 'justify-end' : 'justify-start')}>
            <div
              className={cx(
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                m.fromUser ? 'rounded-br-md bg-secondary text-white' : 'rounded-bl-md bg-surface-container-low text-on-surface',
              )}
            >
              {m.text}
              {m.highlight && (
                <div className="mt-3 rounded-lg bg-white p-3">
                  <div className="text-xs font-semibold text-secondary">⚡ Recommended Strategy Match</div>
                  <div className="mt-1 font-semibold text-primary">{m.highlight.title}</div>
                  <div className="mt-0.5 text-xs text-on-surface-variant">{m.highlight.body}</div>
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-surface-container-low px-3.5 py-2.5 text-sm italic text-outline">Thinking…</div>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-2">
        {prompts[mode].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => send(p)}
            className="chip whitespace-nowrap border border-secondary-fixed bg-white text-secondary hover:bg-surface-container-low"
          >
            {p}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-outline-variant/50 px-5 py-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about admissions, majors, careers..." className="input" />
        <button type="submit" className="btn-primary !h-10 !w-10 shrink-0 !rounded-full !p-0" aria-label="Send">
          <Icon name="send" />
        </button>
      </form>
    </div>
  );
}
