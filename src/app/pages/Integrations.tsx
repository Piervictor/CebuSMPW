import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { MessageSquare, Send, CheckCircle2, Settings, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../hooks/useAppContext';

export default function Integrations() {
  const { appName } = useAppContext();
  const [botToken, setBotToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [notificationRules, setNotificationRules] = useState({
    onAssign: true,
    onUpdate: true,
    onCancel: true,
    reminder24h: true,
    reminder2h: false,
  });

  const handleTestMessage = () => {
    toast.success('Test message sent!', {
      description: 'Check your Telegram for the test notification',
    });
  };

  const handleConnect = () => {
    if (botToken) {
      setIsConnected(true);
      toast.success('Telegram bot connected successfully!');
    } else {
      toast.error('Please enter a bot token');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Integrations</h1>
        <p className="text-neutral-600 mt-1">
          Connect external services to enhance scheduling and communication
        </p>
      </div>

      {/* Telegram Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Telegram Bot
              </CardTitle>
              <CardDescription className="mt-1">
                Send shift notifications and reminders via Telegram
              </CardDescription>
            </div>
            {isConnected && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Setup */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-900">Connection Setup</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="bot-token">Bot Token</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="bot-token"
                    type="password"
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    disabled={isConnected}
                  />
                  <Button onClick={handleConnect} disabled={isConnected}>
                    {isConnected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Create a bot using @BotFather on Telegram and paste the token here
                </p>
              </div>

              {isConnected && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleTestMessage}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Message
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsConnected(false);
                      setBotToken('');
                      toast.info('Telegram bot disconnected');
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Message Preview */}
          {isConnected && (
            <>
              <div className="border-t border-neutral-200 pt-6">
                <h3 className="text-sm font-medium text-neutral-900 mb-3">Message Preview</h3>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 text-sm">{appName} Bot</p>
                      <div className="mt-2 bg-white border border-neutral-200 rounded-lg p-3">
                        <p className="text-sm text-neutral-900 font-medium">
                          🗓️ You have been scheduled
                        </p>
                        <p className="text-sm text-neutral-700 mt-2">
                          <strong>Location:</strong> City General Hospital
                          <br />
                          <strong>Date:</strong> Monday, March 3, 2026
                          <br />
                          <strong>Time:</strong> 9:00 AM – 11:00 AM
                        </p>
                        <p className="text-xs text-neutral-500 mt-3">
                          Tap to view details or make changes
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Member Mapping */}
              <div className="border-t border-neutral-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-neutral-900">Member Mapping</h3>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                </div>
                <p className="text-sm text-neutral-600 mb-4">
                  Map member profiles to their Telegram handles or chat IDs to enable notifications
                </p>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-700">Members with Telegram:</span>
                      <span className="font-medium text-neutral-900">7 / 10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-700">Notification delivery rate:</span>
                      <span className="font-medium text-green-600">98%</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Rules */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Rules
            </CardTitle>
            <CardDescription>Configure when to send notifications to members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-neutral-200">
                <div>
                  <p className="font-medium text-neutral-900">Shift Assignment</p>
                  <p className="text-sm text-neutral-600">
                    Notify member when admin assigns them to a shift
                  </p>
                </div>
                <Switch
                  checked={notificationRules.onAssign}
                  onCheckedChange={(checked) =>
                    setNotificationRules({ ...notificationRules, onAssign: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-neutral-200">
                <div>
                  <p className="font-medium text-neutral-900">Shift Update</p>
                  <p className="text-sm text-neutral-600">
                    Notify member when shift details are changed
                  </p>
                </div>
                <Switch
                  checked={notificationRules.onUpdate}
                  onCheckedChange={(checked) =>
                    setNotificationRules({ ...notificationRules, onUpdate: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-neutral-200">
                <div>
                  <p className="font-medium text-neutral-900">Shift Cancellation</p>
                  <p className="text-sm text-neutral-600">
                    Notify member when a shift is canceled
                  </p>
                </div>
                <Switch
                  checked={notificationRules.onCancel}
                  onCheckedChange={(checked) =>
                    setNotificationRules({ ...notificationRules, onCancel: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-neutral-200">
                <div>
                  <p className="font-medium text-neutral-900">24-Hour Reminder</p>
                  <p className="text-sm text-neutral-600">
                    Send reminder 24 hours before shift starts
                  </p>
                </div>
                <Switch
                  checked={notificationRules.reminder24h}
                  onCheckedChange={(checked) =>
                    setNotificationRules({ ...notificationRules, reminder24h: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-neutral-900">2-Hour Reminder</p>
                  <p className="text-sm text-neutral-600">
                    Send reminder 2 hours before shift starts
                  </p>
                </div>
                <Switch
                  checked={notificationRules.reminder2h}
                  onCheckedChange={(checked) =>
                    setNotificationRules({ ...notificationRules, reminder2h: checked })
                  }
                />
              </div>
            </div>

            <div className="pt-4">
              <Button>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Notification Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Message Templates */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Message Templates</CardTitle>
            <CardDescription>
              Customize the text sent in automatic notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="assign-template">Assignment Message</Label>
              <Textarea
                id="assign-template"
                className="mt-2"
                rows={4}
                placeholder="You have been scheduled for {location} on {date} at {time}..."
                defaultValue="🗓️ You have been scheduled&#10;&#10;Location: {location}&#10;Date: {date}&#10;Time: {time}&#10;&#10;See you there!"
              />
              <p className="text-xs text-neutral-500 mt-2">
                Variables: {'{location}'}, {'{date}'}, {'{time}'}, {'{category}'}
              </p>
            </div>

            <div>
              <Label htmlFor="reminder-template">Reminder Message</Label>
              <Textarea
                id="reminder-template"
                className="mt-2"
                rows={4}
                placeholder="Reminder: Your shift at {location} starts in 24 hours..."
                defaultValue="⏰ Reminder: Your shift starts in 24 hours&#10;&#10;Location: {location}&#10;Date: {date}&#10;Time: {time}"
              />
            </div>

            <Button>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Templates
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Other Integration Placeholders */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Send shift confirmations and reminders via email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Coming Soon</Badge>
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Calendar Sync</CardTitle>
          <CardDescription>
            Sync shifts with Google Calendar or Outlook
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Coming Soon</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
