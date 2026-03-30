import { Toaster } from './components/ui/sonner';
import { RoleSwitcher } from './components/RoleSwitcher';
import { AppProvider } from './hooks/useAppContext';
import React, { useState, Suspense } from 'react';

// Lazy-load the heavy router + auth tree — only needed after role selection
const AuthenticatedApp = React.lazy(() =>
  import('./AuthenticatedApp').then((mod) => ({ default: mod.default }))
);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace' }}>
          <h1 style={{ color: 'red' }}>App crashed</h1>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            {this.state.error.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 12, color: '#666' }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(true);

  return (
    <ErrorBoundary>
      <AppProvider>
        {showRoleSwitcher ? (
          <RoleSwitcher onRoleChange={() => setShowRoleSwitcher(false)} />
        ) : (
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-neutral-400">Loading…</div>}>
            <AuthenticatedApp />
          </Suspense>
        )}
      </AppProvider>
    </ErrorBoundary>
  );
}
