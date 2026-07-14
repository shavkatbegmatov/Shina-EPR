import api from '../../api/axios';
import type { ApiResponse, CatalogFacets, PagedResponse, Product, Season } from '../../types';

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

/** Server tomonda filtrlash parametrlari (kategoriya subtree bilan qamrab olinadi). */
export interface CatalogFilterParams {
  categoryId?: number;
  season?: Season | '';
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  /** Backend formati: "attrId:optId,optId;attrId:optId" */
  attrs?: string;
  /** Pageable sort, masalan "sellingPrice,asc" */
  sort?: string;
}

export const catalogApi = {
  list: async (): Promise<Product[]> => {
    const res = await api.get<ApiResponse<PagedResponse<PublicProduct>>>('/v1/catalog?size=200');
    return res.data.data.content.map(toProduct);
  },

  listFiltered: async (filters: CatalogFilterParams): Promise<Product[]> => {
    const params = new URLSearchParams({ size: '200' });
    if (filters.categoryId) params.append('categoryId', String(filters.categoryId));
    if (filters.season) params.append('season', filters.season);
    if (filters.priceMin !== undefined) params.append('priceMin', String(filters.priceMin));
    if (filters.priceMax !== undefined) params.append('priceMax', String(filters.priceMax));
    if (filters.inStock) params.append('inStock', 'true');
    if (filters.attrs) params.append('attrs', filters.attrs);
    if (filters.sort) params.append('sort', filters.sort);
    const res = await api.get<ApiResponse<PagedResponse<PublicProduct>>>(`/v1/catalog?${params}`);
    return res.data.data.content.map(toProduct);
  },

  // Filtr paneli facetlari: kategoriya daraxti, narx diapazoni, atribut filtrlari
  facets: async (categoryId?: number): Promise<CatalogFacets> => {
    const params = categoryId ? `?categoryId=${categoryId}` : '';
    const res = await api.get<ApiResponse<CatalogFacets>>(`/v1/catalog/facets${params}`);
    return res.data.data;
  },

  getById: async (id: number | string): Promise<Product> => {
    const res = await api.get<ApiResponse<PublicProduct>>(`/v1/catalog/${id}`);
    return toProduct(res.data.data);
  },
};
