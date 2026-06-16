import api from '../../api/axios';
import type { ApiResponse, PagedResponse, Product } from '../../types';

/**
 * Ommaviy katalog API klienti — backend `GET /v1/catalog` (auth talab qilmaydi).
 *
 * Backend CatalogProductResponse tannarx (purchasePrice) va minStockLevel'ni
 * chiqarib tashlaydi, shuning uchun ularni storefront uchun xavfsiz default
 * bilan to'ldiramiz (faqat faol mahsulotlar qaytariladi → active: true).
 */
type PublicProduct = Omit<Product, 'minStockLevel' | 'active' | 'purchasePrice'>;

const toProduct = (c: PublicProduct): Product => ({
  ...c,
  minStockLevel: 0,
  active: true,
});

export const catalogApi = {
  list: async (): Promise<Product[]> => {
    const res = await api.get<ApiResponse<PagedResponse<PublicProduct>>>('/v1/catalog?size=200');
    return res.data.data.content.map(toProduct);
  },

  getById: async (id: number | string): Promise<Product> => {
    const res = await api.get<ApiResponse<PublicProduct>>(`/v1/catalog/${id}`);
    return toProduct(res.data.data);
  },
};
