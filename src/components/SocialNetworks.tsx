import { useState } from 'react';

import { Icon, Modal } from './ui';

export type SocialNetworkKey = 'instagram' | 'linkedin' | 'facebook';

export interface SocialNetwork {
  key: SocialNetworkKey;
  name: string;
  icon: string;
  placeholder: string;
}

export type SocialNetworks = Partial<Record<SocialNetworkKey, string>>;

export const socialNetworks: SocialNetwork[] = [
  { key: 'instagram', name: 'Instagram', icon: 'photo_camera', placeholder: 'Paste your Instagram link' },
  { key: 'linkedin', name: 'LinkedIn', icon: 'business_center', placeholder: 'Paste your LinkedIn link' },
  { key: 'facebook', name: 'Facebook', icon: 'public', placeholder: 'Paste your Facebook link' },
];

export function savedSocialNetworks(values?: SocialNetworks) {
  return socialNetworks.filter((network) => values?.[network.key]?.trim());
}

export function SocialNetworksEditor({
  values,
  onChange,
}: {
  values: SocialNetworks;
  onChange: (values: SocialNetworks) => void;
}) {
  const [selected, setSelected] = useState<SocialNetworkKey | null>(null);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        {socialNetworks.map((network) => {
          const active = Boolean(values[network.key]?.trim());
          return (
            <button
              key={network.key}
              type="button"
              aria-label={network.name}
              aria-pressed={selected === network.key}
              onClick={() => setSelected((current) => current === network.key ? null : network.key)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${active ? 'border-secondary bg-secondary text-white shadow-sm' : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-secondary hover:text-secondary'} ${selected === network.key ? 'ring-2 ring-secondary/25' : ''}`}
            >
              <Icon name={network.icon} size={21} />
            </button>
          );
        })}
      </div>
      {selected && (
        <label className="mt-4 block text-sm font-semibold">
          {socialNetworks.find((network) => network.key === selected)?.name} link
          <input
            type="url"
            value={values[selected] ?? ''}
            onChange={(event) => onChange({ ...values, [selected]: event.target.value })}
            className="input mt-1.5"
            placeholder={socialNetworks.find((network) => network.key === selected)?.placeholder}
          />
        </label>
      )}
    </div>
  );
}

export function SocialNetworksModal({
  values,
  open,
  onClose,
}: {
  values?: SocialNetworks;
  open: boolean;
  onClose: () => void;
}) {
  const saved = savedSocialNetworks(values);
  return (
    <Modal open={open} onClose={onClose} label="Other Networks" width="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-headline text-xl font-semibold text-primary">Other Networks</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Close other networks">
            <Icon name="close" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {saved.map((network) => (
            <div key={network.key} className="flex min-w-0 items-center gap-3 rounded-xl bg-surface-container-low p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
                <Icon name={network.icon} size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{network.name}</p>
                <a href={values?.[network.key]} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-secondary hover:underline">
                  {values?.[network.key]}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function SocialNetworksLink({ values, onOpen }: { values?: SocialNetworks; onOpen: () => void }) {
  if (!savedSocialNetworks(values).length) return null;
  return (
    <button type="button" onClick={onOpen} className="text-sm font-semibold text-secondary hover:underline">
      Show other networks
    </button>
  );
}

export function SocialNetworksProfileControl({ values }: { values?: SocialNetworks }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SocialNetworksLink values={values} onOpen={() => setOpen(true)} />
      <SocialNetworksModal values={values} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
