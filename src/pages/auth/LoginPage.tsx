/**
 * Login Page
 * Clean, Tiimo-style login form
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'נא להזין כתובת מייל')
    .email('כתובת מייל לא תקינה'),
  password: z
    .string()
    .min(1, 'נא להזין סיסמה')
    .min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      await login(data.email, data.password);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };

      // User-friendly error messages
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
          setError('כתובת המייל או הסיסמה שגויים');
          break;
        case 'auth/too-many-requests':
          setError('יותר מדי ניסיונות. נסה שוב מאוחר יותר');
          break;
        case 'auth/user-disabled':
          setError('החשבון הושבת. פנה למנהל המערכת');
          break;
        default:
          setError('שגיאה בהתחברות. נסה שוב');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <img
          src="/logo.svg"
          alt="מרכזי הטניס"
          className="w-24 h-24 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-slate-800">מרכזי הטניס</h1>
        <p className="text-slate-500 mt-1">מערכת ניהול אימונים</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            התחברות
          </h2>

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

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                סיסמה
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={errors.password ? 'input-error pl-12' : 'input pl-12'}
                  placeholder="••••••••"
                  dir="ltr"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-warning-dark">
                  {errors.password.message}
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
                'התחברות'
              )}
            </button>
          </form>

          {/* Forgot password link */}
          <div className="mt-6 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-primary-500 hover:text-primary-600 transition-colors"
            >
              שכחת סיסמה?
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-slate-400 mt-6">
          גישה למשתמשים מורשים בלבד
        </p>
      </div>
    </div>
  );
}
