import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { householdService } from '@/services/household-service';

interface JoinHouseholdDialogProps {
  trigger: React.ReactNode;
}

export function JoinHouseholdDialog({ trigger }: JoinHouseholdDialogProps) {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await householdService.joinHousehold(inviteCode);
      window.location.reload();
    } catch (error) {
      console.error('Error joining household:', error);
      toast({
        title: "Er ging iets mis",
        description: "Kon niet bij het huishouden. Controleer de code en probeer het opnieuw.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Join een huishouden
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-3">
            <Label htmlFor="inviteCode" className="text-sm font-medium text-gray-700">
              Uitnodigingscode
            </Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Voer de code in"
              className="w-full rounded-xl border-gray-200 bg-white/50 focus:border-blue-500 focus:ring-blue-500/20"
              required
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-xl h-12 shadow-md hover:shadow-lg transition-all duration-300"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Joinen...</span>
              </div>
            ) : (
              "Join huishouden"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 