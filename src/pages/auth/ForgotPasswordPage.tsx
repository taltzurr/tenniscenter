/**
 * Forgot Password Page
 * Password reset request form
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'נא להזין כתובת מייל')
    .email('כתובת מייל לא תקינה'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);

    try {
      await sendPasswordReset(data.email);
      setIsSuccess(true);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };

      switch (firebaseError.code) {
        case 'auth/user-not-found':
          // Don't reveal if email exists - show success anyway
          setIsSuccess(true);
          break;
        case 'auth/too-many-requests':
          setError('יותר מדי ניסיונות. נסה שוב מאוחר יותר');
          break;
        default:
          setError('שגיאה בשליחה. נסה שוב');
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
          {isSuccess ? (
            // Success state
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-soft flex items-center justify-center">
                <CheckCircle size={32} className="text-success-dark" weight="fill" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                המייל נשלח!
              </h2>
              <p className="text-slate-500 mb-6">
                אם הכתובת קיימת במערכת, תקבל הוראות לאיפוס הסיסמה בקרוב.
              </p>
              <Link to="/login" className="btn-secondary w-full">
                חזרה להתחברות
              </Link>
            </div>
          ) : (
            // Form state
            <>
              <h2 className="text-xl font-semibold text-slate-800 mb-2 text-center">
                שכחת סיסמה?
              </h2>
              <p className="text-slate-500 text-sm mb-6 text-center">
                הזן את כתובת המייל שלך ונשלח לך קישור לאיפוס הסיסמה
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="label">
                    כתובת מייל
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className={errors.email ? 'input-error' : 'input'}
                    placeholder="your@email.com"
                    dir="ltr"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-sm text-warning-dark">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <div className="p-3 rounded-lg bg-warning-soft text-warning-dark text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? (
                    <Spinner size="sm" className="border-white border-t-transparent" />
                  ) : (
                    'שלח קישור לאיפוס'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Back to login */}
          {!isSuccess && (
            <div className="mt-6">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowRight size={16} />
                <span>חזרה להתחברות</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
