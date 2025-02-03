import { useEffect, useState } from 'react';
import { useHousehold } from '@/contexts/household-context';
import { predictionService } from '@/services/prediction-service';
import { PredictedGroceryItem } from '@/types/grocery-item';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '../../components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PredictionsSectionProps {
  onAddItem: (item: PredictedGroceryItem) => void;
}

export function PredictionsSection({ onAddItem }: PredictionsSectionProps) {
  const { toast } = useToast();
  const { household } = useHousehold();
  const [predictions, setPredictions] = useState<PredictedGroceryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (household) {
      loadPredictions();
    }
  }, [household]);

  async function loadPredictions(forceRegenerate = false) {
    if (!household) return;

    try {
      setIsLoading(true);
      const items = await predictionService.predictItems(household.id, forceRegenerate);
      setPredictions(items);
      setAddedItems(new Set()); // Reset added items when loading new predictions
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast({
        title: 'Fout bij laden suggesties',
        description: 'Er ging iets mis bij het laden van de suggesties.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegenerate() {
    if (isRegenerating) return;

    try {
      setIsRegenerating(true);
      await loadPredictions(true);
      toast({
        title: 'Suggesties vernieuwd',
        description: 'De suggesties zijn opnieuw gegenereerd.',
      });
    } finally {
      setIsRegenerating(false);
    }
  }

  const handleAddItem = (item: PredictedGroceryItem) => {
    setAddedItems(prev => new Set([...prev, item.id]));
    onAddItem(item);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Suggesties</h2>
          <Button
            variant="ghost"
            size="icon"
            disabled
            className="h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Suggesties</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Card className="p-4 text-center text-muted-foreground">
          Geen suggesties beschikbaar op dit moment.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Suggesties</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-20rem)]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 pb-4">
          {predictions.map((item) => {
            const isAdded = addedItems.has(item.id);
            return (
              <Card
                key={item.id}
                className={cn(
                  "transition-colors duration-200",
                  "hover:bg-accent/50",
                  isAdded && "bg-accent"
                )}
              >
                <div 
                  className="p-3 cursor-pointer"
                  onClick={() => !isAdded && handleAddItem(item)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {item.name}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "shrink-0 h-7 w-7 transition-colors",
                                isAdded && "text-primary hover:text-primary hover:bg-accent"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isAdded) handleAddItem(item);
                              }}
                            >
                              {isAdded ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{item.category}</span>
                            {item.explanation && (
                              <>
                                <span>•</span>
                                <span className="truncate">{item.explanation}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
} 