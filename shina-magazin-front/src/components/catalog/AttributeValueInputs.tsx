import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Select } from '../ui/Select';
import type { CategoryAttribute, ProductAttributeValueRequest } from '../../types';

export type AttributeValueMap = Record<number, ProductAttributeValueRequest>;

interface AttributeValueInputsProps {
  attributes: CategoryAttribute[];
  values: AttributeValueMap;
  onChange: (attributeId: number, value: ProductAttributeValueRequest | undefined) => void;
}

/**
 * Kategoriya atributlari bo'yicha dinamik forma maydonlari.
 * SELECT -> tanlov, MULTI_SELECT -> chip'lar, NUMBER -> son (birlik bilan),
 * BOOLEAN -> Ha/Yo'q, TEXT -> matn.
 */
export function AttributeValueInputs({ attributes, values, onChange }: AttributeValueInputsProps) {
  const { t } = useTranslation();

  if (attributes.length === 0) return null;

  const labelFor = (ca: CategoryAttribute) => (
    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
      {ca.attribute.name}
      {ca.attribute.unit ? ` (${ca.attribute.unit})` : ''}
      {ca.required && <span className="text-error"> *</span>}
    </span>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {attributes.map((ca) => {
        const attr = ca.attribute;
        const current = values[attr.id];

        switch (attr.type) {
          case 'SELECT':
            return (
              <Select
                key={attr.id}
                label={`${attr.name}${attr.unit ? ` (${attr.unit})` : ''}${ca.required ? ' *' : ''}`}
                value={current?.optionIds?.[0] ?? ''}
                onChange={(value) =>
                  onChange(
                    attr.id,
                    value ? { attributeId: attr.id, optionIds: [Number(value)] } : undefined
                  )
                }
                placeholder="—"
                options={attr.options.map((o) => ({ value: o.id, label: o.value }))}
              />
            );

          case 'MULTI_SELECT': {
            const selected = new Set(current?.optionIds ?? []);
            return (
              <div key={attr.id} className="form-control sm:col-span-2">
                {labelFor(ca)}
                <div className="flex flex-wrap gap-1.5">
                  {attr.options.map((option) => {
                    const isOn = selected.has(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          const next = new Set(selected);
                          if (isOn) next.delete(option.id);
                          else next.add(option.id);
                          onChange(
                            attr.id,
                            next.size ? { attributeId: attr.id, optionIds: [...next] } : undefined
                          );
                        }}
                        aria-pressed={isOn}
                        className={clsx(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                          isOn
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-base-300 text-base-content/60 hover:border-base-content/30 hover:text-base-content'
                        )}
                      >
                        {option.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          case 'NUMBER':
            return (
              <label key={attr.id} className="form-control">
                {labelFor(ca)}
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={current?.valueNumber ?? ''}
                  onChange={(e) =>
                    onChange(
                      attr.id,
                      e.target.value === ''
                        ? undefined
                        : { attributeId: attr.id, valueNumber: Number(e.target.value) }
                    )
                  }
                  placeholder="0"
                />
              </label>
            );

          case 'BOOLEAN':
            return (
              <Select
                key={attr.id}
                label={`${attr.name}${ca.required ? ' *' : ''}`}
                value={current?.valueBool === undefined ? '' : current.valueBool ? 'yes' : 'no'}
                onChange={(value) =>
                  onChange(
                    attr.id,
                    value === ''
                      ? undefined
                      : { attributeId: attr.id, valueBool: value === 'yes' }
                  )
                }
                placeholder="—"
                options={[
                  { value: 'yes', label: t('common.yes') },
                  { value: 'no', label: t('common.no') },
                ]}
              />
            );

          default: // TEXT
            return (
              <label key={attr.id} className="form-control">
                {labelFor(ca)}
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={current?.valueText ?? ''}
                  onChange={(e) =>
                    onChange(
                      attr.id,
                      e.target.value ? { attributeId: attr.id, valueText: e.target.value } : undefined
                    )
                  }
                />
              </label>
            );
        }
      })}
    </div>
  );
}
