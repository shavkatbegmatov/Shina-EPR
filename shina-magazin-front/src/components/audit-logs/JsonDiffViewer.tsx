import { useState, useEffect, useMemo } from 'react';
import { Copy, Download, Check, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface JsonDiffViewerProps {
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  action: string;
}

// Find changed keys between two objects
function getChangedKeys(oldObj: Record<string, any> | null, newObj: Record<string, any> | null): Set<string> {
  const changed = new Set<string>();
  if (!oldObj || !newObj) return changed;

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const oldVal = JSON.stringify(oldObj[key]);
    const newVal = JSON.stringify(newObj[key]);
    if (oldVal !== newVal) {
      changed.add(key);
    }
  }

  return changed;
}

// Syntax highlight JSON with diff support
function highlightJson(
  obj: Record<string, any> | null,
  changedKeys: Set<string>,
  type: 'old' | 'new'
): JSX.Element[] {
  if (!obj) return [];

  const lines: JSX.Element[] = [];
  const entries = Object.entries(obj);

  lines.push(<span key="open" className="text-base-content">{'{'}</span>);

  entries.forEach(([key, value], index) => {
    const isChanged = changedKeys.has(key);
    const isLast = index === entries.length - 1;
    const comma = isLast ? '' : ',';

    // Highlight background for changed lines
    const bgClass = isChanged
      ? type === 'old'
        ? 'bg-error/20 -mx-3 px-3 block'
        : 'bg-success/20 -mx-3 px-3 block'
      : '';

    const formattedValue = formatValue(value, isChanged, type);

    lines.push(
      <span key={key} className={bgClass}>
        <span className="text-primary">{`  "${key}"`}</span>
        <span className="text-base-content">: </span>
        {formattedValue}
        <span className="text-base-content">{comma}</span>
      </span>
    );
  });

  lines.push(<span key="close" className="text-base-content">{'}'}</span>);

  return lines;
}

// Format a single value with syntax highlighting
function formatValue(value: any, isChanged: boolean, type: 'old' | 'new'): JSX.Element {
  if (value === null) {
    return <span className="text-warning">null</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="text-accent">{value.toString()}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-secondary">{value}</span>;
  }

  if (typeof value === 'string') {
    // Highlight changed string values
    const textClass = isChanged
      ? type === 'old'
        ? 'text-error font-medium'
        : 'text-success font-medium'
      : 'text-info';
    return <span className={textClass}>"{value}"</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-base-content">[]</span>;
    }
    return <span className="text-info">{JSON.stringify(value)}</span>;
  }

  if (typeof value === 'object') {
    return <span className="text-info">{JSON.stringify(value)}</span>;
  }

  return <span className="text-base-content">{String(value)}</span>;
}

