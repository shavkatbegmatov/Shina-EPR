import { useCallback, useEffect, useState } from 'react';
import { Plus, ShoppingCart, Truck } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { useNotificationsStore } from '../../store/notificationsStore';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { useHighlight } from '../../hooks/useHighlight';
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
 * <p>Bu sahifa ilgari 1300 qatordan oshgan va 36 ta `useState` saqlagan yagona
 * komponent edi: ikkita mustaqil ro'yxat, ikkita statistika to'plami va ikkita
 * forma bir joyda turardi. `page`/`purchasesPage`, `refreshing`/
 * `purchasesRefreshing` kabi juftliklarda noto'g'ri o'zgaruvchini ishlatish
 * oson edi, savat arifmetikasini esa butun sahifani render qilmasdan
 * sinab bo'lmasdi.
 *
 * <p>Endi sahifa faqat KOMPOZITSIYA bilan shug'ullanadi: qaysi bo'lim ochiq,
 * qaysi oyna ko'rinadi va ma'lumot qachon qayta yuklanadi.
 */
export function SuppliersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('suppliers');

  const suppliersData = useSuppliersData();
  const purchasesData = usePurchasesData();

  const { notifications } = useNotificationsStore();
  const { highlightId, clearHighlight } = useHighlight();

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const { load: loadSuppliers, loadAll: loadAllSuppliers, loadStats } = suppliersData;
  const { load: loadPurchases, loadStats: loadPurchaseStats } = purchasesData;

  // Boshlang'ich yuklash
  useEffect(() => {
    void loadSuppliers(true);
    void loadStats();
    void loadAllSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ta'minotchi filtrlari o'zgarganda — `load` ning o'zi sahifa/qidiruvga
  // bog'langan, shuning uchun uni kuzatish yetarli.
  useEffect(() => {
    void loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliersData.page, suppliersData.pageSize, suppliersData.search]);

  // Xaridlar bo'limi FAQAT ochilganda yuklanadi: ko'pchilik foydalanuvchi
  // ta'minotchilar bo'limida ishlaydi, ikkinchi so'rovni oldindan yuborish
  // ortiqcha edi.
  useEffect(() => {
    if (activeTab === 'purchases') {
      void loadPurchases(true);
      void loadPurchaseStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'purchases') {
      void loadPurchases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasesData.page, purchasesData.pageSize]);

  // Real-time yangilanish (WebSocket bildirishnomasi kelganda)
  useEffect(() => {
    if (notifications.length === 0) return;
    void loadSuppliers();
    void loadStats();
    if (activeTab === 'purchases') {
      void loadPurchases();
      void loadPurchaseStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length, activeTab]);

  const openNewSupplier = () => {
    setEditingSupplier(null);
    setShowSupplierModal(true);
  };

  const openEditSupplier = useCallback((supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  }, []);

  const handleSupplierSaved = () => {
    void loadSuppliers();
    void loadStats();
    void loadAllSuppliers();
  };

  const handlePurchaseSaved = () => {
    void loadPurchases();
    void loadPurchaseStats();
    // Xarid ta'minotchi balansini o'zgartiradi — qarz statistikasi ham yangilanadi
    void loadStats();
  };

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

      <SupplierFormModal
        isOpen={showSupplierModal}
        supplier={editingSupplier}
        onClose={() => setShowSupplierModal(false)}
        onSaved={handleSupplierSaved}
      />

      <PurchaseFormModal
        isOpen={showPurchaseModal}
        suppliers={suppliersData.allSuppliers}
        onClose={() => setShowPurchaseModal(false)}
        onSaved={handlePurchaseSaved}
      />
    </div>
  );
}
