import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface JsonDiffViewerProps {
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  action: string;
}

export function JsonDiffViewer({ oldValue, newValue, action }: JsonDiffViewerProps) {
  const oldJson = oldValue ? JSON.stringify(oldValue, null, 2) : '';
  const newJson = newValue ? JSON.stringify(newValue, null, 2) : '';

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b">
        <h4 className="font-medium">JSON Taqqoslash</h4>
      </div>
      <ReactDiffViewer
        oldValue={oldJson}
        newValue={newJson}
        splitView={true}
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
            padding: '10px 2px',
            fontSize: '13px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
        }}
      />
    </div>
  );
}
