import { Link } from 'react-router-dom';

import { useApp } from '../store';
import { NotificationFeed } from '../components/NotificationsPanel';
import { Icon } from '../components/ui';

export default function NotificationsPage() {
  const signedIn = useApp((state) => state.signedIn);

  if (!signedIn) {
    return (
      <div className="card mx-auto max-w-2xl p-8 text-center">
        <Icon name="notifications" className="!text-4xl text-outline-variant" />
        <h1 className="mt-3 font-headline text-2xl font-semibold text-primary">Sign in to view notifications</h1>
        <Link to="/auth" className="btn-primary mt-5 inline-flex">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <Link to="/" aria-label="Back to feed" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low">
          <Icon name="arrow_back" />
        </Link>
        <div>
          <h1 className="font-headline text-3xl font-semibold text-primary">Notifications</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Messages and updates that need your attention.</p>
        </div>
      </div>
      <NotificationFeed fullPage />
    </div>
  );
}
