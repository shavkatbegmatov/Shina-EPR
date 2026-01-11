import { useState, useEffect } from 'react';
import { Circle, Keyboard, Heart, ExternalLink } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <footer className="border-t border-base-200/60 bg-base-100/80 backdrop-blur-sm">
      <div className="px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left section - Brand & Copyright */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70">
                <span className="text-[10px] font-bold text-primary-content">SM</span>
              </div>
              <span className="text-sm font-medium text-base-content/80">Shina Magazin</span>
            </div>
            <div className="hidden h-4 w-px bg-base-300 sm:block" />
            <span className="text-xs text-base-content/50">
              © {year} Barcha huquqlar himoyalangan
            </span>
          </div>

          {/* Center section - Quick Links */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Klaviatura</span>
              <kbd className="kbd kbd-xs bg-base-200">?</kbd>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              Yordam
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              Qo'llab-quvvatlash
            </a>
          </div>

          {/* Right section - Status & Version */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* System Status */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Circle className="h-2 w-2 fill-success text-success animate-pulse" />
                <span className="text-xs text-base-content/60">Tizim faol</span>
              </div>
              <div className="hidden h-4 w-px bg-base-300 sm:block" />
              <span className="text-xs tabular-nums text-base-content/50">
                {formatTime(currentTime)}
              </span>
            </div>

            {/* Version */}
            <div className="flex items-center gap-2">
              <div className="hidden h-4 w-px bg-base-300 sm:block" />
              <div className="flex items-center gap-1.5 rounded-full bg-base-200/60 px-2.5 py-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-base-content/50">
                  Versiya
                </span>
                <span className="text-xs font-semibold text-primary">1.0.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar - Made with love */}
        <div className="mt-3 flex items-center justify-center border-t border-base-200/50 pt-3 lg:hidden">
          <span className="flex items-center gap-1 text-[10px] text-base-content/40">
            Made with <Heart className="h-3 w-3 fill-error/50 text-error/50" /> in Uzbekistan
          </span>
        </div>
      </div>
    </footer>
  );
}
