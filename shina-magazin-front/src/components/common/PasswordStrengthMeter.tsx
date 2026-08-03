import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { cn } from '@/ui';
import { evaluatePassword, PASSWORD_MIN_LENGTH } from '@/security/passwordPolicy';
import type { PasswordRequirementCode } from '@/security/passwordPolicy';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

const requirementLabelKeys: Record<PasswordRequirementCode, string> = {
  minLength: 'erp.passwordPolicy.reqMinLength',
  uppercase: 'erp.passwordPolicy.reqUppercase',
  lowercase: 'erp.passwordPolicy.reqLowercase',
  number: 'erp.passwordPolicy.reqNumber',
  symbol: 'erp.passwordPolicy.reqSymbol',
  noSpaces: 'erp.passwordPolicy.reqNoSpaces',
};

function getStrengthTone(score: number, maxScore: number) {
  const ratio = maxScore === 0 ? 0 : score / maxScore;
  if (ratio < 0.35) return { bar: 'bg-error', text: 'text-error', labelKey: 'erp.passwordPolicy.strengthVeryWeak' };
  if (ratio < 0.7) return { bar: 'bg-warning', text: 'text-warning', labelKey: 'erp.passwordPolicy.strengthWeak' };
  if (ratio < 1) return { bar: 'bg-info', text: 'text-info', labelKey: 'erp.passwordPolicy.strengthGood' };
  return { bar: 'bg-success', text: 'text-success', labelKey: 'erp.passwordPolicy.strengthStrong' };
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { t } = useTranslation();
  const evaluation = useMemo(() => evaluatePassword(password), [password]);
  const tone = getStrengthTone(evaluation.score, evaluation.maxScore);

  if (!password) return null;

  return (
    <div className={cn('space-y-3 rounded-card bg-base-200/50 p-4', className)}>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-base-300">
          <div
            className={cn('h-full transition-all duration-300', tone.bar)}
            style={{ width: `${(evaluation.score / evaluation.maxScore) * 100}%` }}
          />
        </div>
        <span className={cn('text-xs font-medium', tone.text)}>{t(tone.labelKey)}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {evaluation.requirements.map((requirement) => (
          <div
            key={requirement.code}
            className={cn(
              'flex min-w-0 items-center gap-2 text-sm',
              requirement.met ? 'text-success' : 'text-base-content/50',
            )}
          >
            {requirement.met ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
            <span className="min-w-0">
              {t(requirementLabelKeys[requirement.code], { count: requirement.minLength ?? PASSWORD_MIN_LENGTH })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
