import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Package } from 'lucide-react';
import { productsApi, brandsApi, categoriesApi } from '../../api/products.api';
import { formatCurrency, SEASONS } from '../../config/constants';
import type { Product, Brand, Category, Season } from '../../types';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<number | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [seasonFilter, setSeasonFilter] = useState<Season | ''>('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [brandsData, categoriesData] = await Promise.all([
        brandsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setBrands(brandsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productsApi.getAll({
        page,
        size: 20,
        search: search || undefined,
        brandId: brandFilter || undefined,
        categoryId: categoryFilter || undefined,
        season: seasonFilter || undefined,
      });
      setProducts(data.content);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [brandFilter, categoryFilter, page, search, seasonFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mahsulotlar</h1>
          <p className="text-base-content/70">Shina katalogi</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Yangi mahsulot
        </button>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-control">
              <div className="input-group">
                <span className="bg-base-200">
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Qidirish..."
                  className="input input-bordered w-full"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
            </div>

            <select
              className="select select-bordered w-full"
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value ? Number(e.target.value) : '');
                setPage(0);
              }}
            >
              <option value="">Barcha brendlar</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>

            <select
              className="select select-bordered w-full"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value ? Number(e.target.value) : '');
                setPage(0);
              }}
            >
              <option value="">Barcha kategoriyalar</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              className="select select-bordered w-full"
              value={seasonFilter}
              onChange={(e) => {
                setSeasonFilter(e.target.value as Season | '');
                setPage(0);
              }}
            >
              <option value="">Barcha mavsumlar</option>
              {Object.entries(SEASONS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-base-content/50">
            <Package className="w-12 h-12 mb-2" />
            <p>Mahsulotlar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nomi</th>
                  <th>Brend</th>
                  <th>O'lcham</th>
                  <th>Mavsum</th>
                  <th>Narx</th>
                  <th>Zaxira</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="font-mono text-sm">{product.sku}</td>
                    <td>
                      <div className="font-medium">{product.name}</div>
                    </td>
                    <td>{product.brandName}</td>
                    <td>{product.sizeString}</td>
                    <td>
                      {product.season && (
                        <span className="badge badge-outline badge-sm">
                          {SEASONS[product.season]?.label}
                        </span>
                      )}
                    </td>
                    <td className="font-medium">
                      {formatCurrency(product.sellingPrice)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          product.lowStock
                            ? 'badge-error'
                            : 'badge-success'
                        }`}
                      >
                        {product.quantity}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm">
                        Tahrirlash
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center p-4 border-t border-base-200">
            <div className="join">
              <button
                className="join-item btn btn-sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                «
              </button>
              <button className="join-item btn btn-sm">
                {page + 1} / {totalPages}
              </button>
              <button
                className="join-item btn btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
