import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { RoleSwitcher } from './components/RoleSwitcher';
import { AppProvider } from './hooks/useAppContext';
import { useState } from 'react';

export default function App() {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(true);

  if (showRoleSwitcher) {
    return <RoleSwitcher onRoleChange={() => setShowRoleSwitcher(false)} />;
  }

  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AppProvider>
  );
}