import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar, MobileSidebar } from './Sidebar';
import { Header } from './Header';
import { NAV_ITEMS } from './nav';

function titleForPath(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const match = NAV_ITEMS.filter((i) => i.to !== '/').find((i) => pathname.startsWith(i.to));
  return match?.label ?? 'Fairway360';
}

export function AppShell() {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-night-950">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-7xl"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
