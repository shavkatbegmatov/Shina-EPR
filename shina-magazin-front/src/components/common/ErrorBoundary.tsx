import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button, Card, buttonVariants } from '@/ui';

/**
 * React render xatolarini ushlab, oq ekran o'rniga tiklanadigan holat ko'rsatadi.
 *
 * <p>Ilgari butun kod bazasida bitta ham xato chegarasi yo'q edi (`ErrorBoundary`,
 * `componentDidCatch`, `errorElement` — 0 ta). React 16+ da ushlanmagan render
 * xatosi butun daraxtni yechib tashlaydi, ya'ni bitta komponentdagi
 * `undefined.map(...)` operatorga OQ EKRAN berardi — na xabar, na tiklanish yo'li,
 * faqat brauzerni yangilash qoladi.
 *
 * <p>Chegara layout ichida, `<Outlet />` atrofida turadi: sidebar va header
 * saqlanib qoladi, faqat kontent maydoni xato holatiga o'tadi — foydalanuvchi
 * boshqa bo'limga o'ta oladi.
 *
 * @see RouteErrorElement layout'ning o'zi yiqilgan holat uchun (React Router)
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Bu qiymatlardan biri o'zgarsa chegara o'zini tiklaydi.
   * Odatda `location.pathname` uzatiladi — aks holda bir marta yiqilgan chegara
   * boshqa sahifaga o'tilganda ham xatoni ko'rsatishda davom etardi.
   */
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Xato reporting servisi ulanmagan — hech bo'lmasa konsolda to'liq qolsin.
    console.error('ErrorBoundary ushladi:', error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (!this.state.error) return;
    if (!hasSameKeys(prev.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

function hasSameKeys(a?: unknown[], b?: unknown[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, i) => Object.is(value, b[i]));
}

interface ErrorFallbackProps {
  error: unknown;
  /** Berilsa "Qayta urinish" tugmasi chiqadi (chegarani tiklaydi). */
  onRetry?: () => void;
}

/**
 * Xato holatining ko'rinishi. Alohida funksional komponent, chunki class
 * komponentda hook (`useTranslation`) ishlatib bo'lmaydi.
 */
export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-error/10 text-error">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-lg font-semibold">{t('common.errorBoundary.title')}</h1>
        <p className="mt-2 text-sm text-base-content/60">
          {t('common.errorBoundary.description')}
        </p>

        {/* Xato matni faqat DEV'da: productionda ichki tafsilotlar oshkor qilinmaydi */}
        {import.meta.env.DEV && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-base-200 p-3 text-left text-xs text-base-content/70">
            {formatError(error)}
          </pre>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          )}
          <Button variant="ghost" onClick={() => window.location.reload()}>
            {t('common.errorBoundary.reload')}
          </Button>
          <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
            <Home className="mr-2 h-4 w-4" />
            {t('common.errorBoundary.home')}
          </Link>
        </div>
      </Card>
    </div>
  );
}

/**
 * React Router `errorElement` uchun.
 *
 * <p>`ErrorBoundary`dan farqi: bu router darajasida ishlaydi va layout'ning
 * O'ZI yiqilgan holatni ham qamrab oladi (masalan lazy chunk yuklanmasa yoki
 * layout render'ida xato bo'lsa). Bunday holatda "qayta urinish" mumkin emas —
 * daraxt umuman qurilmagan, shuning uchun faqat yangilash/bosh sahifa qoladi.
 */
export function RouteErrorElement() {
  const error = useRouteError();
  return <ErrorFallback error={error} />;
}

function formatError(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}\n${JSON.stringify(error.data, null, 2)}`;
  }
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }
  return String(error);
}
