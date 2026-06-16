import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const { t } = useTranslation();
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-base-200 text-base-content/60">
        <Construction className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-base-content/60">
        {description || t('erp.ui.comingSoon')}
      </p>
    </div>
  );
}
