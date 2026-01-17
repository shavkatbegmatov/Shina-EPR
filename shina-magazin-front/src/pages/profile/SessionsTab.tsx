import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  LogOut,
  AlertTriangle,
  Loader2,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionsApi, type Session } from '../../api/sessions.api';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';

export function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await sessionsApi.getActiveSessions();
      setSessions(data);
    } catch (error: any) {
      // If 401 Unauthorized, the session was revoked from another device
      if (error?.response?.status === 401) {
        toast.error('Sessioningiz boshqa qurilmadan yopilgan. Qayta kiring.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      } else {
        toast.error('Sessiyalarni yuklashda xatolik');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    if (!confirm('Ushbu qurilmadan chiqmoqchimisiz?')) return;

    setRevokingId(sessionId);
    try {
      await sessionsApi.revokeSession(sessionId, 'Foydalanuvchi tomonidan tugatildi');
      toast.success('Session tugatildi');
      fetchSessions();
    } catch (error: any) {
      // If 401, session was already revoked or user logged out
      if (error?.response?.status === 401) {
        toast.error('Sessioningiz yaroqsiz. Qayta kiring.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      } else {
        toast.error('Sessionni tugatishda xatolik');
      }
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('Boshqa barcha qurilmalardan chiqmoqchimisiz?')) return;

    setRevokingAll(true);
    try {
      const result = await sessionsApi.revokeAllOtherSessions();
      toast.success(`${result.revokedCount} ta session tugatildi`);
      fetchSessions();
    } catch (error: any) {
      // If 401, session was already revoked or user logged out
      if (error?.response?.status === 401) {
        toast.error('Sessioningiz yaroqsiz. Qayta kiring.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      } else {
        toast.error('Sessiyalarni tugatishda xatolik');
      }
    } finally {
      setRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: uz,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Faol sessiyalar</h3>
          <p className="text-sm text-base-content/60 mt-1">
            Barcha kirish sessiyalarini boshqaring va xavfsizligingizni ta'minlang
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchSessions}
            disabled={loading}
            title="Yangilash"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
          {otherSessions.length > 0 && (
            <button
              className="btn btn-error btn-sm"
              onClick={handleRevokeAllOthers}
              disabled={revokingAll}
            >
              {revokingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Tugatilmoqda...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Barchasidan chiqish
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Current Session */}
      {currentSession && (
        <div className="surface-card p-6 border-2 border-success">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 rounded-xl bg-success/10">
                {getDeviceIcon(currentSession.deviceType)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">
                    {currentSession.browser} - {currentSession.os}
                  </h4>
                  <span className="badge badge-success badge-sm gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Hozirgi session
                  </span>
                </div>
                <p className="text-sm text-base-content/60 mt-1">
                  {currentSession.deviceType}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-base-content/50">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {currentSession.ipAddress}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Kirish: {formatTimeAgo(currentSession.createdAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Faollik: {formatTimeAgo(currentSession.lastActivityAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-base-content/70">
            Boshqa qurilmalar ({otherSessions.length})
          </h4>
          {otherSessions.map((session) => (
            <div key={session.id} className="surface-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 rounded-xl bg-primary/10">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">
                      {session.browser} - {session.os}
                    </h4>
                    <p className="text-sm text-base-content/60 mt-1">
                      {session.deviceType}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-base-content/50">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.ipAddress}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Kirish: {formatTimeAgo(session.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Faollik: {formatTimeAgo(session.lastActivityAt)}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revokingId === session.id}
                >
                  {revokingId === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      Chiqish
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-card p-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-base-content/30" />
          <h4 className="text-lg font-semibold mt-4">Boshqa sessiyalar yo'q</h4>
          <p className="text-sm text-base-content/60 mt-2">
            Faqat hozirgi qurilmadan kirilgan
          </p>
        </div>
      )}

      {/* Security Notice */}
      <div className="alert alert-info">
        <AlertTriangle className="h-5 w-5" />
        <div className="text-sm">
          <p className="font-semibold">Xavfsizlik eslatmasi</p>
          <p className="mt-1">
            Agar noma'lum qurilmalarni ko'rsangiz, darhol barchasidan chiqing va
            parolingizni o'zgartiring.
          </p>
        </div>
      </div>
    </div>
  );
}
