import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Package, Truck, ExternalLink, Check } from 'lucide-react';
import clsx from 'clsx';

import { Modal } from '../common/Modal';
import { SearchInput } from '../ui/SearchInput';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { warehouseApi } from '../../api/warehouse.api';
import { productsApi } from '../../api/products.api';
import { suppliersApi } from '../../api/suppliers.api';
import { formatCurrency } from '../../config/constants';
import type { Product, Supplier } from '../../types';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function IncomeModal({ isOpen, onClose, onSuccess }: IncomeModalProps) {
  const navigate = useNavigate();

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number | string>('');
  const [notes, setNotes] = useState('');

  // Supplier related state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>(undefined);
  const [unitPrice, setUnitPrice] = useState(0);

  // Product search state
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Dropdown positioning
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ product?: string; quantity?: string }>({});

  // Calculate total
  const numericQuantity = typeof quantity === 'number' ? quantity : parseInt(String(quantity)) || 0;
  const totalAmount = unitPrice * numericQuantity;

  // Load suppliers on mount
  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  const loadSuppliers = async () => {
    try {
      const data = await suppliersApi.getActive();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProduct(null);
      setQuantity('');
      setNotes('');
      setSelectedSupplierId(undefined);
      setUnitPrice(0);
      setProductSearch('');
      setSearchResults([]);
      setShowDropdown(false);
      setErrors({});
    }
  }, [isOpen]);

  // Update dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (searchContainerRef.current && showDropdown) {
      const rect = searchContainerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [showDropdown, updateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Search products
  const handleSearchProducts = useCallback(async (query: string) => {
    setProductSearch(query);

    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    setShowDropdown(true);

    try {
      const data = await productsApi.getAll({ search: query, size: 10 });
      setSearchResults(data.content);
    } catch (error) {
      console.error('Failed to search products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Select product
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch('');
    setSearchResults([]);
    setShowDropdown(false);
    setErrors((prev) => ({ ...prev, product: undefined }));
  };

  // Clear selected product
  const handleClearProduct = () => {
    setSelectedProduct(null);
    setProductSearch('');
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { product?: string; quantity?: string } = {};

    if (!selectedProduct) {
      newErrors.product = 'Mahsulot tanlash shart';
    }

    const qty = typeof quantity === 'number' ? quantity : parseInt(String(quantity));
    if (!qty || qty <= 0) {
      newErrors.quantity = "Miqdor 0 dan katta bo'lishi kerak";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm() || !selectedProduct) return;

    setSubmitting(true);
    try {
      await warehouseApi.createAdjustment({
        productId: selectedProduct.id,
        movementType: 'IN',
        quantity: numericQuantity,
        notes: notes || undefined,
        supplierId: selectedSupplierId,
        unitPrice: unitPrice > 0 ? unitPrice : undefined,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to create income:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Product dropdown portal
  const renderDropdown = () => {
    if (!showDropdown) return null;

    const content = (
      <div
        ref={dropdownRef}
        className="fixed z-[10000] bg-base-100 border border-base-300 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        {searchLoading ? (
          <div className="flex items-center justify-center py-4">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : searchResults.length > 0 ? (
          searchResults.map((product) => (
            <button
              key={product.id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-base-200 transition-colors border-b border-base-200 last:border-b-0"
              onClick={() => handleSelectProduct(product)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-sm text-base-content/60">
                    SKU: {product.sku}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm font-semibold">{product.quantity}</p>
                  <p className="text-xs text-base-content/50">zaxira</p>
                </div>
              </div>
            </button>
          ))
        ) : productSearch.length >= 2 ? (
          <div className="px-4 py-3 text-sm text-base-content/60 text-center">
            Mahsulot topilmadi
          </div>
        ) : null}
      </div>
    );

    return createPortal(content, document.body);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kirim qo'shish"
      subtitle="Omborga yangi mahsulot kirimi"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Product Selection */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Mahsulot *
            </span>
          </div>

          {selectedProduct ? (
            <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-xl border border-base-300">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-base-content/60">
                  SKU: {selectedProduct.sku} | Hozirgi zaxira:{' '}
                  <span className="font-semibold">{selectedProduct.quantity}</span>
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle ml-2"
                onClick={handleClearProduct}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div ref={searchContainerRef}>
              <SearchInput
                value={productSearch}
                onValueChange={handleSearchProducts}
                placeholder="Mahsulot qidirish..."
                onClear={() => handleSearchProducts('')}
                hideLabel
                inputProps={{
                  onFocus: () => {
                    if (searchResults.length > 0) {
                      setShowDropdown(true);
                    }
                  },
                }}
              />
              {errors.product && (
                <p className="text-error text-sm mt-1">{errors.product}</p>
              )}
              {renderDropdown()}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div>
          <NumberInput
            label="Miqdor *"
            value={quantity}
            onChange={setQuantity}
            min={1}
            placeholder="0"
            size="md"
          />
          {errors.quantity && (
            <p className="text-error text-sm mt-1">{errors.quantity}</p>
          )}
        </div>

        {/* Supplier Section */}
        <div className="surface-soft rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-base-content/60" />
            <span className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60">
              Ta'minotchi (ixtiyoriy)
            </span>
          </div>

          <div className="flex gap-2">
            <Select
              value={selectedSupplierId}
              onChange={(val) => setSelectedSupplierId(val ? Number(val) : undefined)}
              options={[
                { value: '', label: "Ta'minotchisiz" },
                ...suppliers.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
              placeholder="Ta'minotchi tanlang"
              className="flex-1"
            />
            <button
              type="button"
              className="btn btn-outline btn-sm h-12"
              onClick={() => navigate('/suppliers')}
              title="Yangi ta'minotchi qo'shish"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

          {selectedSupplierId && (
            <div className="grid grid-cols-2 gap-4">
              <CurrencyInput
                label="Birlik narxi"
                value={unitPrice}
                onChange={setUnitPrice}
                min={0}
                placeholder="0"
                size="md"
              />

              <div className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Jami summa
                </span>
                <div className="h-12 flex items-center px-4 rounded-xl bg-success/10 border border-success/30">
                  <span className="text-lg font-bold text-success">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="form-control">
          <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
            Izoh
          </span>
          <textarea
            className="textarea textarea-bordered rounded-xl w-full resize-none"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Qo'shimcha ma'lumot..."
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-base-200">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Bekor qilish
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleSubmit}
            disabled={submitting || !selectedProduct || !numericQuantity}
          >
            {submitting && <span className="loading loading-spinner loading-sm" />}
            <Check className="h-4 w-4" />
            Qo'shish
          </button>
        </div>
      </div>
    </Modal>
  );
}
