import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Layout from './components/Layout';
import CollegeHubPage from './pages/CollegeHubPage';
import CollegesPage from './pages/CollegesPage';
import ComposePage from './pages/ComposePage';
import FeedPage from './pages/FeedPage';
import InboxPage from './pages/InboxPage';
import MajorsPage from './pages/MajorsPage';
import MentorProfilePage from './pages/MentorProfilePage';
import SearchPage from './pages/SearchPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<FeedPage />} />
          <Route path="colleges" element={<CollegesPage />} />
          <Route path="colleges/:collegeId" element={<CollegeHubPage />} />
          <Route path="colleges/:collegeId/majors" element={<MajorsPage />} />
          <Route path="colleges/:collegeId/majors/:majorId" element={<MajorsPage />} />
          <Route path="mentors/:mentorId" element={<MentorProfilePage />} />
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
