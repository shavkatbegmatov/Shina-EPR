import { useState, useEffect } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface JsonDiffViewerProps {
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  action: string;
}

export function JsonDiffViewer({ oldValue, newValue, action }: JsonDiffViewerProps) {
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <div className="border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b flex-shrink-0">
        <h4 className="font-medium text-sm sm:text-base">JSON Taqqoslash</h4>
        {isMobile && (
          <p className="text-xs text-base-content/60 mt-1">
            Unified view - o'zgarishlar bir ro'yxatda
          </p>
        )}
      </div>
      <div className="overflow-auto flex-1">
        <ReactDiffViewer
          oldValue={oldJson}
          newValue={newJson}
          splitView={!isMobile}
          compareMethod={DiffMethod.WORDS}
          leftTitle={action === 'CREATE' ? '' : 'Eski qiymat (oldValue)'}
          rightTitle={action === 'DELETE' ? '' : 'Yangi qiymat (newValue)'}
          styles={{
            variables: {
              light: {
                diffViewerBackground: '#fff',
                addedBackground: '#e6ffed',
                addedColor: '#24292e',
                removedBackground: '#ffeef0',
                removedColor: '#24292e',
                wordAddedBackground: '#acf2bd',
                wordRemovedBackground: '#fdb8c0',
                addedGutterBackground: '#cdffd8',
                removedGutterBackground: '#ffdce0',
                gutterBackground: '#f6f8fa',
                gutterBackgroundDark: '#f3f4f6',
                highlightBackground: '#fffbdd',
                highlightGutterBackground: '#fff5b1',
              },
            },
            line: {
              padding: isMobile ? '8px 4px' : '10px 2px',
              fontSize: isMobile ? '11px' : '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              wordBreak: 'break-all',
            },
          }}
        />
      </div>
    </div>
  );
}
