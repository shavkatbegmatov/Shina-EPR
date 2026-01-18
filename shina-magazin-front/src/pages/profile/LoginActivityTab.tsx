import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Calendar, MapPin, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginActivityApi, type LoginAttempt } from '../../api/login-activity.api';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';

export function LoginActivityTab() {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    fetchLoginHistory();
  }, [currentPage]);

  const fetchLoginHistory = async () => {
    setLoading(true);
    try {
      const data = await loginActivityApi.getMyLoginHistory(currentPage, 20);
      setAttempts(data.content);
      setTotalPages(data.totalPages);
    } catch (error) {
      toast.error('Kirish tarixini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (attempt: LoginAttempt) => {
    if (attempt.status === 'SUCCESS') {
      return (
        <span className="badge badge-success gap-1">
          <CheckCircle className="h-3 w-3" />
          Muvaffaqiyatli
        </span>
      );
    }
    return (
      <span className="badge badge-error gap-1">
        <XCircle className="h-3 w-3" />
        Xato
      </span>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: uz,
    });
  };

  if (loading && currentPage === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold">Kirish tarixi</h3>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Barcha kirish urinishlaringiz tarixi (muvaffaqiyatli va xato)
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm w-full sm:w-auto"
          onClick={fetchLoginHistory}
          disabled={loading}
          title="Yangilash"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Yangilash
        </button>
      </div>

      {/* Login attempts list */}
      {attempts.length > 0 ? (
        <div className="space-y-3">
          {attempts.map((attempt) => (
            <div key={attempt.id} className="surface-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${
                    attempt.status === 'SUCCESS' ? 'bg-success/10' : 'bg-error/10'
                  }`}>
                    {attempt.status === 'SUCCESS' ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-error" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                        {attempt.browser} - {attempt.os}
                      </h4>
                      {getStatusBadge(attempt)}
                    </div>
                    <p className="text-sm text-base-content/60 mt-1">
                      {attempt.deviceType}
                    </p>
                    {attempt.failureReason && (
                      <p className="text-xs text-error mt-1">
                        Sabab: {attempt.failureReason}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs text-base-content/50">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="break-all text-xs">{attempt.ipAddress}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="text-xs">{formatTimeAgo(attempt.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-card p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-base-content/30" />
          <h4 className="text-lg font-semibold mt-4">Kirish tarixi topilmadi</h4>
          <p className="text-sm text-base-content/60 mt-2">
            Hozircha kirish urinishlari yo'q
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0 || loading}
          >
            Oldingi
          </button>
          <span className="btn btn-sm btn-ghost">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1 || loading}
          >
            Keyingi
          </button>
        </div>
      )}

      {/* Security notice */}
      <div className="alert alert-info">
        <Shield className="h-5 w-5" />
        <div className="text-sm">
          <p className="font-semibold">Xavfsizlik eslatmasi</p>
          <p className="mt-1">
            Agar noma'lum IP manzillardan kirish urinishlarini ko'rsangiz,
            darhol parolingizni o'zgartiring va xavfsizlik bo'limiga xabar bering.
          </p>
        </div>
      </div>
    </div>
  );
}
