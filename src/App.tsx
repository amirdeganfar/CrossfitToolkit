import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { ItemDetail } from './pages/ItemDetail';
import { Settings } from './pages/Settings';
import { Clock } from './pages/Clock';
import { Onboarding } from './pages/Onboarding';
import { useInitialize } from './hooks/useInitialize';
import { useCatalogStore } from './stores/catalogStore';
import { Loader2 } from 'lucide-react';

/**
 * Wrapper that redirects to onboarding if user hasn't seen it
 */
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { isInitialized, isLoading } = useInitialize();
  const hasSeenOnboarding = useCatalogStore((state) => state.settings.hasSeenOnboarding);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  if (!hasSeenOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding route - no guard */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Main app routes - with onboarding guard */}
        <Route
          path="/"
          element={
            <OnboardingGuard>
              <Layout />
            </OnboardingGuard>
          }
        >
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="clock" element={<Clock />} />
          <Route path="item/:id" element={<ItemDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
