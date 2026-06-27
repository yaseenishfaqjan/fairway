import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { Toaster } from '@/components/ui';
import { Login } from '@/pages/Login';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { Dashboard } from '@/pages/Dashboard';
import { MembersList } from '@/pages/members/MembersList';
import { MemberDetail } from '@/pages/members/MemberDetail';
import { TeeSheet } from '@/pages/tee-sheet/TeeSheet';
import { Bookings } from '@/pages/bookings/Bookings';
import { Pos } from '@/pages/pos/Pos';
import { Inventory } from '@/pages/inventory/Inventory';
import { Tournaments } from '@/pages/tournaments/Tournaments';
import { TournamentDetail } from '@/pages/tournaments/TournamentDetail';
import { Maintenance } from '@/pages/maintenance/Maintenance';
import { Staff } from '@/pages/staff/Staff';
import { Reports } from '@/pages/reports/Reports';
import { Settings } from '@/pages/settings/Settings';
import { useAuthStore } from '@/stores/auth';

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'idle') void bootstrap();
  }, [status, bootstrap]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tee-sheet" element={<TeeSheet />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/members" element={<MembersList />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/pos" element={<Pos />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/maintenance" element={<Maintenance />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['superadmin', 'club_owner', 'manager']} />}>
          <Route element={<AppShell />}>
            <Route path="/staff" element={<Staff />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['superadmin', 'club_owner']} />}>
          <Route element={<AppShell />}>
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
