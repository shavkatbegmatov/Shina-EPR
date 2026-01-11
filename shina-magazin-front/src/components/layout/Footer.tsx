import { useState, useEffect } from 'react';
import { Circle, Keyboard, ExternalLink } from 'lucide-react';

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
    <footer className="shrink-0 border-t border-base-200/60 bg-base-100/90 backdrop-blur-sm">
      {/* Mobile Footer - Compact */}
      <div className="flex items-center justify-between px-4 py-2 lg:hidden">
        <div className="flex items-center gap-2">
          <Circle className="h-1.5 w-1.5 fill-success text-success" />
          <span className="text-[10px] text-base-content/50">© {year} Shina Magazin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-base-content/40">{formatTime(currentTime)}</span>
          <span className="rounded bg-base-200/80 px-1.5 py-0.5 text-[10px] font-medium text-primary">v1.0</span>
        </div>
      </div>

      {/* Desktop Footer - Full */}
      <div className="hidden px-6 py-2.5 lg:block">
        <div className="flex items-center justify-between">
          {/* Left section - Brand & Copyright */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-primary to-primary/70">
                <span className="text-[8px] font-bold text-primary-content">SM</span>
              </div>
              <span className="text-xs font-medium text-base-content/70">Shina Magazin</span>
            </div>
            <div className="h-3 w-px bg-base-300" />
            <span className="text-[11px] text-base-content/50">© {year} Barcha huquqlar himoyalangan</span>
          </div>

          {/* Center section - Quick Links */}
          <div className="flex items-center gap-1">
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Keyboard className="h-3 w-3" />
              Klaviatura
              <kbd className="kbd kbd-xs scale-90 bg-base-200">?</kbd>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              Yordam
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <a
              href="#"
              className="rounded-md px-2 py-1 text-[11px] text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              Qo'llab-quvvatlash
            </a>
          </div>

          {/* Right section - Status & Version */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Circle className="h-1.5 w-1.5 fill-success text-success animate-pulse" />
              <span className="text-[11px] text-base-content/50">Tizim faol</span>
            </div>
            <div className="h-3 w-px bg-base-300" />
            <span className="text-[11px] tabular-nums text-base-content/40">{formatTime(currentTime)}</span>
            <div className="h-3 w-px bg-base-300" />
            <div className="flex items-center gap-1 rounded-full bg-base-200/50 px-2 py-0.5">
              <span className="text-[9px] font-medium uppercase tracking-wider text-base-content/40">v</span>
              <span className="text-[11px] font-semibold text-primary">1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