export function JsonDiffViewer({ oldValue, newValue, action }: JsonDiffViewerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [copiedOld, setCopiedOld] = useState(false);
  const [copiedNew, setCopiedNew] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const oldJson = oldValue ? JSON.stringify(oldValue, null, 2) : '';
  const newJson = newValue ? JSON.stringify(newValue, null, 2) : '';

  // Calculate changed keys
  const changedKeys = useMemo(() => getChangedKeys(oldValue, newValue), [oldValue, newValue]);

  // Highlighted JSON elements
  const oldHighlighted = useMemo(() => highlightJson(oldValue, changedKeys, 'old'), [oldValue, changedKeys]);
  const newHighlighted = useMemo(() => highlightJson(newValue, changedKeys, 'new'), [newValue, changedKeys]);

  const copyToClipboard = async (text: string, type: 'old' | 'new') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'old') {
        setCopiedOld(true);
        setTimeout(() => setCopiedOld(false), 2000);
      } else {
        setCopiedNew(true);
        setTimeout(() => setCopiedNew(false), 2000);
      }
      toast.success('JSON nusxalandi');
    } catch (error) {
      toast.error('Nusxalashda xatolik');
    }
  };

  const downloadJson = (json: string, filename: string) => {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('JSON yuklab olindi');
    } catch (error) {
      toast.error('Yuklab olishda xatolik');
    }
  };

  const hasOldValue = oldValue !== null && action !== 'CREATE';
  const hasNewValue = newValue !== null && action !== 'DELETE';

  return (
    <div className="border-2 border-base-300 rounded-xl overflow-hidden h-full flex flex-col bg-gradient-to-br from-base-100 to-base-200/30">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent px-4 py-3 border-b-2 border-base-300 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Title and Info */}
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-primary rounded-full"></div>
            <div>
              <h4 className="font-bold text-base sm:text-lg flex items-center gap-2">
                JSON Taqqoslash
                {!isMobile && (
                  <span className="badge badge-sm badge-primary badge-outline">
                    Professional
                  </span>
                )}
              </h4>
              <p className="text-xs text-base-content/60 mt-0.5">
                {isMobile ? 'Unified view' : 'Side-by-side comparison'}
                {changedKeys.size > 0 && (
                  <span className="ml-2 text-warning">• {changedKeys.size} ta farq</span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Copy Buttons */}
            {hasOldValue && (
              <button
                onClick={() => copyToClipboard(oldJson, 'old')}
                className="btn btn-sm gap-2 min-h-[36px]"
                title="Eski qiymatni nusxalash"
              >
                {copiedOld ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Eski</span>
              </button>
            )}

            {hasNewValue && (
              <button
                onClick={() => copyToClipboard(newJson, 'new')}
                className="btn btn-sm btn-primary gap-2 min-h-[36px]"
                title="Yangi qiymatni nusxalash"
              >
                {copiedNew ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Yangi</span>
              </button>
            )}

            {/* Download Buttons */}
            {hasNewValue && (
              <button
                onClick={() => downloadJson(newJson, 'audit-log-new.json')}
                className="btn btn-sm btn-ghost gap-2 min-h-[36px]"
                title="JSON faylni yuklab olish"
              >
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">Yuklab olish</span>
              </button>
            )}

            {/* Expand/Collapse Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn btn-sm btn-ghost btn-circle min-h-[36px] min-w-[36px]"
              title={isExpanded ? "Kichraytirish" : "Kengaytirish"}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {!isMobile && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-base-300/50">
            {hasOldValue && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-error/20 border-2 border-error"></div>
                <span className="text-base-content/70">
                  Eski: {oldJson.split('\n').length} qator
                </span>
              </div>
            )}
            {hasNewValue && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-success/20 border-2 border-success"></div>
                <span className="text-base-content/70">
                  Yangi: {newJson.split('\n').length} qator
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diff Viewer Content */}
      <div className={`overflow-auto flex-1 ${isExpanded ? 'p-0' : 'p-2'}`}>
        {isMobile ? (
          /* Mobile: Separate JSON blocks */
          <div className="space-y-3">
            {/* Old Value */}
            {hasOldValue && (
              <div className="border border-error/30 rounded-lg overflow-hidden">
                <div className="bg-error/10 px-3 py-2 border-b border-error/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-error">Eski qiymat</span>
                  <button
                    onClick={() => copyToClipboard(oldJson, 'old')}
                    className="btn btn-xs btn-ghost"
                  >
                    {copiedOld ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="p-3 text-[11px] leading-[1.3] overflow-auto bg-base-200/50 font-mono whitespace-pre">
                  {oldHighlighted.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {/* New Value */}
            {hasNewValue && (
              <div className="border border-success/30 rounded-lg overflow-hidden">
                <div className="bg-success/10 px-3 py-2 border-b border-success/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-success">Yangi qiymat</span>
                  <button
                    onClick={() => copyToClipboard(newJson, 'new')}
                    className="btn btn-xs btn-ghost"
                  >
                    {copiedNew ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="p-3 text-[11px] leading-[1.3] overflow-auto bg-base-200/50 font-mono whitespace-pre">
                  {newHighlighted.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Desktop: Side-by-side JSON blocks */
          <div className="grid grid-cols-2 gap-3 h-full">
            {/* Old Value */}
            <div className={`border border-error/30 rounded-lg overflow-hidden flex flex-col ${!hasOldValue ? 'opacity-50' : ''}`}>
              <div className="bg-error/10 px-3 py-2 border-b border-error/30 flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-semibold text-error">Eski qiymat</span>
                {hasOldValue && (
                  <button
                    onClick={() => copyToClipboard(oldJson, 'old')}
                    className="btn btn-xs btn-ghost gap-1"
                  >
                    {copiedOld ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    <span>Nusxalash</span>
                  </button>
                )}
              </div>
              <div className="p-3 text-[12px] leading-[1.3] overflow-auto flex-1 bg-base-200/50 font-mono whitespace-pre m-0">
                {hasOldValue ? (
                  oldHighlighted.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))
                ) : (
                  <span className="text-base-content/50">Ma'lumot yo'q</span>
                )}
              </div>
            </div>

            {/* New Value */}
            <div className={`border border-success/30 rounded-lg overflow-hidden flex flex-col ${!hasNewValue ? 'opacity-50' : ''}`}>
              <div className="bg-success/10 px-3 py-2 border-b border-success/30 flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-semibold text-success">Yangi qiymat</span>
                {hasNewValue && (
                  <button
                    onClick={() => copyToClipboard(newJson, 'new')}
                    className="btn btn-xs btn-ghost gap-1"
                  >
                    {copiedNew ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    <span>Nusxalash</span>
                  </button>
                )}
              </div>
              <div className="p-3 text-[12px] leading-[1.3] overflow-auto flex-1 bg-base-200/50 font-mono whitespace-pre m-0">
                {hasNewValue ? (
                  newHighlighted.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))
                ) : (
                  <span className="text-base-content/50">Ma'lumot yo'q</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
