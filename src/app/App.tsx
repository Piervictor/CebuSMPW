import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { RoleSwitcher } from './components/RoleSwitcher';
import { useState } from 'react';

export default function App() {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(true);

  if (showRoleSwitcher) {
    return <RoleSwitcher onRoleChange={() => setShowRoleSwitcher(false)} />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}