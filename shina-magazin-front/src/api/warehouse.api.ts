import api from './axios';
import type {
  ApiResponse,
  MovementType,
  PagedResponse,
  Product,
  StockAdjustmentRequest,
  StockMovement,
  WarehouseStats,
} from '../types';
import { createExportApi } from './export.utils';

export interface MovementFilters {
  page?: number;
  size?: number;
  productId?: number;
  movementType?: MovementType;
  referenceType?: string;
}

export const warehouseApi = {
  getStats: async (): Promise<WarehouseStats> => {
    const response = await api.get<ApiResponse<WarehouseStats>>('/v1/warehouse/stats');
    return response.data.data;
  },

  getMovements: async (filters: MovementFilters = {}): Promise<PagedResponse<StockMovement>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.productId) params.append('productId', filters.productId.toString());
    if (filters.movementType) params.append('movementType', filters.movementType);
    if (filters.referenceType) params.append('referenceType', filters.referenceType);

    const response = await api.get<ApiResponse<PagedResponse<StockMovement>>>(
      `/v1/warehouse/movements?${params}`
    );
    return response.data.data;
  },

  getMovementById: async (id: number): Promise<StockMovement> => {
    const response = await api.get<ApiResponse<StockMovement>>(`/v1/warehouse/movements/${id}`);
    return response.data.data;
  },

  getProductMovements: async (
    productId: number,
    page = 0,
    size = 20
  ): Promise<PagedResponse<StockMovement>> => {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    const response = await api.get<ApiResponse<PagedResponse<StockMovement>>>(
      `/v1/warehouse/movements/product/${productId}?${params}`
    );
    return response.data.data;
  },

  createAdjustment: async (data: StockAdjustmentRequest): Promise<StockMovement> => {
    const response = await api.post<ApiResponse<StockMovement>>('/v1/warehouse/adjustment', data);
    return response.data.data;
  },

  getLowStockProducts: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/v1/warehouse/low-stock');
    return response.data.data;
  },

  // Export functionality
  export: createExportApi('/v1/warehouse/movements'),
};
