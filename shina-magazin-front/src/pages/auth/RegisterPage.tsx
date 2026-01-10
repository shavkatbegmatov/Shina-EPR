import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

type RegisterRequest = {
  fullName: string;
  phone: string;
  companyName?: string;
  role: 'SELLER' | 'MANAGER' | 'ADMIN';
  note?: string;
};

export function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterRequest>({
    defaultValues: {
      role: 'SELLER',
    },
  });

  const onSubmit = async () => {
    setLoading(true);
    setTimeout(() => {
      toast.success("So'rov qabul qilindi. Administrator bilan bog'laning.");
      reset();
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-base-100 to-primary/10 p-4">
      <div className="mx-auto flex min-h-screen max-w-xl items-center">
        <div className="surface-card w-full rounded-3xl p-8 shadow-[var(--shadow-strong)]">
          <div className="mb-6">
            <div className="pill w-fit">Access</div>
            <h1 className="mt-3 text-3xl font-semibold">Ro'yxatdan o'tish</h1>
            <p className="text-sm text-base-content/60">
              Hisob yaratish bo'yicha so'rov qoldiring. Administrator tasdiqlaydi.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <label className="form-control">
              <span className="label-text text-sm">Ism-familiya</span>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.fullName ? 'input-error' : ''}`}
                placeholder="Ism va familiyangiz"
                {...register('fullName', {
                  required: 'Ism-familiya kiritilishi shart',
                })}
              />
              {errors.fullName && (
                <span className="mt-1 text-xs text-error">
                  {errors.fullName.message}
                </span>
              )}
            </label>

            <label className="form-control">
              <span className="label-text text-sm">Telefon</span>
              <input
                type="tel"
                className={`input input-bordered w-full ${errors.phone ? 'input-error' : ''}`}
                placeholder="+998 90 123 45 67"
                {...register('phone', {
                  required: 'Telefon raqam kiritilishi shart',
                })}
              />
              {errors.phone && (
                <span className="mt-1 text-xs text-error">
                  {errors.phone.message}
                </span>
              )}
            </label>

            <label className="form-control">
              <span className="label-text text-sm">Kompaniya (ixtiyoriy)</span>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Kompaniya nomi"
                {...register('companyName')}
              />
            </label>

            <label className="form-control">
              <span className="label-text text-sm">Rol</span>
              <select
                className="select select-bordered w-full"
                {...register('role')}
              >
                <option value="SELLER">Sotuvchi</option>
                <option value="MANAGER">Menejer</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </label>

            <label className="form-control">
              <span className="label-text text-sm">Izoh (ixtiyoriy)</span>
              <textarea
                className="textarea textarea-bordered min-h-[96px]"
                placeholder="Qisqacha izoh"
                {...register('note')}
              />
            </label>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  So'rov yuborish
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-base-content/60">
            Hisobingiz bormi?{' '}
            <Link to="/login" className="link link-primary">
              Kirish
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
