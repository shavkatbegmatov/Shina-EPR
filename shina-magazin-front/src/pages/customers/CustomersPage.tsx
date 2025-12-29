import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Users, Phone } from 'lucide-react';
import clsx from 'clsx';
import { customersApi } from '../../api/customers.api';
import { formatCurrency, CUSTOMER_TYPES } from '../../config/constants';
import type { Customer } from '../../types';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const hasSearch = useMemo(() => search.trim().length > 0, [search]);

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
      setTotalElements(data.totalElements);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Mijozlar</h1>
          <p className="section-subtitle">Mijozlar bazasi</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill">{totalElements} ta mijoz</span>
          <button className="btn btn-primary">
            <Plus className="h-5 w-5" />
            Yangi mijoz
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="surface-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
              Qidiruv
            </h2>
            <p className="text-xs text-base-content/60">
              {hasSearch ? "Qidiruv natijalari ko'rsatilmoqda" : 'Barcha mijozlar'}
            </p>
          </div>
          <span className="pill">20 / sahifa</span>
        </div>
        <label className="form-control mt-4 max-w-md">
          <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
            Ism yoki telefon
          </span>
          <div className="input-group">
            <span className="bg-base-200">
              <Search className="h-5 w-5" />
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
        </label>
      </div>

      {/* Customers Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
            <Users className="h-12 w-12" />
            <div>
              <p className="text-base font-medium">Mijozlar topilmadi</p>
              <p className="text-sm">Qidiruv so'zini o'zgartiring</p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
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
                    <tr
                      key={customer.id}
                      className={clsx(customer.hasDebt && 'bg-error/5')}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="w-10 rounded-full bg-primary/15 text-primary">
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
                          <Phone className="h-4 w-4 text-base-content/50" />
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
                          className={clsx(
                            'font-medium',
                            customer.balance < 0 && 'text-error',
                            customer.balance > 0 && 'text-success'
                          )}
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

            <div className="space-y-3 p-4 lg:hidden">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="surface-panel flex flex-col gap-3 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{customer.fullName}</p>
                      <p className="text-xs text-base-content/60">
                        {customer.companyName || 'Jismoniy shaxs'}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        'badge badge-sm',
                        customer.hasDebt ? 'badge-error' : 'badge-success'
                      )}
                    >
                      {customer.hasDebt ? 'Qarz' : 'Toza'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </div>
                  {customer.address && (
                    <p className="text-xs text-base-content/60">
                      {customer.address}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {formatCurrency(customer.balance)}
                    </span>
                    <button className="btn btn-ghost btn-sm min-h-[44px]">
                      Tahrirlash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-base-200 p-4">
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              « Oldingi
            </button>
            <span className="pill">
              Sahifa {page + 1} / {totalPages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Keyingi »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
