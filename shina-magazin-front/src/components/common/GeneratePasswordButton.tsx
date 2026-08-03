import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/ui';
import { generateSecurePassword } from '@/security/passwordPolicy';

interface GeneratePasswordButtonProps {
  onGenerate: (password: string) => void;
  disabled?: boolean;
}

export function GeneratePasswordButton({ onGenerate, disabled = false }: GeneratePasswordButtonProps) {
  const { t } = useTranslation();

  const handleGenerate = () => {
    try {
      const password = generateSecurePassword();
      onGenerate(password);
      toast.success(t('erp.passwordPolicy.generatedToast'));
    } catch {
      toast.error(t('erp.passwordPolicy.generateError'));
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full gap-2 sm:w-auto"
      onClick={handleGenerate}
      disabled={disabled}
      title={t('erp.passwordPolicy.generate')}
    >
      <Wand2 className="h-4 w-4" />
      {t('erp.passwordPolicy.generate')}
    </Button>
  );
}
