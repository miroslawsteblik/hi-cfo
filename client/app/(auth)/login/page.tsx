'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="w-full">
      {/* Mobile Logo */}
      <div className="flex justify-center mb-8 lg:hidden">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="ml-2 text-xl font-bold text-gray-900">ModernApp</span>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-gray-600 mt-2">Sign in to your account to continue</p>
      </div>

      <LoginForm />

      <div className="text-center mt-8">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            Sign up for free
          </button>
        </p>
      </div>
    </div>
  );
}