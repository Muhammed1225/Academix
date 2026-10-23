import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Layout from './components/Layout';
import CollegeHubPage from './pages/CollegeHubPage';
import CollegesPage from './pages/CollegesPage';
import ComposePage from './pages/ComposePage';
import ConnectionsPage from './pages/ConnectionsPage';
import FeedPage from './pages/FeedPage';
import InboxPage from './pages/InboxPage';
import MajorsPage from './pages/MajorsPage';
import MentorProfilePage from './pages/MentorProfilePage';
import PersonProfilePage from './pages/PersonProfilePage';
import SearchPage from './pages/SearchPage';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import OwnProfilePage from './pages/OwnProfilePage';
import UniversityJoinedPage from './pages/UniversityJoinedPage';
import { loadAuthSession } from './authService';
import { useApp } from './store';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const setSignedIn = useApp((s) => s.setSignedIn);

  useEffect(() => {
    let active = true;
    loadAuthSession()
      .then((user) => {
        if (!active) return;
        if (user) useApp.getState().setAuthenticatedUser(user);
        else setSignedIn(false);
      })
      .catch(() => { if (active) setSignedIn(false); });
    return () => { active = false; };
  }, [setSignedIn]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="auth" element={<AuthPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route element={<Layout />}>
          <Route index element={<FeedPage />} />
          <Route path="colleges" element={<CollegesPage />} />
          <Route path="colleges/:collegeId" element={<CollegeHubPage />} />
          <Route path="colleges/:collegeId/majors" element={<MajorsPage />} />
          <Route path="colleges/:collegeId/majors/:majorId" element={<MajorsPage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="mentors/:mentorId" element={<MentorProfilePage />} />
          <Route path="people/:personId" element={<PersonProfilePage />} />
          <Route path="profile" element={<OwnProfilePage />} />
          <Route path="profile/university-joined" element={<UniversityJoinedPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="inbox/:ticketId" element={<InboxPage />} />
          <Route path="compose" element={<ComposePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
