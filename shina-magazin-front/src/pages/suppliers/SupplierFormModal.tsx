import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, CreditCard, Mail, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '@/ui';
import { suppliersApi } from '../../api/suppliers.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { queryKeys } from '../../lib/queryKeys';
import { ModalPortal } from '../../components/common/Modal';
import { PhoneInput } from '../../components/ui/PhoneInput';
import type { Supplier, SupplierRequest } from '../../types';

const EMPTY_FORM: SupplierRequest = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  bankDetails: '',
  notes: '',
};

/** Telefon ixtiyoriy, lekin kiritilgan bo'lsa to'liq bo'lishi kerak. */
function isValidPhoneOrEmpty(phone: string): boolean {
  if (!phone || phone.trim() === '') return true;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 12 && cleaned.startsWith('998');
}

function toFormData(supplier: Supplier | null): SupplierRequest {
  if (!supplier) return EMPTY_FORM;
  return {
    name: supplier.name,
    contactPerson: supplier.contactPerson || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    address: supplier.address || '',
    bankDetails: supplier.bankDetails || '',
    notes: supplier.notes || '',
  };
}

interface Props {
  isOpen: boolean;
  /** null = yangi ta'minotchi. */
  supplier: Supplier | null;
  onClose: () => void;
}

/**
 * Ta'minotchi qo'shish/tahrirlash oynasi.
 *
 * <p>Forma holati ATAYLAB ichkarida: `ModalPortal` yopilganda bolalarini
 * unmount qiladi, ya'ni har ochilishda forma o'z-o'zidan tozalanadi. Ilgari
 * buni sahifa qo'lda qilardi (`handleOpenNewModal`/`handleCloseModal` da
 * `setFormData(emptyFormData)`) va bir joyda unutilsa oldingi ta'minotchi
 * ma'lumoti yangi formada qolib ketardi.
 */
export function SupplierFormModal({ isOpen, supplier, onClose }: Props) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <SupplierForm supplier={supplier} onClose={onClose} />
    </ModalPortal>
  );
}

function SupplierForm({ supplier, onClose }: Pick<Props, 'supplier' | 'onClose'>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SupplierRequest>(() => toFormData(supplier));

  const change = (field: keyof SupplierRequest, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const save = useMutation({
    mutationFn: (data: SupplierRequest) =>
      supplier ? suppliersApi.update(supplier.id, data) : suppliersApi.create(data),
    onSuccess: () => {
      // Prefiks bo'yicha: ro'yxat, dropdown va qarz statistikasi birga
      // yangilanadi. Ilgari sahifa uchta yuklovchini QO'LDA chaqirardi va
      // birini unutish oson edi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      onClose();
    },
    onError: (error) => {
      console.error('Failed to save supplier:', error);
      toast.error(getApiErrorMessage(error));
    },
  });

  const saving = save.isPending;
  const canSave =
    !saving && formData.name.trim().length > 0 && isValidPhoneOrEmpty(formData.phone || '');

  const handleSave = () => {
    if (!formData.name.trim()) return;
    save.mutate(formData);
  };

  const labelClass =
    'label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50';
  const sectionTitleClass =
    'text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2';

  return (
    <div className="w-full max-w-2xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">
              {supplier ? t('erp.suppliers.editSupplierTitle') : t('erp.suppliers.newSupplier')}
            </h3>
            <p className="text-sm text-base-content/60">
              {supplier
                ? t('erp.suppliers.editSupplierSubtitle')
                : t('erp.suppliers.newSupplierSubtitle')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="surface-soft rounded-xl p-4">
            <h4 className={sectionTitleClass}>
              <Building2 className="h-4 w-4" />
              {t('erp.suppliers.sectionBasicInfo')}
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="form-control sm:col-span-2">
                <span className={labelClass}>{t('erp.suppliers.fieldSupplierName')}</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={(e) => change('name', e.target.value)}
                  placeholder={t('erp.suppliers.phCompanyName')}
                />
              </label>
              <label className="form-control">
                <span className={labelClass}>{t('erp.suppliers.fieldContactPerson')}</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.contactPerson}
                  onChange={(e) => change('contactPerson', e.target.value)}
                  placeholder={t('erp.suppliers.phFullName')}
                />
              </label>
              <PhoneInput
                label={t('erp.suppliers.fieldPhone')}
                value={formData.phone || ''}
                onChange={(value) => change('phone', value)}
              />
            </div>
          </div>

          <div className="surface-soft rounded-xl p-4">
            <h4 className={sectionTitleClass}>
              <Mail className="h-4 w-4" />
              {t('erp.suppliers.sectionContactInfo')}
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="form-control">
                <span className={labelClass}>{t('erp.suppliers.fieldEmail')}</span>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={formData.email}
                  onChange={(e) => change('email', e.target.value)}
                  placeholder="email@example.com"
                />
              </label>
              <label className="form-control">
                <span className={labelClass}>{t('erp.suppliers.fieldAddress')}</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.address}
                  onChange={(e) => change('address', e.target.value)}
                  placeholder={t('erp.suppliers.phAddress')}
                />
              </label>
            </div>
          </div>

          <div className="surface-soft rounded-xl p-4">
            <h4 className={sectionTitleClass}>
              <CreditCard className="h-4 w-4" />
              {t('erp.suppliers.sectionAdditionalInfo')}
            </h4>
            <div className="space-y-4">
              <label className="form-control">
                <span className={labelClass}>{t('erp.suppliers.fieldBankDetails')}</span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={formData.bankDetails}
                  onChange={(e) => change('bankDetails', e.target.value)}
                  placeholder={t('erp.suppliers.phBankDetails')}
                />
              </label>
              <label className="form-control">
                <span className={labelClass}>{t('erp.suppliers.fieldNotes')}</span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => change('notes', e.target.value)}
                  placeholder={t('erp.suppliers.phNotes')}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            {supplier ? t('common.update') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
