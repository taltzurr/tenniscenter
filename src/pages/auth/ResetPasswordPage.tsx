/**
 * Reset Password Page
 * Handles the Firebase password reset link (oobCode from email)
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeSlash, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { Spinner } from '@/components/ui/Spinner';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
    confirmPassword: z.string().min(1, 'נא לאשר את הסיסמה'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'הסיסמאות אינן תואמות',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidCode, setIsValidCode] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Verify the oobCode is valid on page load
  useEffect(() => {
    if (!oobCode || mode !== 'resetPassword') {
      setPageError('קישור לא תקין. נסה לבקש איפוס סיסמה מחדש.');
      setIsVerifying(false);
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then(() => {
        setIsValidCode(true);
      })
      .catch(() => {
        setPageError('הקישור פג תוקף או כבר נוצל. נסה לבקש איפוס סיסמה מחדש.');
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [oobCode, mode]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!oobCode) return;

    try {
      await confirmPasswordReset(auth, oobCode, data.password);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      switch (firebaseError.code) {
        case 'auth/expired-action-code':
          setPageError('הקישור פג תוקף. נסה לבקש איפוס סיסמה מחדש.');
          setIsValidCode(false);
          break;
        case 'auth/invalid-action-code':
          setPageError('קישור לא תקין. נסה לבקש איפוס סיסמה מחדש.');
          setIsValidCode(false);
          break;
        case 'auth/weak-password':
          setPageError('הסיסמה חלשה מדי. נסה סיסמה ארוכה יותר.');
          break;
        default:
          setPageError('שגיאה בעדכון הסיסמה. נסה שוב.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <img
          src="/logo.png"
          alt="מרכזי הטניס"
          className="w-20 h-20 mx-auto mb-4"
        />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {isVerifying ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Spinner size="lg" />
              <p className="text-slate-500 text-sm">בודק קישור...</p>
            </div>
          ) : isSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-soft flex items-center justify-center">
                <CheckCircle size={32} className="text-success-dark" weight="fill" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                הסיסמה עודכנה!
              </h2>
              <p className="text-slate-500 mb-6">
                מיד תועבר לדף ההתחברות...
              </p>
              <Link to="/login" className="btn-primary w-full">
                התחבר עכשיו
              </Link>
            </div>
          ) : pageError ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-soft flex items-center justify-center">
                <WarningCircle size={32} className="text-warning-dark" weight="fill" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                קישור לא תקין
              </h2>
              <p className="text-slate-500 mb-6">{pageError}</p>
              <Link to="/forgot-password" className="btn-primary w-full">
                בקש קישור חדש
              </Link>
            </div>
          ) : isValidCode ? (
            <>
              <h2 className="text-xl font-semibold text-slate-800 mb-2 text-center">
                איפוס סיסמה
              </h2>
              <p className="text-slate-500 text-sm mb-6 text-center">
                הזן סיסמה חדשה לחשבונך
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* New Password */}
                <div>
                  <label htmlFor="password" className="label">
                    סיסמה חדשה
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={errors.password ? 'input-error pl-10' : 'input pl-10'}
                      placeholder="לפחות 6 תווים"
                      dir="ltr"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-sm text-warning-dark">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="label">
                    אימות סיסמה
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={errors.confirmPassword ? 'input-error pl-10' : 'input pl-10'}
                      placeholder="הזן שוב את הסיסמה"
                      dir="ltr"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-sm text-warning-dark">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? (
                    <Spinner size="sm" className="border-white border-t-transparent" />
                  ) : (
                    'עדכן סיסמה'
                  )}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
