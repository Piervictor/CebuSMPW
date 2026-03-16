import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { RoleSwitcher } from './components/RoleSwitcher';
import { AppProvider } from './hooks/useAppContext';
import { AuthProvider } from './hooks/useAuth';
import { useState } from 'react';

export default function App() {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(true);

  return (
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
  );
}
