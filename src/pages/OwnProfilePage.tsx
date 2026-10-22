import { Navigate } from 'react-router-dom';

import RichText from '../components/RichText';
import { Avatar, Icon, Tag } from '../components/ui';
import { useApp } from '../store';

export default function OwnProfilePage() {
  const profile = useApp((state) => state.onboardingProfile);

  if (!profile) return <Navigate to="/auth?mode=create" replace />;

  return <div className="mx-auto max-w-3xl space-y-5">
    <section className="card overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-primary-container via-secondary to-[#86c7ce] sm:h-44" />
      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-12 flex items-end gap-4 sm:-mt-14">
          <Avatar src={profile.photo || undefined} name={profile.name} size={112} rounded="rounded-full ring-4 ring-white shadow-float" />
          <div className="pb-2"><Tag tone="blue">Your profile</Tag></div>
        </div>
        <h1 className="mt-4 font-headline text-3xl font-semibold text-primary">{profile.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface-variant"><Icon name="school" className="text-secondary" /> Academix community member</p>
      </div>
    </section>
    {profile.biography && <section className="card p-5 sm:p-6">
      <h2 className="font-headline text-xl font-semibold text-primary">About</h2>
      <RichText text={profile.biography} className="mt-3 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant" />
    </section>}
    {profile.interests.length > 0 && <section className="card p-5 sm:p-6">
      <h2 className="font-headline text-xl font-semibold text-primary">Interests</h2>
      <div className="mt-3 flex flex-wrap gap-2">{profile.interests.map((interest) => <Tag key={interest} tone="blue">{interest}</Tag>)}</div>
    </section>}
    {profile.purpose && <section className="card p-5 sm:p-6">
      <h2 className="font-headline text-xl font-semibold text-primary">What brings me to Academix</h2>
      <p className="mt-3 text-sm text-on-surface-variant">{profile.purpose}</p>
    </section>}
  </div>;
}
