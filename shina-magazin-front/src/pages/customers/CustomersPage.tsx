import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Users, Phone } from 'lucide-react';
import { customersApi } from '../../api/customers.api';
import { formatCurrency, CUSTOMER_TYPES } from '../../config/constants';
import type { Customer } from '../../types';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customersApi.getAll({
        page,
        size: 20,
        search: search || undefined,
      });
      setCustomers(data.content);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mijozlar</h1>
          <p className="text-base-content/70">Mijozlar bazasi</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Yangi mijoz
        </button>
      </div>

      {/* Search */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-4">
          <div className="form-control max-w-md">
            <div className="input-group">
              <span className="bg-base-200">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Ism yoki telefon bo'yicha qidirish..."
                className="input input-bordered w-full"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-base-content/50">
            <Users className="w-12 h-12 mb-2" />
            <p>Mijozlar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Mijoz</th>
                  <th>Telefon</th>
                  <th>Turi</th>
                  <th>Manzil</th>
                  <th>Balans</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-primary text-primary-content rounded-full w-10">
                            <span>
                              {customer.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">{customer.fullName}</div>
                          {customer.companyName && (
                            <div className="text-sm text-base-content/70">
                              {customer.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-base-content/50" />
                        {customer.phone}
                      </div>
                      {customer.phone2 && (
                        <div className="text-sm text-base-content/70">
                          {customer.phone2}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-outline badge-sm">
                        {CUSTOMER_TYPES[customer.customerType]?.label}
                      </span>
                    </td>
                    <td className="max-w-xs truncate">
                      {customer.address || '-'}
                    </td>
                    <td>
                      <span
                        className={`font-medium ${
                          customer.balance < 0
                            ? 'text-error'
                            : customer.balance > 0
                            ? 'text-success'
                            : ''
                        }`}
                      >
                        {formatCurrency(customer.balance)}
                      </span>
                      {customer.hasDebt && (
                        <span className="badge badge-error badge-sm ml-2">
                          Qarz
                        </span>
                      )}
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
