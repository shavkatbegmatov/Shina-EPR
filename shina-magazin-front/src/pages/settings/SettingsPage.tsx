import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  X,
  Tag,
  FolderTree,
  AlertTriangle,
  Pencil,
  Trash2,
  Palette,
  Sun,
  Moon,
  Monitor,
  Clock,
  Printer,
  Send,
  Database,
  Sparkles,
  RefreshCw,
  Package,
  UsersRound,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { useTranslation } from 'react-i18next';
import { brandsApi, categoriesApi } from '../../api/products.api';
import { settingsApi } from '../../api/settings.api';
import { queryKeys } from '../../lib/queryKeys';
import { NumberInput } from '../../components/ui/NumberInput';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { ExportButtons } from '../../components/common/ExportButtons';
import { useThemeStore } from '../../shared/theme/themeStore';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { Button } from '@/ui';
import { ProductImage } from '../../shop/components/ProductImage';
import { TELEGRAM_EVENT_TYPES } from '../../types';
import type { Brand, Category, ReceiptSettings, TelegramEventType } from '../../types';

type Tab = 'appearance' | 'brands' | 'categories' | 'debts' | 'receipt' | 'telegram' | 'demo';

interface BrandFormData {
  name: string;
  country: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  parentId: number | '';
}

