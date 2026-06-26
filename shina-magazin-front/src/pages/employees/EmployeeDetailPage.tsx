import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserCircle,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  Shield,
  AlertCircle,
  UserCog,
  Heart,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/ui';
import { employeesApi } from '../../api/employees.api';
import { formatCurrency, formatDate } from '../../config/constants';
import type { Employee } from '../../types';

export function EmployeeDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEmployee = useCallback(async () => {
    if (!id) return;
    try {
      const data = await employeesApi.getById(Number(id));
      setEmployee(data);
    } catch (error) {
      console.error('Failed to load employee:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadEmployee();
  }, [loadEmployee]);

  // Status label helper
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return t('erp.employeeDetail.statusActive');
      case 'ON_LEAVE':
        return t('erp.employeeDetail.statusOnLeave');
      case 'TERMINATED':
        return t('erp.employeeDetail.statusTerminated');
      default:
        return '—';
    }
  };

  // Status badge style
  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'badge-success';
      case 'ON_LEAVE':
        return 'badge-warning';
      case 'TERMINATED':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
        <h2 className="text-xl font-semibold">{t('erp.employeeDetail.notFound')}</h2>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/admin/employees')}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/employees')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="section-title flex items-center gap-2">
              <UserCircle className="h-6 w-6" />
              {employee.fullName}
            </h1>
            <p className="section-subtitle">{employee.position}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx('badge', getStatusBadgeClass(employee.status))}>
            {getStatusLabel(employee.status)}
          </span>
          {employee.hasUserAccount && (
            <span className="badge badge-info">{t('erp.employeeDetail.systemUser')}</span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.employeeDetail.phone')}</p>
              <p className="font-semibold">{employee.phone}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2.5">
              <Briefcase className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.employeeDetail.position')}</p>
              <p className="font-semibold">{employee.position}</p>
            </div>
          </div>
        </div>

        {employee.department && (
          <div className="surface-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2.5">
                <Building2 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-base-content/60">{t('erp.employeeDetail.department')}</p>
                <p className="font-semibold">{employee.department}</p>
              </div>
            </div>
          </div>
        )}

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <Calendar className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.employeeDetail.hireDate')}</p>
              <p className="font-semibold">{formatDate(employee.hireDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
            {t('erp.employeeDetail.personalInfo')}
          </h3>
          <div className="space-y-4">
            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-base-200 p-2">
                <Phone className="h-4 w-4 text-base-content/60" />
              </div>
              <div>
                <p className="text-xs text-base-content/60">{t('erp.employeeDetail.phone')}</p>
                <p className="font-semibold">{employee.phone}</p>
              </div>
            </div>

            {/* Email */}
            {employee.email && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <Mail className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">{t('erp.employeeDetail.email')}</p>
                  <p className="font-semibold">{employee.email}</p>
                </div>
              </div>
            )}

            {/* Birth Date */}
            {employee.birthDate && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <Calendar className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">{t('erp.employeeDetail.birthDate')}</p>
                  <p className="font-semibold">{formatDate(employee.birthDate)}</p>
                </div>
              </div>
            )}

            {/* Passport */}
            {employee.passportNumber && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <Shield className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">{t('erp.employeeDetail.passportNumber')}</p>
                  <p className="font-semibold">{employee.passportNumber}</p>
                </div>
              </div>
            )}

            {/* Address */}
            {employee.address && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <MapPin className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">{t('erp.employeeDetail.address')}</p>
                  <p className="font-semibold">{employee.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Work & Financial Info */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
            {t('erp.employeeDetail.workFinancialInfo')}
          </h3>
          <div className="space-y-4">
            {/* Position */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">{t('erp.employeeDetail.position')}</span>
              <span className="font-semibold">{employee.position}</span>
            </div>

            {/* Department */}
            {employee.department && (
              <div className="flex items-center justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70">{t('erp.employeeDetail.department')}</span>
                <span className="font-semibold">{employee.department}</span>
              </div>
            )}

            {/* Salary */}
            {employee.salary !== undefined && (
              <div className="flex items-center justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70">{t('erp.employeeDetail.salary')}</span>
                <span className="font-semibold text-success">{formatCurrency(employee.salary)}</span>
              </div>
            )}

            {/* Hire Date */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">{t('erp.employeeDetail.hireDate')}</span>
              <span className="font-semibold">{formatDate(employee.hireDate)}</span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">{t('common.status')}</span>
              <span className={clsx('badge', getStatusBadgeClass(employee.status))}>
                {getStatusLabel(employee.status)}
              </span>
            </div>

            {/* Bank Account */}
            {employee.bankAccountNumber && (
              <div className="flex items-start gap-3 pt-2">
                <div className="rounded-lg bg-base-200 p-2">
                  <CreditCard className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">{t('erp.employeeDetail.bankAccount')}</p>
                  <p className="font-medium">{employee.bankAccountNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contact & System Account */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Emergency Contact */}
        {(employee.emergencyContactName || employee.emergencyContactPhone) && (
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              {t('erp.employeeDetail.emergencyContact')}
            </h3>
            <div className="space-y-4">
              {employee.emergencyContactName && (
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-base-200 p-2">
                    <UserCircle className="h-4 w-4 text-base-content/60" />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">{t('common.name')}</p>
                    <p className="font-semibold">{employee.emergencyContactName}</p>
                  </div>
                </div>
              )}
              {employee.emergencyContactPhone && (
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-base-200 p-2">
                    <Phone className="h-4 w-4 text-base-content/60" />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">{t('erp.employeeDetail.phone')}</p>
                    <p className="font-semibold">{employee.emergencyContactPhone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Account */}
        {employee.hasUserAccount && (
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              {t('erp.employeeDetail.systemAccount')}
            </h3>
            <div className="space-y-4">
              {employee.username && (
                <div className="flex items-center justify-between py-2 border-b border-base-200">
                  <span className="text-base-content/70">{t('erp.employeeDetail.username')}</span>
                  <span className="font-semibold font-mono">{employee.username}</span>
                </div>
              )}
              {employee.userRole && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-base-content/70">{t('erp.employeeDetail.role')}</span>
                  <span className="badge badge-primary">{employee.userRole}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/admin/employees')}>
          <ArrowLeft className="h-4 w-4" />
          {t('erp.employeeDetail.backToList')}
        </Button>
      </div>
    </div>
  );
}
