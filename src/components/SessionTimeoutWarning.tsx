import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

/**
 * Component that shows a warning dialog when user session is about to expire.
 * Allows user to stay active or will auto-logout after countdown.
 */
export function SessionTimeoutWarning() {
  const { user } = useAuth();
  const { showWarning, secondsRemaining, stayActive } = useIdleTimeout({
    enabled: !!user,
  });

  // Format seconds as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if no user (not logged in)
  if (!user) return null;

  return (
    <Dialog open={showWarning} onOpenChange={(open) => !open && stayActive()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Sesja wygasa
          </DialogTitle>
          <DialogDescription className="pt-2">
            Twoja sesja wygaśnie za{' '}
            <span className="font-bold text-foreground">
              {formatTime(secondsRemaining)}
            </span>{' '}
            z powodu braku aktywności.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Kliknij poniżej, aby pozostać zalogowanym i kontynuować pracę.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            onClick={stayActive}
            className="w-full sm:w-auto"
          >
            Pozostań zalogowany
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
