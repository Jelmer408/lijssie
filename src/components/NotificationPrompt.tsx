

export function NotificationPrompt() {
  // Temporarily disabled
  return null;

  // Original code commented out for future reference
  /*
  const [showPrompt, setShowPrompt] = useState(false);
  const { hasPermission, requestPermission } = useNotifications();

  useEffect(() => {
    // Check if notifications are supported and not already granted/denied
    if (!('Notification' in window) || Notification.permission !== 'default') {
      return;
    }

    // Check if we're still within the delay period
    const delayUntil = localStorage.getItem(NOTIFICATION_DELAY_KEY);
    if (delayUntil) {
      const delayTimestamp = parseInt(delayUntil, 10);
      if (Date.now() < delayTimestamp) {
        return;
      }
      // Clear expired delay
      localStorage.removeItem(NOTIFICATION_DELAY_KEY);
    }

    setShowPrompt(true);
  }, []);

  const handleLater = () => {
    // Set delay timestamp to 24 hours from now
    const delayUntil = Date.now() + DELAY_DURATION;
    localStorage.setItem(NOTIFICATION_DELAY_KEY, delayUntil.toString());
    setShowPrompt(false);
  };

  if (!showPrompt || hasPermission) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 p-4 bg-white border-t border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out z-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 bg-blue-50 p-3 rounded-full">
            <Bell className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">
              Meldingen inschakelen
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Ontvang direct een melding wanneer iemand naar de winkel gaat of nieuwe items toevoegt aan de lijst.
            </p>
          </div>
          <div className="flex-shrink-0 flex gap-3">
            <Button
              variant="default"
              size="default"
              onClick={async () => {
                await requestPermission();
                setShowPrompt(false);
              }}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Inschakelen
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={handleLater}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  */
} 