import { useCallback, useState } from 'react';
import { Plus, ShoppingCart, Truck } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { useHighlight } from '../../hooks/useHighlight';
import { useInvalidateOnNotification } from '../../hooks/useInvalidateOnNotification';
import { queryKeys } from '../../lib/queryKeys';
import { useSuppliersData } from './useSuppliersData';
import { usePurchasesData } from './usePurchasesData';
import { SuppliersTab } from './SuppliersTab';
import { PurchasesTab } from './PurchasesTab';
import { SupplierFormModal } from './SupplierFormModal';
import { PurchaseFormModal } from './PurchaseFormModal';
import type { Supplier } from '../../types';

type TabType = 'suppliers' | 'purchases';

/**
 * Ta'minotchilar va xaridlar.
 *
 * <p>Sahifa faqat KOMPOZITSIYA bilan shug'ullanadi: qaysi bo'lim ochiq va
 * qaysi oyna ko'rinadi. Ma'lumot yuklashni React Query boshqaradi — ilgari
 * bu yerda beshta `useEffect` bo'lib, ularning har biri qaysi yuklovchini
 * qachon chaqirishni qo'lda hal qilardi.
 */
export function SuppliersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('suppliers');

  const suppliersData = useSuppliersData();
  const purchasesData = usePurchasesData(activeTab === 'purchases');

  const { highlightId, clearHighlight } = useHighlight();

  // WebSocket bildirishnomasi kelganda ikkala bo'lim ham yangilanadi.
  // Prefiks bo'yicha bekor qilinadi, ya'ni ro'yxat va statistika birga.
  useInvalidateOnNotification([queryKeys.suppliers.all, queryKeys.purchases.all]);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const openNewSupplier = () => {
    setEditingSupplier(null);
    setShowSupplierModal(true);
  };

  const openEditSupplier = useCallback((supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">{t('erp.suppliers.title')}</h1>
          <p className="section-subtitle">{t('erp.suppliers.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'suppliers' ? (
            <>
              <span className="pill">
                {t('erp.suppliers.supplierCount', { count: suppliersData.totalElements })}
              </span>
              <PermissionGate permission={PermissionCode.SUPPLIERS_CREATE}>
                <Button variant="primary" onClick={openNewSupplier}>
                  <Plus className="h-5 w-5" />
                  {t('erp.suppliers.newSupplier')}
                </Button>
              </PermissionGate>
            </>
          ) : (
            <>
              <span className="pill">
                {t('erp.suppliers.purchaseCount', { count: purchasesData.totalElements })}
              </span>
              <PermissionGate permission={PermissionCode.PURCHASES_CREATE}>
                <Button variant="primary" onClick={() => setShowPurchaseModal(true)}>
                  <Plus className="h-5 w-5" />
                  {t('erp.suppliers.newPurchase')}
                </Button>
              </PermissionGate>
            </>
          )}
        </div>
      </div>

      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit">
        <button
          className={clsx('tab', activeTab === 'suppliers' && 'tab-active')}
          onClick={() => setActiveTab('suppliers')}
        >
          <Truck className="h-4 w-4 mr-2" />
          {t('erp.suppliers.tabSuppliers')}
        </button>
        <button
          className={clsx('tab', activeTab === 'purchases' && 'tab-active')}
          onClick={() => setActiveTab('purchases')}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {t('erp.suppliers.tabPurchases')}
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <SuppliersTab
          data={suppliersData}
          highlightId={highlightId}
          onHighlightComplete={clearHighlight}
          onEdit={openEditSupplier}
        />
      ) : (
        <PurchasesTab data={purchasesData} />
      )}

      {/* Saqlangandan keyin ro'yxat va statistika o'z-o'zidan yangilanadi:
          oynalar mutatsiyada tegishli kalitlarni bekor qiladi. */}
      <SupplierFormModal
        isOpen={showSupplierModal}
        supplier={editingSupplier}
        onClose={() => setShowSupplierModal(false)}
      />

      <PurchaseFormModal
        isOpen={showPurchaseModal}
        suppliers={suppliersData.allSuppliers}
        onClose={() => setShowPurchaseModal(false)}
      />
    </div>
  );
}
