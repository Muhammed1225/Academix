import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { displayName } from '../data/userIdentity';
import { mentorDirectory } from '../data/mentors';
import { people } from '../data/mock';
import { useApp } from '../store';
import { Avatar, Icon, Modal } from './ui';

type SettingsSection = 'account' | 'subscription' | 'privacy' | 'display' | 'languages';
type PrivacyTab = 'muted' | 'blocked';

const sections: { id: SettingsSection; label: string }[] = [
  { id: 'account', label: 'Your Account' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'privacy', label: 'Privacy and Safety' },
  { id: 'display', label: 'Display' },
  { id: 'languages', label: 'Languages' },
];

const mockMuted = [
  { id: 'sarah-lin', name: 'Sarah Lin', subtitle: 'Prospective Computer Science student' },
  { id: 'jordan-vance', name: 'Jordan Vance', subtitle: 'Incoming Computer Science student' },
];
const mockBlocked = [
  { id: 'kevlin', name: 'KevLin_Applicant', subtitle: 'Prospective Scholar' },
  { id: 'anon-ivy', name: 'Anonymous_IvyApplicant_24', subtitle: 'No institutional identity verified' },
];

type PrivacyAccount = {
  id: string;
  name: string;
  username: string;
  subtitle: string;
  avatar?: string;
};

const accountCandidates: PrivacyAccount[] = [
  ...Object.values(people).map((person) => ({
    id: person.id,
    name: person.name,
    username: `@${person.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    subtitle: person.subtitle,
    avatar: person.avatar,
  })),
  ...mentorDirectory.map((mentor) => ({
    id: mentor.id,
    name: mentor.name,
    username: `@${mentor.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    subtitle: mentor.field,
    avatar: mentor.avatar,
  })),
].filter((account, index, accounts) => accounts.findIndex((candidate) => candidate.id === account.id) === index);

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="relative mt-1.5 block">
        <input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="input pr-11" />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <Icon name={visible ? 'visibility_off' : 'visibility'} size={19} />
        </button>
      </span>
    </label>
  );
}

function AccountSection() {
  const user = useApp((state) => state.user);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user ? displayName(user.name, user.email) : '');
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const username = user?.email.split('@')[0] ?? 'academix-member';

  const savePassword = (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new password fields must match.');
      return;
    }
    setError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-5">
      <section>
        <h3 className="font-headline text-lg font-semibold text-primary">Account Information</h3>
        <div className="mt-3 space-y-3 rounded-xl border border-outline-variant/60 p-4">
          {[
            ['Name', name],
            ['Username', `@${username}`],
            ['Email', user?.email ?? 'Not available'],
            ['University', user?.university ?? 'Not specified'],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 border-b border-outline-variant/40 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center">
              <span className="w-28 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</span>
              {editing && label === 'Name' ? <input value={name} onChange={(event) => setName(event.target.value)} className="input !py-2" /> : <span className="text-sm font-medium text-primary">{value}</span>}
            </div>
          ))}
          <button type="button" onClick={() => setEditing((current) => !current)} className="btn-outline !h-9 !px-3 text-sm">
            <Icon name={editing ? 'check' : 'edit'} /> {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </section>

      <section className="border-t border-outline-variant/50 pt-5">
        <h3 className="font-headline text-lg font-semibold text-primary">Change your Password</h3>
        <form onSubmit={savePassword} className="mt-3 space-y-3">
          <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} />
          <PasswordField label="New password" value={newPassword} onChange={setNewPassword} />
          <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
          {error && <p role="alert" className="text-sm font-medium text-error">{error}</p>}
          <button type="submit" className="btn-primary">Save</button>
        </form>
      </section>
    </div>
  );
}

