import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAppContext } from '../../hooks/useAppContext';
import { APP_TAGLINE, DEFAULT_APP_NAME, normalizeAppName } from '../../../lib/branding';

export default function BrandingSettings() {
  const { appName, updateAppName } = useAppContext();
  const [draftName, setDraftName] = useState(appName);

  useEffect(() => {
    setDraftName(appName);
  }, [appName]);

  const handleSave = () => {
    updateAppName(draftName);
    setDraftName(normalizeAppName(draftName));
    toast.success('Application name updated');
  };

  const handleReset = () => {
    updateAppName(DEFAULT_APP_NAME);
    setDraftName(DEFAULT_APP_NAME);
    toast.success('Application name reset');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Name</CardTitle>
          <CardDescription>
            Choose the name shown in the header, browser tab, and sign-in role switcher.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="app-name">Display name</Label>
            <Input
              id="app-name"
              value={draftName}
              maxLength={80}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={DEFAULT_APP_NAME}
            />
            <p className="text-xs text-neutral-500">
              Leave it blank to fall back to {DEFAULT_APP_NAME}.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Preview</p>
            <p className="mt-3 text-xl font-semibold text-neutral-900">{normalizeAppName(draftName)}</p>
            <p className="mt-1 text-sm text-neutral-600">{APP_TAGLINE}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave}>Save Name</Button>
            <Button variant="outline" onClick={handleReset}>Reset Default</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}