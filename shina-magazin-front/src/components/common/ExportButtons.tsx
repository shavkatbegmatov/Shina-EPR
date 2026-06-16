import { FileSpreadsheet, FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';

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
  const { t } = useTranslation();
  const isDisabled = disabled || loading;

  return (
    <>
      <Button
        variant="success"
        size="sm"
        className="flex-1 sm:flex-none"
        onClick={onExportExcel}
        disabled={isDisabled}
        title={t('erp.ui.exportExcel')}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
      <Button
        variant="danger"
        size="sm"
        className="flex-1 sm:flex-none"
        onClick={onExportPdf}
        disabled={isDisabled}
        title={t('erp.ui.exportPdf')}
      >
        <FileDown className="h-4 w-4" />
        PDF
      </Button>
    </>
  );
}
