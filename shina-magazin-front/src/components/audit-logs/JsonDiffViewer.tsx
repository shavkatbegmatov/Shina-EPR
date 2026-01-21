import { useState, useEffect, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface JsonDiffViewerProps {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  action: string;
}

// Find changed keys between two objects
function getChangedKeys(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null
): Set<string> {
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
  obj: Record<string, unknown> | null,
  changedKeys: Set<string>,
  type: 'old' | 'new'
): JSX.Element[] {
  if (!obj) return [];

  const lines: JSX.Element[] = [];
  const entries = Object.entries(obj);

  lines.push(
    <span key="open" className="text-base-content/70">
      {'{'}
    </span>
  );

  entries.forEach(([key, value], index) => {
    const isChanged = changedKeys.has(key);
    const isLast = index === entries.length - 1;
    const comma = isLast ? '' : ',';

    // Highlight background for changed lines
    const bgClass = isChanged
      ? type === 'old'
        ? 'bg-error/15 -mx-3 px-3 border-l-2 border-error'
        : 'bg-success/15 -mx-3 px-3 border-l-2 border-success'
      : '';

    const formattedValue = formatValue(value, isChanged, type);

    lines.push(
      <div key={key} className={bgClass}>
        <span className="text-primary">{`  "${key}"`}</span>
        <span className="text-base-content/50">: </span>
        {formattedValue}
        <span className="text-base-content/50">{comma}</span>
      </div>
    );
  });

  lines.push(
    <span key="close" className="text-base-content/70">
      {'}'}
    </span>
  );

  return lines;
}

// Format a single value with syntax highlighting
function formatValue(
  value: unknown,
  isChanged: boolean,
  type: 'old' | 'new'
): JSX.Element {
  if (value === null) {
    return <span className="text-warning italic">null</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="text-accent">{value.toString()}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-secondary">{value}</span>;
  }

  if (typeof value === 'string') {
    const textClass = isChanged
      ? type === 'old'
        ? 'text-error'
        : 'text-success'
      : 'text-info';
    return <span className={textClass}>"{value}"</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-base-content/50">[]</span>;
    }
    return <span className="text-info">{JSON.stringify(value)}</span>;
  }

  if (typeof value === 'object') {
    return <span className="text-info">{JSON.stringify(value)}</span>;
  }

  return <span className="text-base-content">{String(value)}</span>;
}

// Copy button component
function CopyButton({
  text,
  size = 'sm',
}: {
  text: string;
  size?: 'sm' | 'xs';
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Nusxalandi');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nusxalashda xatolik');
    }
  };

  const iconSize = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <button
      onClick={handleCopy}
      className={`btn btn-ghost btn-${size} gap-1.5 opacity-70 hover:opacity-100`}
      title="Nusxalash"
    >
      {copied ? (
        <Check className={`${iconSize} text-success`} />
      ) : (
        <Copy className={iconSize} />
      )}
    </button>
  );
}

// Single JSON panel component
function JsonPanel({
  title,
  json,
  highlighted,
  variant,
  isEmpty,
}: {
  title: string;
  json: string;
  highlighted: JSX.Element[];
  variant: 'old' | 'new';
  isEmpty: boolean;
}) {
  const colors = {
    old: {
      border: 'border-error/30',
      headerBg: 'bg-error/10',
      headerText: 'text-error',
      emptyText: "O'chirilgan",
    },
    new: {
      border: 'border-success/30',
      headerBg: 'bg-success/10',
      headerText: 'text-success',
      emptyText: 'Yaratilgan',
    },
  };

  const color = colors[variant];

  return (
    <div
      className={`border ${color.border} rounded-lg overflow-hidden flex flex-col ${isEmpty ? 'opacity-50' : ''}`}
    >
      {/* Panel Header */}
      <div
        className={`${color.headerBg} px-3 py-2 border-b ${color.border} flex items-center justify-between flex-shrink-0`}
      >
        <span className={`text-xs font-semibold uppercase tracking-wider ${color.headerText}`}>
          {title}
        </span>
        {!isEmpty && <CopyButton text={json} size="xs" />}
      </div>

      {/* Panel Content */}
      <div className="p-3 text-xs leading-relaxed overflow-auto flex-1 bg-base-200/30 font-mono">
        {isEmpty ? (
          <span className="text-base-content/40 italic">{color.emptyText}</span>
        ) : (
          highlighted
        )}
      </div>
    </div>
  );
}

export function JsonDiffViewer({ oldValue, newValue, action }: JsonDiffViewerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const oldJson = oldValue ? JSON.stringify(oldValue, null, 2) : '';
  const newJson = newValue ? JSON.stringify(newValue, null, 2) : '';

  const changedKeys = useMemo(
    () => getChangedKeys(oldValue, newValue),
    [oldValue, newValue]
  );

  const oldHighlighted = useMemo(
    () => highlightJson(oldValue, changedKeys, 'old'),
    [oldValue, changedKeys]
  );

  const newHighlighted = useMemo(
    () => highlightJson(newValue, changedKeys, 'new'),
    [newValue, changedKeys]
  );

  const hasOldValue = oldValue !== null && action !== 'CREATE';
  const hasNewValue = newValue !== null && action !== 'DELETE';

  // Only old value (DELETE)
  if (!hasNewValue && hasOldValue) {
    return (
      <div className="h-full">
        <JsonPanel
          title="O'chirilgan qiymat"
          json={oldJson}
          highlighted={oldHighlighted}
          variant="old"
          isEmpty={false}
        />
      </div>
    );
  }

  // Only new value (CREATE)
  if (!hasOldValue && hasNewValue) {
    return (
      <div className="h-full">
        <JsonPanel
          title="Yaratilgan qiymat"
          json={newJson}
          highlighted={newHighlighted}
          variant="new"
          isEmpty={false}
        />
      </div>
    );
  }

  // Both values (UPDATE) - side by side or stacked
  return (
    <div className={`h-full ${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-3'}`}>
      <JsonPanel
        title="Eski qiymat"
        json={oldJson}
        highlighted={oldHighlighted}
        variant="old"
        isEmpty={!hasOldValue}
      />
      <JsonPanel
        title="Yangi qiymat"
        json={newJson}
        highlighted={newHighlighted}
        variant="new"
        isEmpty={!hasNewValue}
      />
    </div>
  );
}