function ChooseAccountModal({
  open,
  onClose,
  accounts,
  mutedIds,
  blockedIds,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  accounts: PrivacyAccount[];
  mutedIds: Set<string>;
  blockedIds: Set<string>;
  onAction: (account: PrivacyAccount, action: PrivacyTab) => void;
}) {
  const currentUser = useApp((state) => state.user);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PrivacyAccount | null>(null);
  const visibleAccounts = accounts
    .filter((account) => account.id !== currentUser?.id)
    .filter((account) => `${account.name} ${account.username}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(null);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} label="Choose an account" width="max-w-lg">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-headline text-xl font-semibold text-primary">Choose an account</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Close account chooser">
            <Icon name="close" />
          </button>
        </div>
        <label className="relative mt-4 block">
          <span className="sr-only">Search accounts</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search accounts" className="input pl-10" autoFocus />
        </label>
        <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
          {visibleAccounts.length ? visibleAccounts.map((account) => {
            const status = mutedIds.has(account.id) ? 'Muted' : blockedIds.has(account.id) ? 'Blocked' : '';
            const isSelected = selected?.id === account.id;
            return (
              <button key={account.id} type="button" onClick={() => setSelected(account)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${isSelected ? 'bg-secondary-fixed' : 'hover:bg-surface-container-low'}`}>
                <Avatar src={account.avatar} name={account.name} size={40} rounded="rounded-full" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-primary">{account.name}</span>
                  <span className="block truncate text-xs text-on-surface-variant">{account.username}</span>
                </span>
                {status && <span className="rounded-full bg-surface-container px-2 py-1 text-[11px] font-semibold text-on-surface-variant">{status}</span>}
                {isSelected && <Icon name="check_circle" fill className="shrink-0 text-secondary" />}
              </button>
            );
          }) : <p className="rounded-xl bg-surface-container-low p-5 text-center text-sm text-on-surface-variant">No accounts found</p>}
        </div>
        {selected && (
          <div className="mt-4 flex flex-col gap-3 border-t border-outline-variant/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-primary">Selected: {selected.name}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => onAction(selected, 'muted')} className="btn-outline !h-9 !px-3 text-sm">Mute</button>
              <button type="button" onClick={() => onAction(selected, 'blocked')} className="btn-primary !h-9 !px-3 text-sm">Block</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PrivacySection() {
  const [tab, setTab] = useState<PrivacyTab>('muted');
  const [muted, setMuted] = useState<PrivacyAccount[]>(mockMuted.map((account) => ({ ...account, username: `@${account.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, subtitle: account.subtitle })));
  const [blocked, setBlocked] = useState<PrivacyAccount[]>(mockBlocked.map((account) => ({ ...account, username: `@${account.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, subtitle: account.subtitle })));
  const [chooserOpen, setChooserOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const accounts = tab === 'muted' ? muted : blocked;
  const mutedIds = new Set(muted.map((account) => account.id));
  const blockedIds = new Set(blocked.map((account) => account.id));
  const removeAccount = (id: string) => {
    if (tab === 'muted') setMuted((current) => current.filter((account) => account.id !== id));
    else setBlocked((current) => current.filter((account) => account.id !== id));
  };
  const addAccount = (account: PrivacyAccount, action: PrivacyTab) => {
    if (action === 'muted') {
      setBlocked((current) => current.filter((item) => item.id !== account.id));
      setMuted((current) => current.some((item) => item.id === account.id) ? current : [...current, account]);
    } else {
      setMuted((current) => current.filter((item) => item.id !== account.id));
      setBlocked((current) => current.some((item) => item.id === account.id) ? current : [...current, account]);
    }
    setChooserOpen(false);
    setConfirmation(action === 'muted' ? 'Account muted' : 'Account blocked');
    window.setTimeout(() => setConfirmation(''), 2500);
  };
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-headline text-lg font-semibold text-primary">Mute and Block</h3>
        <button type="button" onClick={() => setChooserOpen(true)} title="Choose an account" aria-label="Choose an account" className="rounded-full p-2 text-secondary hover:bg-secondary-fixed">
          <Icon name="add" />
        </button>
      </div>
      {confirmation && <p role="status" className="mt-3 rounded-lg bg-mint px-3 py-2 text-sm font-medium text-on-tertiary-fixed-variant">{confirmation}</p>}
      <div className="mt-4 flex border-b border-outline-variant/60">
        {(['muted', 'blocked'] as PrivacyTab[]).map((value) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === value ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant'}`}>
            {value === 'muted' ? 'Muted accounts' : 'Blocked accounts'}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {accounts.length ? accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-primary">{account.name}</p><p className="truncate text-xs text-on-surface-variant">{account.username}</p></div>
            <button type="button" onClick={() => removeAccount(account.id)} className="btn-outline !h-9 !px-3 text-sm">{tab === 'muted' ? 'Unmute' : 'Unblock'}</button>
          </div>
        )) : <p className="rounded-xl bg-surface-container-low p-5 text-center text-sm text-on-surface-variant">{tab === 'muted' ? 'No muted accounts' : 'No blocked accounts'}</p>}
      </div>
      <ChooseAccountModal open={chooserOpen} onClose={() => setChooserOpen(false)} accounts={accountCandidates} mutedIds={mutedIds} blockedIds={blockedIds} onAction={addAccount} />
    </div>
  );
}

function DisplaySection() {
  const [customMessage, setCustomMessage] = useState(false);
  return (
    <div>
      <h3 className="font-headline text-lg font-semibold text-primary">Display</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-2 border-secondary bg-white p-4"><div className="flex items-center justify-between"><span className="font-semibold">White</span><Icon name="check_circle" fill className="text-secondary" /></div><p className="mt-2 text-xs text-on-surface-variant">The default display tone.</p></div>
        <div className="cursor-not-allowed rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 text-outline"><div className="flex items-center justify-between"><span className="font-semibold">Dark</span><Icon name="block" /></div><p className="mt-2 text-xs">Available in a future update.</p></div>
        <button type="button" onClick={() => setCustomMessage(true)} className="rounded-xl border border-outline-variant/60 p-4 text-left hover:bg-surface-container-low"><div className="flex items-center justify-between"><span className="font-semibold text-primary">Custom display tone</span><Icon name="lock" className="text-on-surface-variant" /></div><p className="mt-2 text-xs text-on-surface-variant">{customMessage ? 'Available with Premium' : 'Choose your own tone.'}</p></button>
      </div>
    </div>
  );
}

function LanguagesSection() {
  return (
    <div>
      <h3 className="font-headline text-lg font-semibold text-primary">Languages</h3>
      <div className="mt-4 space-y-2">
        <div className="flex w-full items-center justify-between rounded-xl border border-secondary bg-secondary-fixed p-4 text-left text-sm font-semibold text-secondary">
          Azerbaijani
          <Icon name="check" />
        </div>
        {['English', 'Russian'].map((value) => (
          <div key={value} className="flex w-full cursor-not-allowed items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 text-left text-sm font-semibold text-outline" aria-disabled="true">
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const user = useApp((state) => state.user);
  const [section, setSection] = useState<SettingsSection>('account');
  useEffect(() => { if (open) setSection('account'); }, [open]);
  const content = section === 'account' ? <AccountSection /> : section === 'privacy' ? <PrivacySection /> : section === 'display' ? <DisplaySection /> : section === 'languages' ? <LanguagesSection /> : <section>
    <h3 className="font-headline text-xl font-semibold text-primary">Subscription</h3>
    <p className="mt-2 text-sm text-on-surface-variant">Current plan: <span className="font-semibold capitalize text-primary">{user?.plan ?? 'Free'}</span></p>
    <p className="mt-1 text-sm text-on-surface-variant">Manage your plan, payment method, and billing history securely.</p>
    <button type="button" onClick={() => { onClose(); navigate('/subscription'); }} className="btn-primary mt-4">Manage subscription <Icon name="arrow_forward" /></button>
  </section>;
  return (
    <Modal open={open} onClose={onClose} label="Settings" width="max-w-4xl">
      <div className="flex max-h-[92vh] flex-col sm:flex-row">
        <aside className="border-b border-outline-variant/60 p-4 sm:w-56 sm:shrink-0 sm:border-b-0 sm:border-r sm:p-5">
          <div className="flex items-center justify-between"><h2 className="font-headline text-xl font-semibold text-primary">Settings</h2><button type="button" onClick={onClose} aria-label="Close settings" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"><Icon name="close" /></button></div>
          <nav className="mt-4 flex gap-1 overflow-x-auto sm:block sm:space-y-1">{sections.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`inline-flex w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-semibold ${section === item.id ? 'bg-secondary-fixed text-secondary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>{item.label}</button>)}</nav>
        </aside>
        <main className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">{content}</main>
      </div>
    </Modal>
  );
}
