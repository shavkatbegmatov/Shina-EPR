import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { portalApiClient } from '../api/portal.api';
import PortalHeader from '../components/layout/PortalHeader';
import type { PortalDebt } from '../types/portal.types';
import { format } from 'date-fns';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount);
}

export default function PortalDebtsPage() {
  const { t } = useTranslation();
  const [debts, setDebts] = useState<PortalDebt[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [debtsData, total] = await Promise.all([
          portalApiClient.getDebts(),
          portalApiClient.getTotalDebt(),
        ]);
        setDebts(debtsData);
        setTotalDebt(total);
      } catch (error) {
        console.error('Failed to fetch debts', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusIcon = (status: string, overdue: boolean) => {
    if (status === 'PAID') {
      return <CheckCircle className="text-success" size={20} />;
    }
    if (overdue) {
      return <AlertTriangle className="text-error" size={20} />;
    }
    return <Clock className="text-warning" size={20} />;
  };

  const getStatusBadge = (status: string, overdue: boolean) => {
    if (status === 'PAID') return 'badge-success';
    if (overdue) return 'badge-error';
    return 'badge-warning';
  };

  const getStatusText = (status: string, overdue: boolean) => {
    if (status === 'PAID') return t('debts.paid');
    if (overdue) return t('debts.overdue');
    return t('debts.active');
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('debts.title')} />
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  const activeDebts = debts.filter((d) => d.status === 'ACTIVE');
  const paidDebts = debts.filter((d) => d.status === 'PAID');

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('debts.title')} />

      <div className="p-4 space-y-4">
        {/* Total Debt Card */}
        <div className={`card ${totalDebt > 0 ? 'bg-error text-error-content' : 'bg-success text-success-content'}`}>
          <div className="card-body p-4">
            <div className="flex items-center gap-3">
              {totalDebt > 0 ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
              <div>
                <p className="text-sm opacity-80">{t('debts.totalDebt')}</p>
                <p className="text-2xl font-bold">
                  {formatMoney(totalDebt)} {t('common.sum')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {debts.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/60">{t('debts.noDebts')}</p>
          </div>
        ) : (
          <>
            {/* Active Debts */}
            {activeDebts.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-base-content/80">{t('debts.active')}</h3>
                {activeDebts.map((debt) => (
                  <div key={debt.id} className="card bg-base-100 shadow-sm">
                    <div className="card-body p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(debt.status, debt.overdue)}
                          <div>
                            <p className="font-medium">{debt.invoiceNumber || `#${debt.id}`}</p>
                            <p className="text-xs text-base-content/60">
                              {format(new Date(debt.createdAt), 'dd.MM.yyyy')}
                            </p>
                          </div>
                        </div>
                        <span className={`badge badge-sm ${getStatusBadge(debt.status, debt.overdue)}`}>
                          {getStatusText(debt.status, debt.overdue)}
                        </span>
                      </div>

                      <div className="divider my-2"></div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-base-content/60 text-xs">{t('debts.originalAmount')}</p>
                          <p className="font-medium">{formatMoney(debt.originalAmount)} {t('common.sum')}</p>
                        </div>
                        <div>
                          <p className="text-base-content/60 text-xs">{t('debts.remainingAmount')}</p>
                          <p className="font-bold text-error">{formatMoney(debt.remainingAmount)} {t('common.sum')}</p>
                        </div>
                        <div>
                          <p className="text-base-content/60 text-xs">{t('debts.paidAmount')}</p>
                          <p className="font-medium text-success">{formatMoney(debt.paidAmount)} {t('common.sum')}</p>
                        </div>
                        {debt.dueDate && (
                          <div>
                            <p className="text-base-content/60 text-xs">{t('debts.dueDate')}</p>
                            <p className={`font-medium ${debt.overdue ? 'text-error' : ''}`}>
                              {format(new Date(debt.dueDate), 'dd.MM.yyyy')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paid Debts */}
            {paidDebts.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-base-content/80">{t('debts.paid')}</h3>
                {paidDebts.map((debt) => (
                  <div key={debt.id} className="card bg-base-100 shadow-sm opacity-60">
                    <div className="card-body p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="text-success" size={20} />
                          <div>
                            <p className="font-medium">{debt.invoiceNumber || `#${debt.id}`}</p>
                            <p className="text-xs text-base-content/60">
                              {formatMoney(debt.originalAmount)} {t('common.sum')}
                            </p>
                          </div>
                        </div>
                        <span className="badge badge-success badge-sm">{t('debts.paid')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
