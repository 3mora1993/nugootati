import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabase.tsx';
import { User } from '@supabase/supabase-js';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface AuthWrapperProps {
  children: (user: User) => React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">نقوطاتي 💎</h1>
            <p className="text-slate-200">نقوطاتي: رفيقك الذكي لإدارة الهدايا.</p>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                {authMode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </h2>
              <p className="text-slate-600">
                {authMode === 'signin' 
                  ? 'ادخل إلى حسابك لإدارة نقوطك' 
                  : 'أنشئ حساباً جديداً لبدء تتبع النقوط'
                }
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-medium mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    placeholder="example@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {authLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    {authMode === 'signin' ? <LogIn size={20} /> : <UserPlus size={20} />}
                    {authMode === 'signin' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setError('');
                }}
                className="text-slate-600 hover:text-slate-700 font-medium transition-colors"
              >
                {authMode === 'signin' 
                  ? 'ليس لديك حساب؟ أنشئ حساباً جديداً' 
                  : 'لديك حساب؟ سجل الدخول'
                }
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-center text-sm text-slate-500">
                تصميم وبرمجة عمرو الاسدي
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {children(user)}
      <button
        onClick={handleSignOut}
        className="fixed top-4 left-4 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors z-50 shadow-sm"
      >
        تسجيل الخروج
      </button>
    </div>
  );
};

export default AuthWrapper;