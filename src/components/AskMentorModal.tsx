import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Avatar, Icon, Tag } from './ui';
import { mentorDirectory } from '../data/mentors';
import { useApp } from '../store';

export default function AskMentorModal({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const saveMentorQuestion = useApp((state) => state.saveMentorQuestion);
  const showToast = useApp((state) => state.showToast);
  const selectedMentor = mentorDirectory.find((mentor) => mentor.id === selectedMentorId);
  const mentors = useMemo(() => {
    const term = search.toLocaleLowerCase().trim();
    return mentorDirectory.filter((mentor) =>
      [mentor.name, mentor.university, mentor.field].some((value) => (value ?? '').toLocaleLowerCase().includes(term)),
    );
  }, [search]);
  const validQuestion = question.trim().length >= 10 && question.trim().length <= 500;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    if (!selectedMentor) return;
    if (!validQuestion) return;
    saveMentorQuestion({ question: question.trim(), mentorId: selectedMentor.id });
    onClose();
    showToast(`Your question was sent to ${selectedMentor.name}.`, 'send');
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-primary/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="ask-mentor-title" className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-float sm:rounded-2xl">
        <header className="flex items-start justify-between border-b border-outline-variant/50 px-5 py-4 sm:px-6">
          <div>
            <h2 id="ask-mentor-title" className="font-headline text-2xl font-semibold text-primary">Ask a mentor</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Send a question directly to a verified mentor.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
            <Icon name="close" />
          </button>
        </header>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
            <div>
              <label htmlFor="mentor-question" className="mb-1.5 block text-sm font-semibold text-primary">Your question</label>
              <textarea
                id="mentor-question"
                required
                minLength={10}
                maxLength={500}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Write your question here..."
                className="input min-h-28 resize-y"
              />
              <div className="mt-1 flex justify-between text-xs text-on-surface-variant">
                <span>{question.trim().length > 0 && question.trim().length < 10 ? 'Please write at least 10 characters.' : !question.trim() ? 'Please write your question.' : ''}</span>
                <span>{question.length}/500</span>
              </div>
            </div>

            <section aria-labelledby="address-mentor-title">
              <h3 id="address-mentor-title" className="text-sm font-semibold text-primary">Address your question to a mentor</h3>
              <label className="relative mt-2 block">
                <span className="sr-only">Search mentors</span>
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search mentors..." className="input pl-10" />
              </label>
              <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                {mentors.length ? mentors.map((mentor) => {
                  const checked = selectedMentorId === mentor.id;
                  return (
                    <label key={`${mentor.id}-${mentor.university}`} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition hover:border-secondary/50 hover:bg-surface-container-low focus-within:ring-2 focus-within:ring-secondary ${checked ? 'border-secondary bg-secondary-fixed/50' : 'border-outline-variant/50'}`}>
                      <input type="radio" name="question-mentor" value={mentor.id} checked={checked} onChange={() => setSelectedMentorId(mentor.id)} className="h-4 w-4 accent-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary" />
                      <Avatar src={mentor.avatar || undefined} name={mentor.name || 'Mentor'} size={42} rounded="rounded-full" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-semibold text-primary">{mentor.name || 'Verified mentor'} {mentor.verified && <Tag tone="green" icon="verified">Verified</Tag>}</span>
                        <span className="mt-0.5 block truncate text-xs text-on-surface-variant">{mentor.university || 'University not listed'} · {mentor.field || 'Academic mentor'}</span>
                      </span>
                    </label>
                  );
                }) : <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">No mentors found.</p>}
              </div>
              {!selectedMentor && <p className="mt-1.5 text-xs text-error">Please select a mentor.</p>}
            </section>
          </div>
          <footer className="flex justify-end gap-2 border-t border-outline-variant/50 px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={!validQuestion || !selectedMentor} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">Send question</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
