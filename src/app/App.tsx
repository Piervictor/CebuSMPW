import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { RoleSwitcher } from './components/RoleSwitcher';
import { AppProvider } from './hooks/useAppContext';
import { AuthProvider } from './hooks/useAuth';
import React, { useState } from 'react';

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
      <AuthProvider>
        <AppProvider>
          {showRoleSwitcher ? (
            <RoleSwitcher onRoleChange={() => setShowRoleSwitcher(false)} />
          ) : (
            <>
              <RouterProvider router={router} />
              <Toaster />
            </>
          )}
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
