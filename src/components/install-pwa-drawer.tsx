import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Apple, Chrome, Download, Smartphone } from 'lucide-react';

interface InstallPWADrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallPWADrawer({ isOpen, onOpenChange }: InstallPWADrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Download Lijssie
            </h2>
            
            <div className="space-y-6">
              {/* iOS Instructions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                  <Apple className="h-6 w-6" />
                  <h3>iOS Installatie</h3>
                </div>
                <ol className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Open Lijssie in Safari</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Tik op het 'Deel' icoon onderaan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Scroll naar beneden en tik op 'Zet op beginscherm'</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">4.</span>
                    <span>Tik op 'Voeg toe'</span>
                  </li>
                </ol>
              </div>

              {/* Android Instructions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                  <Chrome className="h-6 w-6" />
                  <h3>Android Installatie</h3>
                </div>
                <ol className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Open Lijssie in Chrome</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Tik op de drie puntjes (⋮) rechtsboven</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Tik op 'App installeren' of 'Toevoegen aan startscherm'</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">4.</span>
                    <span>Tik op 'Installeren'</span>
                  </li>
                </ol>
              </div>

              {/* Desktop Instructions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                  <Smartphone className="h-6 w-6" />
                  <h3>Desktop Installatie</h3>
                </div>
                <ol className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Open Lijssie in Chrome of Edge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Klik op het installatie icoon (⊕) in de adresbalk</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Klik op 'Installeren'</span>
                  </li>
                </ol>
              </div>

              <Button 
                onClick={() => onOpenChange(false)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-xl h-12 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Download nu
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 