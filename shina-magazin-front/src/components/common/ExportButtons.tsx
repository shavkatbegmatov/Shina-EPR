import { FileSpreadsheet, FileDown } from 'lucide-react';

interface ExportButtonsProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Standardized export buttons for Excel and PDF
 *
 * Features:
 * - Consistent styling across all pages
 * - Green button for Excel, red button for PDF
 * - Disabled when no data or during loading
 * - Responsive (full width on mobile, auto on desktop)
 *
 * @example
 * <ExportButtons
 *   onExportExcel={() => handleExport('excel')}
 *   onExportPdf={() => handleExport('pdf')}
 *   disabled={!hasData}
 *   loading={refreshing}
 * />
 */
export function ExportButtons({
  onExportExcel,
  onExportPdf,
  disabled = false,
  loading = false,
}: ExportButtonsProps) {
  const isDisabled = disabled || loading;

  return (
    <>
      <button
        className="btn btn-success btn-sm flex-1 sm:flex-none"
        onClick={onExportExcel}
        disabled={isDisabled}
        title="Excel formatida eksport"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </button>
      <button
        className="btn btn-error btn-sm flex-1 sm:flex-none"
        onClick={onExportPdf}
        disabled={isDisabled}
        title="PDF formatida eksport"
      >
        <FileDown className="h-4 w-4" />
        PDF
      </button>
    </>
  );
}
