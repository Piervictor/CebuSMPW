import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { setCurrentUser, type UserRole } from '../data/mockData';
import { Shield, Users, User } from 'lucide-react';

interface RoleSwitcherProps {
  onRoleChange: () => void;
}

export function RoleSwitcher({ onRoleChange }: RoleSwitcherProps) {
  const roles: Array<{ role: UserRole; label: string; description: string; icon: typeof Shield }> = [
    {
      role: 'circuit-admin',
      label: 'Circuit Admin',
      description: 'Full access to all circuit locations, congregations, and members',
      icon: Shield,
    },
    {
      role: 'congregation-admin',
      label: 'Congregation Admin',
      description: 'Access to their congregation\'s locations and members only',
      icon: Users,
    },
    {
      role: 'member',
      label: 'Member (Publisher)',
      description: 'Personal dashboard with their own shifts and availability',
      icon: User,
    },
  ];

  const handleRoleSwitch = (role: UserRole) => {
    const names = {
      'circuit-admin': 'Admin User',
      'congregation-admin': 'Congregation Overseer',
      'member': 'Sarah Thompson',
    };

    setCurrentUser({
      id: `user-${role}`,
      name: names[role],
      role,
      congregationId: role !== 'circuit-admin' ? 'cong-1' : undefined,
      telegramHandle: role === 'member' ? '@sthompson' : '@admin',
    });

    onRoleChange();
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">CartSmart Circuit</CardTitle>
          <CardDescription className="text-base mt-2">
            Select a role to view the application from different perspectives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((roleInfo) => {
              const Icon = roleInfo.icon;
              return (
                <button
                  key={roleInfo.role}
                  onClick={() => handleRoleSwitch(roleInfo.role)}
                  className="text-left p-6 border-2 border-neutral-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-2">{roleInfo.label}</h3>
                    <p className="text-sm text-neutral-600 mb-4">{roleInfo.description}</p>
                    <Badge variant="outline" className="group-hover:border-blue-500">
                      View as {roleInfo.label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-8 pt-6 border-t border-neutral-200">
            <p className="text-xs text-neutral-500 text-center">
              This is a demo. In production, role-based access would be determined by authentication.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
