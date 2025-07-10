'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function Dashboard() {
  return (
    <AuthGuard>
      <div>
        <h1>Dashboard</h1>
        {/* Your dashboard content */}
      </div>
    </AuthGuard>
  );
}