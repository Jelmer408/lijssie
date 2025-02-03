import { useEffect, useState } from 'react';
import { useHousehold } from '@/contexts/household-context';
import { useToast } from '@/components/ui/use-toast';
import { predictionService } from '@/services/prediction-service';
import { PredictionPreferences } from '@/services/prediction-service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreferencesModal({ open, onOpenChange }: PreferencesModalProps) {
  const { toast } = useToast();
  const { household } = useHousehold();
  const [preferences, setPreferences] = useState<PredictionPreferences>({
    maxSuggestions: 5,
    enableNotifications: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (household && open) {
      loadPreferences();
    }
  }, [household, open]);

  async function loadPreferences() {
    if (!household) return;

    try {
      const prefs = await predictionService.getPreferences(household.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: 'Fout bij laden voorkeuren',
        description: 'Er ging iets mis bij het laden van je voorkeuren.',
        variant: 'destructive',
      });
    }
  }

  async function handleSave() {
    if (!household) return;

    setIsSaving(true);
    try {
      await predictionService.updatePreferences(household.id, preferences);
      toast({
        title: 'Voorkeuren opgeslagen',
        description: 'Je voorkeuren zijn succesvol bijgewerkt.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Fout bij opslaan',
        description: 'Er ging iets mis bij het opslaan van je voorkeuren.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!household) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Voorspellingen Voorkeuren</DialogTitle>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Aantal suggesties</Label>
              <Select
                value={preferences.maxSuggestions.toString()}
                onValueChange={(value) =>
                  setPreferences({
                    ...preferences,
                    maxSuggestions: parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 15].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} suggesties
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaties</Label>
                <p className="text-sm text-muted-foreground">
                  Ontvang meldingen voor nieuwe suggesties
                </p>
              </div>
              <Switch
                checked={preferences.enableNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({
                    ...preferences,
                    enableNotifications: checked,
                  })
                }
              />
            </div>

            {preferences.enableNotifications && (
              <>
                <div className="space-y-2">
                  <Label>Notificatie dag</Label>
                  <Select
                    value={preferences.notificationDay || ''}
                    onValueChange={(value) =>
                      setPreferences({
                        ...preferences,
                        notificationDay: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kies een dag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Maandag</SelectItem>
                      <SelectItem value="tuesday">Dinsdag</SelectItem>
                      <SelectItem value="wednesday">Woensdag</SelectItem>
                      <SelectItem value="thursday">Donderdag</SelectItem>
                      <SelectItem value="friday">Vrijdag</SelectItem>
                      <SelectItem value="saturday">Zaterdag</SelectItem>
                      <SelectItem value="sunday">Zondag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notificatie tijd</Label>
                  <Input
                    type="time"
                    value={preferences.notificationTime || ''}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        notificationTime: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fixed footer with actions */}
        <div className="border-t border-gray-100 bg-gray-50/50 p-6 mt-auto">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 