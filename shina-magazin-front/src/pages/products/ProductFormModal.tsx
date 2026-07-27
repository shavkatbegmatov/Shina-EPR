import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Package,
  PackagePlus,
  Warehouse,
  X,
  Upload,
  Image as ImageIcon,
  CircleDollarSign,
  Info,
  Ruler,
  SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import { getApiErrorMessage } from '../../utils/apiError';
import { productsApi, categoriesApi } from '../../api/products.api';
import { SEASONS } from '../../config/constants';
import { NumberInput } from '../../components/ui/NumberInput';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { AttributeValueInputs, type AttributeValueMap } from '../../components/catalog/AttributeValueInputs';
import { flattenCategoryTree, getEffectiveTemplate, indentLabel } from '../../utils/categoryTree';
import { queryKeys } from '../../lib/queryKeys';
import { Button } from '@/ui';
import type {
  Brand,
  Category,
  Product,
  ProductAttributeValue,
  ProductAttributeValueRequest,
  Season,
  ProductRequest,
} from '../../types';

const emptyFormData: ProductRequest = {
  sku: '',
  name: '',
  sellingPrice: 0,
};

/** Modal ichidagi mantiqiy forma bo'limlari uchun yagona vizual ierarxiya. */
function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-base-200 bg-base-100 p-3 shadow-sm">
      <div className="mb-2.5 flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-base-content">{title}</h4>
          {description && <p className="mt-0.5 text-xs leading-5 text-base-content/55">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Mahsulot javobidagi atribut qiymatlarini forma xaritasiga aylantiradi */
function toValueMap(attrs?: ProductAttributeValue[]): AttributeValueMap {
  const map: AttributeValueMap = {};
  attrs?.forEach((v) => {
    map[v.attributeId] = {
      attributeId: v.attributeId,
      optionIds: v.optionIds.length ? v.optionIds : undefined,
      valueText: v.valueText,
      valueNumber: v.valueNumber,
      valueBool: v.valueBool,
    };
  });
  return map;
}

/**
 * Mahsulotni forma qiymatlariga aylantiradi.
 *
 * <p>Zaxira (`quantity`) va tannarx (`purchasePrice`) ATAYLAB yo'q — ular
 * Ombor kirimi va Xaridlar orqali boshqariladi (yagona manba qoidasi).
 */
function toFormData(product: Product): ProductRequest {
  return {
    sku: product.sku,
    name: product.name,
    brandId: product.brandId,
    categoryId: product.categoryId,
    width: product.width,
    profile: product.profile,
    diameter: product.diameter,
    loadIndex: product.loadIndex,
    speedRating: product.speedRating,
    season: product.season,
    sellingPrice: product.sellingPrice,
    minStockLevel: product.minStockLevel,
    description: product.description,
    imageUrl: product.imageUrl,
  };
}

interface ProductFormModalProps {
  /** Tahrirlanayotgan mahsulot — yangi qo'shishda `null`. */
  product: Product | null;
  brands: Brand[];
  categoryTree: Category[];
  onClose: () => void;
}

/**
 * Mahsulot qo'shish/tahrirlash oynasi.
 *
 * <p>Forma holati ATAYLAB shu yerda va sahifa uni SHARTLI render qiladi
 * (`{showModal && <ProductFormModal .../>}`). Shunda oyna yopilganda
 * komponentning o'zi unmount bo'ladi va holat TUZILISHI bilan tozalanadi —
 * sahifa darajasida turganda 6 ta holatni qo'lda tozalash kerak edi va
 * bittasini unutish oldingi mahsulot qiymatini keyingisiga olib o'tardi.
 *
 * <p>`isOpen` propi ATAYLAB yo'q: u bo'lsa komponent doim mount holicha
 * qolib, holat tozalanmasdi — `ModalPortal` faqat O'Z bolalarini yashiradi.
 */
export function ProductFormModal({
  product,
  brands,
  categoryTree,
  onClose,
}: ProductFormModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editingProductId = product?.id ?? null;

  // Zaxira va tannarx formada TAHRIRLANMAYDI, lekin tahrirda o'zgarishsiz
  // qaytariladi — yuborilmasa server ularni bo'shatib yuborardi.
  const editingStock = product?.quantity ?? null;
  const editingCost = product?.purchasePrice;

  const [formData, setFormData] = useState<ProductRequest>(() =>
    product ? toFormData(product) : emptyFormData
  );
  const [attrValues, setAttrValues] = useState<AttributeValueMap>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  /**
   * To'liq mahsulot — ro'yxat javobida atribut QIYMATLARI yo'q.
   *
   * <p>Ular yuklanmasa forma atributlari bo'sh ko'rinib, saqlashda
   * o'chib ketardi.
   */
  const fullProductQuery = useQuery({
    queryKey: queryKeys.products.detail(editingProductId ?? 0),
    queryFn: () => productsApi.getById(editingProductId as number),
    enabled: editingProductId !== null,
  });

  // Qiymatlar KELGANDA ko'chiriladi: har renderda ko'chirilsa
  // foydalanuvchi kiritayotgan qiymat ustiga yozib yuborilardi.
  useEffect(() => {
    if (fullProductQuery.data) {
      setAttrValues(toValueMap(fullProductQuery.data.attributes));
    }
  }, [fullProductQuery.data]);

  const categoryOptions = useMemo(
    () =>
      flattenCategoryTree(categoryTree).map((c) => ({
        value: c.id,
        label: indentLabel(c.name, c.depth),
      })),
    [categoryTree]
  );

  /**
   * Kategoriyaning meros bilan hisoblangan atributlari.
   *
   * <p>Kategoriya o'zgarsa so'rov O'Z-O'ZIDAN qaytadan ketadi — u
   * `formData.categoryId` ga kalitlangan, ya'ni chaqirishni unutib
   * bo'lmaydi.
   */
  const formAttributesQuery = useQuery({
    queryKey: queryKeys.categories.attributes(formData.categoryId ?? 0),
    queryFn: () => categoriesApi.getAttributes(formData.categoryId as number),
    enabled: !!formData.categoryId,
  });
  const formAttributes = useMemo(
    () => formAttributesQuery.data ?? [],
    [formAttributesQuery.data]
  );

  // Formada tanlangan kategoriyaning shabloni: TIRE bo'lsagina shina
  // o'lcham maydonlari ko'rinadi — universal magazin (WB) yondashuvi
  const isTireForm = getEffectiveTemplate(categoryTree, formData.categoryId) === 'TIRE';
  const isProductFormValid =
    formData.sku.trim().length > 0 &&
    formData.name.trim().length > 0 &&
    formData.sellingPrice > 0;

  const handleFormChange = (field: keyof ProductRequest, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAttrValueChange = (attributeId: number, value?: ProductAttributeValueRequest) => {
    setAttrValues((prev) => {
      const next = { ...prev };
      if (value) next[attributeId] = value;
      else delete next[attributeId];
      return next;
    });
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const url = await productsApi.uploadImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
      toast.success(t('erp.products.imageUploadSuccess'));
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error(t('erp.products.imageUploadError'));
    } finally {
      setUploadingImage(false);
    }
  };

  const save = useMutation({
    mutationFn: (payload: ProductRequest) =>
      editingProductId
        ? productsApi.update(editingProductId, payload)
        : productsApi.create(payload),
    onSuccess: () => {
      // Prefiks bo'yicha: barcha filtr/sahifa kombinatsiyalari eskiradi
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      onClose();
    },
    onError: (error) => {
      console.error('Failed to save product:', error);
      toast.error(getApiErrorMessage(error));
    },
  });
  const saving = save.isPending;

  const handleSaveProduct = () => {
    if (!formData.sku.trim() || !formData.name.trim() || formData.sellingPrice <= 0) {
      return;
    }

    // Majburiy atributlar tekshiruvi
    const missing = formAttributes.filter((ca) => ca.required && !attrValues[ca.attribute.id]);
    if (missing.length > 0) {
      toast.error(
        t('erp.products.attrRequired', { names: missing.map((ca) => ca.attribute.name).join(', ') })
      );
      return;
    }

    // Faqat joriy kategoriya (effektiv) atributlariga tegishli qiymatlar yuboriladi
    const allowedIds = new Set(formAttributes.map((ca) => ca.attribute.id));
    const attributes = Object.values(attrValues).filter((v) => allowedIds.has(v.attributeId));

    const payload: ProductRequest = { ...formData, attributes };
    // Zaxira va tannarx formada TAHRIRLANMAYDI (Ombor/Xaridlar boshqaradi).
    // Tahrirda joriy qiymatlar o'zgarishsiz qaytariladi (backendlar aro
    // moslik), yangi mahsulot esa 0 zaxira bilan boshlanadi.
    payload.quantity = editingProductId ? editingStock ?? undefined : undefined;
    payload.purchasePrice = editingProductId ? editingCost : undefined;
    if (!isTireForm) {
      // Universal mahsulot: shina maydonlari yuborilmaydi (kategoriya
      // almashtirilganda eski shina qiymatlari ham tozalanadi)
      payload.width = undefined;
      payload.profile = undefined;
      payload.diameter = undefined;
      payload.loadIndex = undefined;
      payload.speedRating = undefined;
      payload.season = undefined;
    }
    save.mutate(payload);
  };

  return (
    <ModalPortal isOpen onClose={onClose}>
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden rounded-2xl bg-base-100 shadow-strong animate-fade-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
      >
        {/* Sarlavha — kontent aylanganda ham tepada qoladi */}
        <div className="shrink-0 border-b border-base-200 bg-base-100 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <PackagePlus className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 id="product-form-title" className="text-xl font-semibold">{editingProductId ? t('erp.products.editTitle') : t('erp.products.newProduct')}</h3>
                <p className="mt-0.5 text-sm text-base-content/60">{editingProductId ? t('erp.products.editSubtitle') : t('erp.products.newSubtitle')}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" iconOnly className="shrink-0" onClick={onClose} aria-label={t('common.close')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            handleSaveProduct();
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-base-200/30 p-3">
            <div className="space-y-2.5">
            {/* 1. Asosiy ma'lumotlar */}
            <FormSection title={t('erp.products.sectionMain')} icon={<Package className="h-4 w-4" />}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <label className="form-control sm:col-span-4 lg:col-span-3">
                  <span className="form-label">SKU <span className="text-error">*</span></span>
                  <input type="text" name="sku" className="input input-bordered w-full" value={formData.sku} onChange={(e) => handleFormChange('sku', e.target.value)} placeholder="SH-001" required autoFocus={!editingProductId} />
                </label>
                <label className="form-control sm:col-span-8 lg:col-span-4">
                  <span className="form-label">{t('erp.products.fieldName')} <span className="text-error">*</span></span>
                  <input type="text" name="productName" className="input input-bordered w-full" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} placeholder="Michelin Pilot Sport 5" required />
                </label>
                <Select
                  className="sm:col-span-6 lg:col-span-2"
                  label={t('erp.products.colBrand')}
                  value={formData.brandId || ''}
                  onChange={(value) => handleFormChange('brandId', value ? Number(value) : undefined)}
                  placeholder={t('erp.products.selectPlaceholder')}
                  options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
                />
                <Select
                  className="sm:col-span-6 lg:col-span-3"
                  label={t('erp.products.category')}
                  value={formData.categoryId || ''}
                  onChange={(value) => handleFormChange('categoryId', value ? Number(value) : undefined)}
                  placeholder={t('erp.products.selectPlaceholder')}
                  options={categoryOptions}
                />
              </div>
            </FormSection>
            {/* 2. Shina o'lchamlari — faqat TIRE shablonli kategoriyada (universal magazin) */}
            {isTireForm && (
              <FormSection title={t('erp.products.sectionTire')} icon={<Ruler className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <NumberInput label={t('erp.products.fieldWidth')} value={formData.width ?? ''} onChange={(val) => handleFormChange('width', val === '' ? undefined : Number(val))} placeholder="205" showButtons={false} min={100} max={400} />
                  <NumberInput label={t('erp.products.fieldProfile')} value={formData.profile ?? ''} onChange={(val) => handleFormChange('profile', val === '' ? undefined : Number(val))} placeholder="55" showButtons={false} min={10} max={100} />
                  <NumberInput label={t('erp.products.fieldDiameter')} value={formData.diameter ?? ''} onChange={(val) => handleFormChange('diameter', val === '' ? undefined : Number(val))} placeholder="16" showButtons={false} min={10} max={30} />
                  <label className="form-control">
                    <span className="form-label">{t('erp.products.fieldLoadIndex')}</span>
                    <input type="text" className="input input-bordered w-full" value={formData.loadIndex || ''} onChange={(e) => handleFormChange('loadIndex', e.target.value || undefined)} placeholder="91" />
                  </label>
                  <label className="form-control">
                    <span className="form-label">{t('erp.products.fieldSpeed')}</span>
                    <input type="text" className="input input-bordered w-full" value={formData.speedRating || ''} onChange={(e) => handleFormChange('speedRating', e.target.value || undefined)} placeholder="V" />
                  </label>
                  <Select
                    label={t('erp.products.colSeason')}
                    value={formData.season || ''}
                    onChange={(value) => handleFormChange('season', value as Season || undefined)}
                    placeholder="—"
                    options={Object.entries(SEASONS).map(([key, { label }]) => ({ value: key, label }))}
                  />
                </div>
              </FormSection>
            )}

            {/* 3. Kategoriya xususiyatlari (dinamik, merosi bilan) */}
            {formData.categoryId && formAttributes.length > 0 && (
              <FormSection
                title={t('erp.products.attributesSection')}
                description={t('erp.products.attributesSectionHint')}
                icon={<SlidersHorizontal className="h-4 w-4" />}
              >
                <AttributeValueInputs
                  attributes={formAttributes}
                  values={attrValues}
                  onChange={handleAttrValueChange}
                />
              </FormSection>
            )}
            {/* 4. Narx va zaxira siyosati — zaxira/tannarx Ombor va Xaridlar orqali */}
            <FormSection title={t('erp.products.sectionPricing')} icon={<CircleDollarSign className="h-4 w-4" />}>
              <div className="space-y-3">
                <div className={clsx('grid grid-cols-1 gap-3', editingProductId ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                  <CurrencyInput label={t('erp.products.fieldSellingPrice')} value={formData.sellingPrice ?? 0} onChange={(val) => handleFormChange('sellingPrice', val)} min={0} required />
                  <NumberInput label={t('erp.products.fieldMinStock')} value={formData.minStockLevel ?? ''} onChange={(val) => handleFormChange('minStockLevel', val === '' ? undefined : Number(val))} placeholder="5" min={0} />
                  {editingProductId && (
                    <div className="form-control">
                      <span className="form-label">
                        {t('erp.products.currentStock')}
                      </span>
                      <div className="flex h-12 items-center gap-2 rounded-xl border border-base-300 bg-base-200/50 px-3">
                        <Warehouse className="h-4 w-4 shrink-0 text-base-content/40" />
                        <span className="font-semibold">{editingStock ?? 0}</span>
                        <span className="text-xs text-base-content/50">{t('erp.products.stockUnit')}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/10 p-2 text-xs leading-5 text-base-content/65">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <p>{editingProductId ? t('erp.products.stockManagedHint') : t('erp.products.newStockHint')}</p>
                </div>
              </div>
            </FormSection>

            {/* 5. Tavsif va rasm */}
            <FormSection title={t('erp.products.sectionMedia')} icon={<ImageIcon className="h-4 w-4" />}>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <label className="form-control">
                  <span className="form-label">{t('erp.products.fieldDescription')}</span>
                  <textarea className="textarea textarea-bordered min-h-20 w-full resize-y" value={formData.description || ''} onChange={(e) => handleFormChange('description', e.target.value || undefined)} placeholder={t('erp.products.descriptionPlaceholder')} />
                </label>

                <div className="form-control min-w-0">
                  <span className="form-label">{t('erp.products.fieldImageUrl')}</span>
                  <div className="flex items-start gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleImageUpload(f);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-base-300 bg-base-200/40 transition hover:border-primary hover:bg-primary/5 focus-visible:border-primary disabled:cursor-wait"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      aria-label={t('erp.products.uploadImage')}
                    >
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <span className="flex flex-col items-center gap-1.5 px-2 text-xs text-base-content/50">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-base-200 text-base-content/40 transition group-hover:bg-primary/10 group-hover:text-primary">
                            {uploadingImage ? <span className="loading loading-spinner loading-sm" /> : <Upload className="h-4 w-4" />}
                          </span>
                          {t('erp.products.uploadImage')}
                        </span>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <input
                        type="url"
                        className="input input-bordered w-full"
                        value={formData.imageUrl || ''}
                        onChange={(e) => handleFormChange('imageUrl', e.target.value || undefined)}
                        placeholder="https://..."
                        aria-label={t('erp.products.fieldImageUrl')}
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="min-w-0 text-xs leading-4 text-base-content/45">{t('erp.products.imageUploadHint')}</span>
                        {formData.imageUrl && (
                          <Button type="button" variant="ghost" size="sm" iconOnly className="shrink-0 text-error" onClick={() => handleFormChange('imageUrl', undefined)} aria-label={t('erp.products.imageRemove')}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>
            </div>

          </div>
          {/* Amallar paneli — uzun formada ham doim ko'rinib turadi */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-base-200 bg-base-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-base-content/50">
              <span className="font-semibold text-error">*</span> {t('erp.products.requiredFieldsHint')}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
              <Button type="submit" variant="primary" loading={saving} disabled={!isProductFormValid}>{t('common.save')}</Button>
            </div>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
