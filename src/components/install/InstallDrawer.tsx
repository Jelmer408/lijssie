import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { motion } from "framer-motion";
import { Share, Plus, AppWindow, MoreVertical, Download } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InstallStep {
  text: string;
  icon: JSX.Element;
}

interface BrowserInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isChrome: boolean;
  isSafari: boolean;
}

export function InstallDrawer({ isOpen, onOpenChange }: InstallDrawerProps) {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>({
    isIOS: false,
    isAndroid: false,
    isChrome: false,
    isSafari: false
  });

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    
    setBrowserInfo({
      isIOS: /iphone|ipad|ipod/.test(ua),
      isAndroid: /android/.test(ua),
      isChrome: /chrome/.test(ua) && !/edg|edge|opr|opera/.test(ua),
      isSafari: /safari/.test(ua) && !/chrome|chromium|edg|edge|opr|opera/.test(ua)
    });
  }, []);

  const getInstallInstructions = (): { title: string; steps: InstallStep[] } => {
    const { isIOS, isAndroid, isChrome, isSafari } = browserInfo;

    if (isIOS && isSafari) {
      return {
        title: "Installeer op iOS",
        steps: [
          {
            text: "Tik op het 'Deel' icoon onderaan je scherm",
            icon: <Share className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Scroll en tik op 'Zet op beginscherm'",
            icon: <Plus className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Tik op 'Voeg toe' rechtsboven",
            icon: <AppWindow className="w-5 h-5 text-blue-500" />
          }
        ]
      };
    } else if (isIOS && isChrome) {
      return {
        title: "Installeer op iOS (Chrome)",
        steps: [
          {
            text: "Tik op het 'deel' icoon bovenaan",
            icon: <Share className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Tik op 'Toevoegen aan startscherm'",
            icon: <Plus className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Tik op 'Toevoegen' om te bevestigen",
            icon: <AppWindow className="w-5 h-5 text-blue-500" />
          }
        ]
      };
    } else if (isAndroid) {
      return {
        title: "Installeer op Android",
        steps: [
          {
            text: "Tik op de drie puntjes rechtsboven",
            icon: <MoreVertical className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Tik op 'App installeren'",
            icon: <Download className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Tik op 'Installeren' om te bevestigen",
            icon: <AppWindow className="w-5 h-5 text-blue-500" />
          }
        ]
      };
    } else if (isChrome) {
      return {
        title: "Installeer op Chrome",
        steps: [
          {
            text: "Klik op het installatie icoon in de adresbalk",
            icon: <Download className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Klik op 'Installeren'",
            icon: <Plus className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Volg de instructies om de installatie te voltooien",
            icon: <AppWindow className="w-5 h-5 text-blue-500" />
          }
        ]
      };
    } else {
      return {
        title: "Installeer Lijssie",
        steps: [
          {
            text: "Open deze website in Chrome of Safari",
            icon: <AppWindow className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Volg de browser-specifieke instructies",
            icon: <Download className="w-5 h-5 text-blue-500" />
          },
          {
            text: "Geniet van de volledige app ervaring",
            icon: <AppWindow className="w-5 h-5 text-blue-500" />
          }
        ]
      };
    }
  };

  const instructions = getInstallInstructions();

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-6 py-8">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
              {instructions.title}
            </h2>
            <p className="text-gray-600">
              Installeer Lijssie op je apparaat voor de beste ervaring
            </p>
          </div>

          <div className="space-y-4">
            {instructions.steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  {step.icon}
                </div>
                <p className="text-gray-700">{step.text}</p>
              </motion.div>
            ))}
          </div>

          <div className="pt-4">
            <p className="text-sm text-center text-gray-500">
              Na installatie kun je Lijssie direct vanaf je startscherm openen
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 