import { NavLink, Outlet } from 'react-router';

const settingsLinks = [
  { name: 'Branding', href: '/settings' },
  { name: 'Scheduling Policies', href: '/settings/scheduling-policies' },
];

export default function SettingsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-1 text-neutral-600">Manage application branding and scheduling defaults.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {settingsLinks.map((link) => (
          <NavLink
            key={link.href}
            to={link.href}
            end={link.href === '/settings'}
            className={({ isActive }) =>
              `rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:text-neutral-900'
              }`
            }
          >
            {link.name}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