const emptyBrandForm: BrandFormData = { name: '', country: '' };
const emptyCategoryForm: CategoryFormData = { name: '', description: '', parentId: '' };
const DEFAULT_DEBT_DUE_DAYS = 30;

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  // Brands state
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState<BrandFormData>(emptyBrandForm);
  const [brandSaving, setBrandSaving] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [brandDeleting, setBrandDeleting] = useState(false);

  // Categories state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(emptyCategoryForm);
  const [categorySaving, setCategorySaving] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [categoryDeleting, setCategoryDeleting] = useState(false);

  // Debt settings
  const [debtDueDays, setDebtDueDays] = useState(DEFAULT_DEBT_DUE_DAYS);
  const [imageFallback, setImageFallback] = useState<'SVG' | 'PHOTO'>('SVG');
  // Vitrina yetkazib berish — ilgari backend kodida qattiq yozilgan edi
  const [deliveryFee, setDeliveryFee] = useState(30000);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(1000000);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Chek sarlavhasi — kassa qog'ozida chiqadigan do'kon ma'lumotlari
  const [receipt, setReceipt] = useState<ReceiptSettings>({});
  const setReceiptField = (field: keyof ReceiptSettings) => (value: string) =>
    setReceipt((prev) => ({ ...prev, [field]: value }));

  // Telegram xabarnomalari. Bot tokeni bu yerda YO'Q — u serverdagi muhit
  // o'zgaruvchisidan olinadi; `telegramConfigured` faqat o'rnatilganini
  // bildiradi, tokenning o'zi hech qachon qaytarilmaydi.
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramEvents, setTelegramEvents] = useState<Set<TelegramEventType>>(new Set());
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);
  // Mijozlarning bot orqali o'zi ro'yxatdan o'tishi — yuqoridagi chiquvchi
  // xabarnomalardan MUSTAQIL sozlama (bir xil bot, boshqa yo'nalish).
  const [telegramRegistrationEnabled, setTelegramRegistrationEnabled] = useState(false);
  const [telegramBotUsername, setTelegramBotUsername] = useState('');

  // Demo dataset boshqaruvi alohida holat: seed/cleanup uzoqroq davom etishi
  // mumkin va foydalanuvchi shu paytda ikkinchi amalni bosmasligi kerak.
  const [demoAction, setDemoAction] = useState<'generate' | 'remove' | null>(null);
  const [showDemoDeleteConfirm, setShowDemoDeleteConfirm] = useState(false);

  const toggleTelegramEvent = (type: TelegramEventType) =>
    setTelegramEvents((prev) => {
      const next = new Set(prev);
      if (!next.delete(type)) next.add(type);
      return next;
    });

  // Brendlar va kategoriyalar KATALOG sahifalari bilan bir xil kalitda —
  // bo'limlar orasida yurganda qaytadan so'ralmaydi.
  const brandsQuery = useQuery({
    queryKey: queryKeys.brands.list(),
    queryFn: () => brandsApi.getAll(),
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: () => categoriesApi.getAll(),
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.detail(),
    queryFn: () => settingsApi.get(),
  });

  const demoStatusQuery = useQuery({
    queryKey: queryKeys.settings.demo(),
    queryFn: () => settingsApi.getDemoStatus(),
    enabled: activeTab === 'demo',
  });

  const brands = brandsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const brandsLoading = brandsQuery.isPending;
  const categoriesLoading = categoriesQuery.isPending;
  const settingsLoading = settingsQuery.isPending;
  const demoStatus = demoStatusQuery.data;
  const demoBusy = demoAction !== null;

  /**
   * Server sozlamalarini FORMA holatiga ko'chiradi.
   *
   * <p>Sozlamalar tahrirlanadi, ya'ni ular so'rov natijasidan bevosita
   * o'qilmaydi — foydalanuvchi kiritayotgan qiymat ustiga yozib yuborardi.
   * Shuning uchun ko'chirish faqat ma'lumot YANGI kelganda bajariladi.
   */
  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;

    setDebtDueDays(data.debtDueDays);
    setImageFallback(data.imageFallback === 'PHOTO' ? 'PHOTO' : 'SVG');
    setDeliveryFee(data.deliveryFee ?? 30000);
    setFreeDeliveryThreshold(data.freeDeliveryThreshold ?? 1000000);
    setReceipt({
      receiptShopName: data.receiptShopName ?? '',
      receiptShopPhone: data.receiptShopPhone ?? '',
      receiptShopAddress: data.receiptShopAddress ?? '',
      receiptFooter: data.receiptFooter ?? '',
    });
    setTelegramEnabled(data.telegramEnabled ?? false);
    setTelegramChatId(data.telegramChatId ?? '');
    setTelegramConfigured(data.telegramConfigured ?? false);
    setTelegramRegistrationEnabled(data.telegramRegistrationEnabled ?? false);
    setTelegramBotUsername(data.telegramBotUsername ?? '');
    setTelegramEvents(new Set(
      (data.telegramEvents ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is TelegramEventType =>
          (TELEGRAM_EVENT_TYPES as string[]).includes(s))
    ));
  }, [settingsQuery.data]);

  useEffect(() => {
    if (settingsQuery.isError) {
      console.error('Failed to load settings:', settingsQuery.error);
      toast.error(getApiErrorMessage(settingsQuery.error));
    }
  }, [settingsQuery.isError, settingsQuery.error]);

  const invalidateBrands = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  };

  const invalidateCategories = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  };

  // Export handlers
  const handleExportBrands = async (format: 'excel' | 'pdf') => {
    await brandsApi.export.exportData(format, {});
  };

  const handleExportCategories = async (format: 'excel' | 'pdf') => {
    await categoriesApi.export.exportData(format, {});
  };

  const handleExportSettings = async (format: 'excel' | 'pdf') => {
    await settingsApi.export.exportData(format, {});
  };

  // Brand handlers
  const handleOpenBrandModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({ name: brand.name, country: brand.country || '' });
    } else {
      setEditingBrand(null);
      setBrandForm(emptyBrandForm);
    }
    setShowBrandModal(true);
  };

  const handleCloseBrandModal = () => {
    setShowBrandModal(false);
    setEditingBrand(null);
    setBrandForm(emptyBrandForm);
  };

  const handleSaveBrand = async () => {
    if (!brandForm.name.trim()) return;
    setBrandSaving(true);
    try {
      if (editingBrand) {
        await brandsApi.update(editingBrand.id, brandForm.name, brandForm.country || undefined);
      } else {
        await brandsApi.create(brandForm.name, brandForm.country || undefined);
      }
      handleCloseBrandModal();
      invalidateBrands();
    } catch (error) {
      console.error('Failed to save brand:', error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setBrandSaving(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deletingBrand) return;
    setBrandDeleting(true);
    try {
      await brandsApi.delete(deletingBrand.id);
      setDeletingBrand(null);
      invalidateBrands();
    } catch (error) {
      console.error('Failed to delete brand:', error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setBrandDeleting(false);
    }
  };

  // Category handlers
  const handleOpenCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || '',
      });
    } else {
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
    }
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, {
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          parentId: categoryForm.parentId || undefined,
        });
      } else {
        await categoriesApi.create({
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          parentId: categoryForm.parentId || undefined,
        });
      }
      handleCloseCategoryModal();
      invalidateCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setCategoryDeleting(true);
    try {
      await categoriesApi.delete(deletingCategory.id);
      setDeletingCategory(null);
      invalidateCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setCategoryDeleting(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const data = await settingsApi.update({
        debtDueDays,
        imageFallback,
        deliveryFee,
        freeDeliveryThreshold,
        ...receipt,
        telegramEnabled,
        telegramChatId: telegramChatId.trim(),
        telegramEvents: [...telegramEvents].join(','),
        telegramRegistrationEnabled,
        telegramBotUsername: telegramBotUsername.trim(),
      });
      setDebtDueDays(data.debtDueDays);
      setImageFallback(data.imageFallback === 'PHOTO' ? 'PHOTO' : 'SVG');
      setDeliveryFee(data.deliveryFee ?? deliveryFee);
      setFreeDeliveryThreshold(data.freeDeliveryThreshold ?? freeDeliveryThreshold);
      // Server username'ni tozalaydi (@ va t.me/ olib tashlanadi) — maydonda
      // aynan SAQLANGAN qiymat ko'rinsin, aks holda foydalanuvchi yozgani
      // qolib, havola boshqacha yasalayotgandek tuyulardi.
      setTelegramBotUsername(data.telegramBotUsername ?? '');
      // Sozlamalar ma'lumotnoma keshida uzoq turadi va ularni SMENALAR
      // sahifasi ham o'qiydi. Invalidatsiyasiz saqlangan qiymat boshqa
      // sahifada (va bu yerga qaytganda) eski holida ko'rinardi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      toast.success(t('erp.settings.settingsSavedToast'));
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(t('erp.settings.settingsSaveError'));
    } finally {
      setSettingsSaving(false);
    }
  };

  /**
   * Sinov xabari.
   *
   * <p>Saqlashdan OLDIN ham ishlashi kerak: foydalanuvchi chat IDni kiritib,
   * darhol tekshira olsin. Shuning uchun ID so'rovga parametr sifatida
   * uzatiladi, bazadagi qiymat kutilmaydi.
   */
  const handleTestTelegram = async () => {
    setTelegramTesting(true);
    try {
      await settingsApi.testTelegram(telegramChatId.trim());
      toast.success(t('erp.settings.telegram.testSent'));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setTelegramTesting(false);
    }
  };

  /** So'mdagi sozlama: faqat manfiy bo'lmagan butun son qabul qilinadi. */
  const handleMoneyChange =
    (setter: (value: number) => void) =>
    (value: number | string) => {
      const parsed = typeof value === 'string' ? Number(value) : value;
      if (Number.isFinite(parsed) && parsed >= 0) {
        setter(Math.round(parsed));
      }
    };

  const handleDebtDueDaysChange = (value: number | string) => {
    if (typeof value === 'string') {
      if (value === '' || value === '-' || value === '.' || value === '-.') {
        return;
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        setDebtDueDays(parsed);
      }
      return;
    }
    setDebtDueDays(value);
  };

  const refreshBusinessData = (status: NonNullable<typeof demoStatusQuery.data>) => {
    queryClient.setQueryData(queryKeys.settings.demo(), status);
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'settings',
    });
  };

  const handleGenerateDemo = async () => {
    setDemoAction('generate');
    try {
      const status = await settingsApi.generateDemoData();
      refreshBusinessData(status);
      toast.success(t('erp.settings.demo.generatedToast'));
    } catch (error) {
      console.error('Failed to generate demo data:', error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setDemoAction(null);
    }
  };

  const handleRemoveDemo = async () => {
    setDemoAction('remove');
    try {
      const status = await settingsApi.removeDemoData();
      refreshBusinessData(status);
      setShowDemoDeleteConfirm(false);
      toast.success(t('erp.settings.demo.removedToast'));
    } catch (error) {
      console.error('Failed to remove demo data:', error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setDemoAction(null);
    }
  };

  const demoGeneratedAt = demoStatus?.generatedAt
    ? new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(demoStatus.generatedAt))
    : null;

  const demoStats = [
    { key: 'products', label: t('erp.settings.demo.products'), icon: Package },
    { key: 'customers', label: t('erp.settings.demo.customers'), icon: UsersRound },
    { key: 'sales', label: t('erp.settings.demo.sales'), icon: ShoppingCart },
    { key: 'purchases', label: t('erp.settings.demo.purchases'), icon: Truck },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title">{t('erp.settings.title')}</h1>
        <p className="section-subtitle">{t('erp.settings.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered">
        <button
          className={clsx('tab gap-2', activeTab === 'appearance' && 'tab-active')}
          onClick={() => setActiveTab('appearance')}
        >
          <Palette className="h-4 w-4" />
          {t('erp.settings.tabAppearance')}
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'brands' && 'tab-active')}
          onClick={() => setActiveTab('brands')}
        >
          <Tag className="h-4 w-4" />
          {t('erp.settings.tabBrands')}
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'categories' && 'tab-active')}
          onClick={() => setActiveTab('categories')}
        >
          <FolderTree className="h-4 w-4" />
          {t('erp.settings.tabCategories')}
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'debts' && 'tab-active')}
          onClick={() => setActiveTab('debts')}
        >
          <Clock className="h-4 w-4" />
          {t('erp.settings.tabDebts')}
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'receipt' && 'tab-active')}
          onClick={() => setActiveTab('receipt')}
        >
          <Printer className="h-4 w-4" />
          {t('erp.settings.receiptTitle')}
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'telegram' && 'tab-active')}
          onClick={() => setActiveTab('telegram')}
        >
          <Send className="h-4 w-4" />
          Telegram
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'demo' && 'tab-active')}
          onClick={() => setActiveTab('demo')}
        >
          <Database className="h-4 w-4" />
          {t('erp.settings.demo.tab')}
        </button>
      </div>

      {/* Demo dataset */}
      {activeTab === 'demo' && (
        <div className="space-y-4">
          <section className="surface-card relative overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10">
            <div className="relative z-10 p-6 sm:p-8 lg:max-w-[68%]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-primary badge-outline gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('erp.settings.demo.curated')}
                </span>
                {demoStatus && (
                  <span className={clsx('badge', demoStatus.active ? 'badge-success' : 'badge-ghost')}>
                    {demoStatus.active
                      ? t('erp.settings.demo.active')
                      : t('erp.settings.demo.inactive')}
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
                {t('erp.settings.demo.title')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/70 sm:text-base">
                {t('erp.settings.demo.subtitle')}
              </p>

              <PermissionGate permission={PermissionCode.SETTINGS_UPDATE}>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    onClick={handleGenerateDemo}
                    disabled={demoBusy || demoStatusQuery.isPending}
                  >
                    {demoAction === 'generate' ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : demoStatus?.active ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {demoStatus?.active
                      ? t('erp.settings.demo.regenerate')
                      : t('erp.settings.demo.generate')}
                  </Button>
                  {demoStatus?.active && (
                    <Button
                      variant="danger"
                      onClick={() => setShowDemoDeleteConfirm(true)}
                      disabled={demoBusy}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('erp.settings.demo.remove')}
                    </Button>
                  )}
                </div>
              </PermissionGate>
            </div>

            <div className="absolute inset-y-0 right-0 hidden w-[34%] overflow-hidden lg:block">
              <div className="absolute inset-0 z-10 bg-gradient-to-r from-base-100 via-base-100/25 to-transparent" />
              <img
                src="/products/demo/sport-uhp.webp"
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </div>
          </section>

          {demoStatusQuery.isPending ? (
            <div className="surface-card flex min-h-48 items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : demoStatusQuery.isError ? (
            <div className="alert alert-error">
              <AlertTriangle className="h-5 w-5" />
              <span>{getApiErrorMessage(demoStatusQuery.error)}</span>
              <Button variant="ghost" size="sm" onClick={() => void demoStatusQuery.refetch()}>
                {t('common.retry')}
              </Button>
            </div>
          ) : demoStatus?.active ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {demoStats.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="surface-card flex items-center gap-4 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-card bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-semibold tabular-nums">
                        {demoStatus.counts[key] ?? 0}
                      </div>
                      <div className="text-xs font-medium text-base-content/55">{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="surface-card grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h3 className="font-semibold">{t('erp.settings.demo.readyTitle')}</h3>
                  <p className="mt-1 text-sm text-base-content/60">
                    {t('erp.settings.demo.readyHint')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-base-content/65">
                  <span>
                    {t('erp.settings.demo.version')}: <strong>{demoStatus.datasetVersion}</strong>
                  </span>
                  {demoGeneratedAt && (
                    <span>
                      {t('erp.settings.demo.generatedAt')}: <strong>{demoGeneratedAt}</strong>
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="surface-card grid gap-5 p-6 md:grid-cols-[auto_1fr] md:items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-card bg-base-200 text-base-content/45">
                <Database className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-semibold">{t('erp.settings.demo.emptyTitle')}</h3>
                <p className="mt-1 text-sm text-base-content/60">
                  {t('erp.settings.demo.emptyHint')}
                </p>
              </div>
            </div>
          )}

          <div className="alert border border-info/20 bg-info/10 text-base-content">
            <Database className="h-5 w-5 text-info" />
            <span className="text-sm">{t('erp.settings.demo.safetyHint')}</span>
          </div>
        </div>
      )}

      {/* Chek sozlamalari */}
      {activeTab === 'receipt' && (
        <div className="surface-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('erp.settings.receiptTitle')}</h2>
              <p className="text-sm text-base-content/60">{t('erp.settings.receiptHint')}</p>
            </div>
            <PermissionGate permission={PermissionCode.SETTINGS_UPDATE}>
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                disabled={settingsSaving || settingsLoading}
              >
                {settingsSaving && <span className="loading loading-spinner loading-sm" />}
                {t('common.save')}
              </Button>
            </PermissionGate>
          </div>

          {settingsLoading ? (
            <div className="mt-6 flex items-center justify-center py-8">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : (
            <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
              <label className="form-control">
                <span className="label-text mb-1">{t('erp.settings.receiptShopName')}</span>
                <input
                  className="input input-bordered"
                  maxLength={255}
                  value={receipt.receiptShopName ?? ''}
                  onChange={(e) => setReceiptField('receiptShopName')(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">{t('erp.settings.receiptShopPhone')}</span>
                <input
                  className="input input-bordered"
                  maxLength={255}
                  value={receipt.receiptShopPhone ?? ''}
                  onChange={(e) => setReceiptField('receiptShopPhone')(e.target.value)}
                />
              </label>
              <label className="form-control sm:col-span-2">
                <span className="label-text mb-1">{t('erp.settings.receiptShopAddress')}</span>
                <input
                  className="input input-bordered"
                  maxLength={255}
                  value={receipt.receiptShopAddress ?? ''}
                  onChange={(e) => setReceiptField('receiptShopAddress')(e.target.value)}
                />
              </label>
              <label className="form-control sm:col-span-2">
                <span className="label-text mb-1">{t('erp.settings.receiptFooter')}</span>
                <input
                  className="input input-bordered"
                  maxLength={255}
                  value={receipt.receiptFooter ?? ''}
                  onChange={(e) => setReceiptField('receiptFooter')(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Telegram xabarnomalari */}
      {activeTab === 'telegram' && !settingsLoading && (
        <div className="surface-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('erp.settings.telegram.title')}</h2>
              <p className="text-sm text-base-content/60">{t('erp.settings.telegram.hint')}</p>
            </div>
            <PermissionGate permission={PermissionCode.SETTINGS_UPDATE}>
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                disabled={settingsSaving}
              >
                {settingsSaving && <span className="loading loading-spinner loading-sm" />}
                {t('common.save')}
              </Button>
            </PermissionGate>
          </div>

          {/* Token serverda o'rnatilmagan bo'lsa hech narsa ishlamaydi —
              foydalanuvchi sozlamalarni to'ldirib, nega xabar kelmayotganini
              tushunmay qolmasligi kerak. */}
          {!telegramConfigured && (
            <div className="alert alert-warning mt-4">
              <AlertTriangle className="h-5 w-5" />
              <span>{t('erp.settings.telegram.tokenMissing')}</span>
            </div>
          )}

          <div className="mt-6 max-w-2xl space-y-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
              />
              <span>{t('erp.settings.telegram.enabled')}</span>
            </label>

            <label className="form-control">
              <span className="label-text mb-1">{t('erp.settings.telegram.chatId')}</span>
              <div className="flex gap-2">
                <input
                  className="input input-bordered flex-1"
                  maxLength={64}
                  placeholder="123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleTestTelegram}
                  loading={telegramTesting}
                  disabled={!telegramChatId.trim()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t('erp.settings.telegram.test')}
                </Button>
              </div>
              <span className="mt-1 text-xs text-base-content/60">
                {t('erp.settings.telegram.chatIdHint')}
              </span>
            </label>

            <div>
              <span className="label-text mb-2 block">{t('erp.settings.telegram.events')}</span>
              <div className="flex flex-wrap gap-2">
                {TELEGRAM_EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleTelegramEvent(type)}
                    className={clsx(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      telegramEvents.has(type)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-base-300 text-base-content/70 hover:bg-base-200'
                    )}
                  >
                    {t(`erp.settings.telegram.eventTypes.${type}`)}
                  </button>
                ))}
              </div>
              {/* Qarz ogohlantirishlari ATAYLAB birma-bir yuborilmaydi */}
              <p className="mt-2 text-xs text-base-content/60">
                {t('erp.settings.telegram.debtDigestHint')}
              </p>
            </div>

            {/* ─── Mijozlarning bot orqali ro'yxatdan o'tishi ───
                Yuqoridagi sozlamalar CHIQUVCHI xabarnomalar uchun (do'kon
                egasiga). Bu esa KIRUVCHI yo'nalish: mijoz botga yozadi va
                o'ziga kabinet ochadi. Bir xil bot, lekin mustaqil yoqiladi. */}
            <div className="border-t border-base-200 pt-6">
              <h3 className="font-semibold">{t('erp.settings.telegram.registrationTitle')}</h3>
              <p className="mt-1 text-sm text-base-content/60">
                {t('erp.settings.telegram.registrationHint')}
              </p>

              <label className="mt-4 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={telegramRegistrationEnabled}
                  onChange={(e) => setTelegramRegistrationEnabled(e.target.checked)}
                />
                <span>{t('erp.settings.telegram.registrationEnabled')}</span>
              </label>

              {/* Yoqilganda bot ochiq eshikka aylanadi — buni bilib turib
                  yoqish kerak, shuning uchun ogohlantirish faqat shu holatda. */}
              {telegramRegistrationEnabled && (
                <div className="alert alert-warning mt-3">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">
                    {t('erp.settings.telegram.registrationWarning')}
                  </span>
                </div>
              )}

              <label className="form-control mt-4">
                <span className="label-text mb-1">{t('erp.settings.telegram.botUsername')}</span>
                <input
                  className="input input-bordered"
                  maxLength={64}
                  placeholder="protektor_bot"
                  value={telegramBotUsername}
                  onChange={(e) => setTelegramBotUsername(e.target.value)}
                />
                <span className="mt-1 text-xs text-base-content/60">
                  {t('erp.settings.telegram.botUsernameHint')}
                </span>
              </label>

              <p className="mt-3 text-xs text-base-content/60">
                {t('erp.settings.telegram.modeHint')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="surface-card p-6">
            <h2 className="text-lg font-semibold mb-4">{t('erp.settings.themeTitle')}</h2>
            <p className="text-sm text-base-content/60 mb-6">
              {t('erp.settings.themeSubtitle')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Light Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  themeMode === 'light'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('light')}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center shadow-inner">
                  <Sun className="h-8 w-8 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">{t('erp.settings.themeLight')}</p>
                  <p className="text-xs text-base-content/50">{t('erp.settings.themeLightDesc')}</p>
                </div>
                {themeMode === 'light' && (
                  <span className="badge badge-primary badge-sm">{t('erp.settings.themeSelected')}</span>
                )}
              </button>

              {/* Dark Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  themeMode === 'dark'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('dark')}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-inner">
                  <Moon className="h-8 w-8 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">{t('erp.settings.themeDark')}</p>
                  <p className="text-xs text-base-content/50">{t('erp.settings.themeDarkDesc')}</p>
                </div>
                {themeMode === 'dark' && (
                  <span className="badge badge-primary badge-sm">{t('erp.settings.themeSelected')}</span>
                )}
              </button>

              {/* System Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  themeMode === 'system'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('system')}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center shadow-inner">
                  <Monitor className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">{t('erp.settings.themeSystem')}</p>
                  <p className="text-xs text-base-content/50">{t('erp.settings.themeSystemDesc')}</p>
                </div>
                {themeMode === 'system' && (
                  <span className="badge badge-primary badge-sm">{t('erp.settings.themeSelected')}</span>
                )}
              </button>
            </div>
          </div>

          {/* Storefront rasm ko'rinishi (rasmsiz mahsulotlar) */}
          <div className="surface-card p-6">
            <h2 className="text-lg font-semibold mb-1">{t('erp.settings.imageFallbackTitle')}</h2>
            <p className="text-sm text-base-content/60 mb-6">{t('erp.settings.imageFallbackSubtitle')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  imageFallback === 'SVG'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setImageFallback('SVG')}
              >
                <div className="h-20 w-20 overflow-hidden rounded-xl border border-base-300">
                  <ProductImage alt="SVG" fallback="svg" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">{t('erp.settings.imageFallbackSvg')}</p>
                  <p className="text-xs text-base-content/50">{t('erp.settings.imageFallbackSvgDesc')}</p>
                </div>
                {imageFallback === 'SVG' && (
                  <span className="badge badge-primary badge-sm">{t('erp.settings.themeSelected')}</span>
                )}
              </button>
              <button
                type="button"
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  imageFallback === 'PHOTO'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setImageFallback('PHOTO')}
              >
                <div className="h-20 w-20 overflow-hidden rounded-xl border border-base-300">
                  <ProductImage alt="PHOTO" fallback="photo" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">{t('erp.settings.imageFallbackPhoto')}</p>
                  <p className="text-xs text-base-content/50">{t('erp.settings.imageFallbackPhotoDesc')}</p>
                </div>
                {imageFallback === 'PHOTO' && (
                  <span className="badge badge-primary badge-sm">{t('erp.settings.themeSelected')}</span>
                )}
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={handleSaveSettings} disabled={settingsSaving}>
                {settingsSaving ? <span className="loading loading-spinner loading-sm" /> : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Brands Tab */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('erp.settings.brandsTitle')}</h2>
              <p className="text-sm text-base-content/60">
                {t('erp.settings.brandsCount', { count: brands.length })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButtons
                onExportExcel={() => handleExportBrands('excel')}
                onExportPdf={() => handleExportBrands('pdf')}
                disabled={brands.length === 0}
                loading={brandsLoading}
              />
              <Button variant="primary" onClick={() => handleOpenBrandModal()}>
                <Plus className="h-5 w-5" />
                {t('erp.settings.newBrand')}
              </Button>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            {brandsLoading ? (
              <div className="flex items-center justify-center h-64">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : brands.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
                <Tag className="h-12 w-12" />
                <div>
                  <p className="text-base font-medium">{t('erp.settings.brandsEmptyTitle')}</p>
                  <p className="text-sm">{t('erp.settings.brandsEmptyDesc')}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block table-container">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>{t('erp.settings.colName')}</th>
                        <th>{t('erp.settings.colCountry')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {brands.map((brand) => (
                        <tr key={brand.id}>
                          <td className="font-medium">{brand.name}</td>
                          <td>{brand.country || '—'}</td>
                          <td className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenBrandModal(brand)}
                            >
                              <Pencil className="h-4 w-4" />
                              {t('common.edit')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-error"
                              onClick={() => setDeletingBrand(brand)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('common.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 p-4 lg:hidden">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className="surface-panel flex items-center justify-between gap-3 rounded-xl p-4"
                    >
                      <div>
                        <p className="font-semibold">{brand.name}</p>
                        <p className="text-sm text-base-content/60">
                          {brand.country || t('erp.settings.countryNotSpecified')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenBrandModal(brand)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error"
                          onClick={() => setDeletingBrand(brand)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('erp.settings.categoriesTitle')}</h2>
              <p className="text-sm text-base-content/60">
                {t('erp.settings.categoriesCount', { count: categories.length })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButtons
                onExportExcel={() => handleExportCategories('excel')}
                onExportPdf={() => handleExportCategories('pdf')}
                disabled={categories.length === 0}
                loading={categoriesLoading}
              />
              <Button variant="primary" onClick={() => handleOpenCategoryModal()}>
                <Plus className="h-5 w-5" />
                {t('erp.settings.newCategory')}
              </Button>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            {categoriesLoading ? (
              <div className="flex items-center justify-center h-64">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
                <FolderTree className="h-12 w-12" />
                <div>
                  <p className="text-base font-medium">{t('erp.settings.categoriesEmptyTitle')}</p>
                  <p className="text-sm">{t('erp.settings.categoriesEmptyDesc')}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block table-container">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>{t('erp.settings.colName')}</th>
                        <th>{t('erp.settings.colDescription')}</th>
                        <th>{t('erp.settings.colParentCategory')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td className="font-medium">{category.name}</td>
                          <td className="max-w-xs truncate">
                            {category.description || '—'}
                          </td>
                          <td>{category.parentName || '—'}</td>
                          <td className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCategoryModal(category)}
                            >
                              <Pencil className="h-4 w-4" />
                              {t('common.edit')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-error"
                              onClick={() => setDeletingCategory(category)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('common.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 p-4 lg:hidden">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="surface-panel flex items-center justify-between gap-3 rounded-xl p-4"
                    >
                      <div>
                        <p className="font-semibold">{category.name}</p>
                        <p className="text-sm text-base-content/60">
                          {category.parentName
                            ? t('erp.settings.parentLabel', { name: category.parentName })
                            : t('erp.settings.rootCategory')}
                        </p>
                        {category.description && (
                          <p className="mt-1 text-xs text-base-content/50 line-clamp-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenCategoryModal(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error"
                          onClick={() => setDeletingCategory(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debts Tab */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="surface-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t('erp.settings.debtSettingsTitle')}</h2>
                <p className="text-sm text-base-content/60">
                  {t('erp.settings.debtSettingsSubtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportButtons
                  onExportExcel={() => handleExportSettings('excel')}
                  onExportPdf={() => handleExportSettings('pdf')}
                  disabled={settingsLoading}
                  loading={settingsLoading}
                />
                <PermissionGate permission={PermissionCode.SETTINGS_UPDATE}>
                  <Button
                    variant="primary"
                    onClick={handleSaveSettings}
                    disabled={settingsSaving || settingsLoading}
                  >
                    {settingsSaving && <span className="loading loading-spinner loading-sm" />}
                    {t('common.save')}
                  </Button>
                </PermissionGate>
              </div>
            </div>

            {settingsLoading ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : (
              <div className="mt-6 max-w-sm">
                <NumberInput
                  label={t('erp.settings.debtDueDaysLabel')}
                  value={debtDueDays}
                  onChange={handleDebtDueDaysChange}
                  min={1}
                  max={365}
                  allowEmpty={false}
                />
                <p className="mt-2 text-xs text-base-content/60">
                  {t('erp.settings.debtDueDaysHint')}
                </p>

                <h3 className="mt-8 text-base font-semibold">{t('erp.settings.deliveryTitle')}</h3>
                <p className="mb-4 text-sm text-base-content/60">
                  {t('erp.settings.deliverySubtitle')}
                </p>
                <NumberInput
                  label={t('erp.settings.deliveryFeeLabel')}
                  value={deliveryFee}
                  onChange={handleMoneyChange(setDeliveryFee)}
                  min={0}
                  allowEmpty={false}
                />
                <p className="mt-2 text-xs text-base-content/60">
                  {t('erp.settings.deliveryFeeHint')}
                </p>
                <div className="mt-4">
                  <NumberInput
                    label={t('erp.settings.freeDeliveryThresholdLabel')}
                    value={freeDeliveryThreshold}
                    onChange={handleMoneyChange(setFreeDeliveryThreshold)}
                    min={0}
                    allowEmpty={false}
                  />
                  <p className="mt-2 text-xs text-base-content/60">
                    {t('erp.settings.freeDeliveryThresholdHint')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brand Modal */}
      <ModalPortal isOpen={showBrandModal} onClose={handleCloseBrandModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingBrand ? t('erp.settings.editBrandTitle') : t('erp.settings.newBrand')}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingBrand
                    ? t('erp.settings.editBrandSubtitle')
                    : t('erp.settings.newBrandSubtitle')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseBrandModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {t('erp.settings.nameRequired')}
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t('erp.settings.brandNamePlaceholder')}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {t('erp.settings.colCountry')}
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={brandForm.country}
                  onChange={(e) => setBrandForm((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder={t('erp.settings.countryPlaceholder')}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleCloseBrandModal}
                disabled={brandSaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveBrand}
                disabled={brandSaving || !brandForm.name.trim()}
              >
                {brandSaving && <span className="loading loading-spinner loading-sm" />}
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Category Modal */}
      <ModalPortal isOpen={showCategoryModal} onClose={handleCloseCategoryModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingCategory ? t('erp.settings.editCategoryTitle') : t('erp.settings.newCategory')}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingCategory
                    ? t('erp.settings.editCategorySubtitle')
                    : t('erp.settings.newCategorySubtitle')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseCategoryModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {t('erp.settings.nameRequired')}
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t('erp.settings.categoryNamePlaceholder')}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {t('erp.settings.colDescription')}
                </span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t('erp.settings.categoryDescPlaceholder')}
                />
              </label>

              <Select
                label={t('erp.settings.colParentCategory')}
                value={categoryForm.parentId || undefined}
                onChange={(val) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    parentId: val ? Number(val) : '',
                  }))
                }
                options={[
                  { value: '', label: t('erp.settings.noneParentOption') },
                  ...categories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                ]}
                placeholder={t('erp.settings.selectParentPlaceholder')}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleCloseCategoryModal}
                disabled={categorySaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveCategory}
                disabled={categorySaving || !categoryForm.name.trim()}
              >
                {categorySaving && <span className="loading loading-spinner loading-sm" />}
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Delete Brand Confirmation Modal */}
      <ModalPortal isOpen={!!deletingBrand} onClose={() => setDeletingBrand(null)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl relative">
          <div className="p-4 sm:p-6">
            <Button
              variant="ghost"
              size="sm"
              className="btn-circle absolute right-3 top-3"
              onClick={() => setDeletingBrand(null)}
              disabled={brandDeleting}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                <AlertTriangle className="h-6 w-6 text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('erp.settings.deleteConfirmTitle')}</h3>
                <p className="mt-1 text-sm text-base-content/60">
                  {t('erp.settings.deleteBrandConfirm', { name: deletingBrand?.name })}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeletingBrand(null)}
                disabled={brandDeleting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteBrand}
                disabled={brandDeleting}
              >
                {brandDeleting && <span className="loading loading-spinner loading-sm" />}
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Delete Category Confirmation Modal */}
      <ModalPortal isOpen={!!deletingCategory} onClose={() => setDeletingCategory(null)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl relative">
          <div className="p-4 sm:p-6">
            <Button
              variant="ghost"
              size="sm"
              className="btn-circle absolute right-3 top-3"
              onClick={() => setDeletingCategory(null)}
              disabled={categoryDeleting}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                <AlertTriangle className="h-6 w-6 text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('erp.settings.deleteConfirmTitle')}</h3>
                <p className="mt-1 text-sm text-base-content/60">
                  {t('erp.settings.deleteCategoryConfirm', { name: deletingCategory?.name })}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeletingCategory(null)}
                disabled={categoryDeleting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteCategory}
                disabled={categoryDeleting}
              >
                {categoryDeleting && <span className="loading loading-spinner loading-sm" />}
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Demo cleanup confirmation */}
      <ModalPortal
        isOpen={showDemoDeleteConfirm}
        onClose={() => !demoBusy && setShowDemoDeleteConfirm(false)}
      >
        <div className="relative w-full max-w-md rounded-sheet bg-base-100 shadow-strong">
          <div className="p-5 sm:p-6">
            <Button
              variant="ghost"
              size="sm"
              className="btn-circle absolute right-3 top-3"
              onClick={() => setShowDemoDeleteConfirm(false)}
              disabled={demoBusy}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              {t('erp.settings.demo.removeTitle')}
            </h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              {t('erp.settings.demo.removeHint')}
            </p>
            <div className="mt-4 rounded-card border border-success/20 bg-success/10 p-3 text-sm">
              {t('erp.settings.demo.realDataSafe')}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowDemoDeleteConfirm(false)}
                disabled={demoBusy}
              >
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={handleRemoveDemo} disabled={demoBusy}>
                {demoAction === 'remove' && <span className="loading loading-spinner loading-sm" />}
                {t('erp.settings.demo.removeConfirm')}
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
