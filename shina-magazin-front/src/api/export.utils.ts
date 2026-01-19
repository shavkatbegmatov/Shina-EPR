import api from './axios';
import toast from 'react-hot-toast';

/**
 * Generic export utility for all entities.
 * Creates export API methods that work with any backend export endpoint.
 *
 * @example
 * export const productsApi = {
 *   export: createExportApi('/v1/products'),
 * };
 *
 * // Usage in component:
 * await productsApi.export.exportData('excel', { brandId: 5, search: 'winter' });
 */
export const createExportApi = (baseUrl: string) => ({
  /**
   * Export data to Excel or PDF format
   *
   * @param format - Export format ('excel' or 'pdf')
   * @param filters - Optional filter parameters to include in export
   */
  exportData: async (
    format: 'excel' | 'pdf',
    filters?: Record<string, any>
  ): Promise<void> => {
    try {
      const params = new URLSearchParams({ format });

      // Add all filters to query params
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get(`${baseUrl}/export?${params}`, {
        responseType: 'blob',
      });

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'excel' ? 'xlsx' : 'pdf';
      const entityName = baseUrl.split('/').pop();
      link.download = `${entityName}_${new Date().toISOString().split('T')[0]}.${extension}`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} fayli yuklab olindi`);
    } catch (error) {
      toast.error('Eksport qilishda xatolik');
      throw error;
    }
  },
});
