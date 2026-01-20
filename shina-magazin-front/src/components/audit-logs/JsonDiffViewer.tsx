import { useState, useEffect } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Copy, Download, Check, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface JsonDiffViewerProps {
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  action: string;
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
        <ReactDiffViewer
          oldValue={oldJson}
          newValue={newJson}
          splitView={!isMobile}
          compareMethod={DiffMethod.WORDS}
          leftTitle={action === 'CREATE' ? '' : '🔴 Eski qiymat'}
          rightTitle={action === 'DELETE' ? '' : '🟢 Yangi qiymat'}
          showDiffOnly={false}
          useDarkTheme={false}
          styles={{
            variables: {
              light: {
                // Background colors - professional palette
                diffViewerBackground: '#ffffff',
                diffViewerColor: '#1f2937',

                // Added lines - soft green
                addedBackground: '#d1fae5',
                addedColor: '#065f46',
                addedGutterBackground: '#a7f3d0',

                // Removed lines - soft red
                removedBackground: '#fee2e2',
                removedColor: '#991b1b',
                removedGutterBackground: '#fecaca',

                // Word-level changes - vibrant highlights
                wordAddedBackground: '#6ee7b7',
                wordRemovedBackground: '#fca5a5',

                // Gutter (line numbers) - elegant gray
                gutterBackground: '#f9fafb',
                gutterBackgroundDark: '#f3f4f6',
                gutterColor: '#6b7280',

                // Highlighted lines - soft yellow
                highlightBackground: '#fef3c7',
                highlightGutterBackground: '#fde68a',

                // Code syntax colors
                codeFoldGutterBackground: '#e5e7eb',
                codeFoldBackground: '#f3f4f6',

                // Empty lines
                emptyLineBackground: '#fafafa',
              },
            },
            diffContainer: {
              borderRadius: isExpanded ? '0' : '8px',
              overflow: 'hidden',
            },
            contentText: {
              fontFamily: 'ui-monospace, "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Droid Sans Mono", monospace',
              fontSize: isMobile ? '12px' : '14px',
              lineHeight: isMobile ? '1.5' : '1.6',
              letterSpacing: '0.01em',
            },
            line: {
              padding: isMobile ? '6px 8px' : '8px 12px',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
            },
            gutter: {
              padding: isMobile ? '6px 4px' : '8px 8px',
              minWidth: isMobile ? '36px' : '48px',
              fontFamily: 'ui-monospace, monospace',
              fontSize: isMobile ? '11px' : '13px',
              fontWeight: '500',
              userSelect: 'none',
            },
            marker: {
              padding: isMobile ? '6px 4px' : '8px 6px',
              fontSize: isMobile ? '12px' : '14px',
            },
            titleBlock: {
              padding: isMobile ? '8px 12px' : '10px 16px',
              background: 'linear-gradient(to right, #f9fafb, #f3f4f6)',
              borderBottom: '2px solid #e5e7eb',
              fontWeight: '600',
              fontSize: isMobile ? '13px' : '14px',
              color: '#374151',
              letterSpacing: '0.02em',
            },
          }}
        />
      </div>
    </div>
  );
}
