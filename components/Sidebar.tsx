'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const navItems = [
  { href: '/dashboard',                  label: 'Tableau de bord',      icon: '📊', roles: ['admin', 'editeur', 'lecteur'] },
  { href: '/dashboard/budget-structure', label: 'Budget Structure',     icon: '🏛️', roles: ['admin', 'editeur', 'lecteur'] },
  { href: '/dashboard/budget-action',   label: 'Budget action',         icon: '🎯', roles: ['admin', 'editeur', 'lecteur'] },
  { href: '/dashboard/actions',          label: 'Actions / Projets',    icon: '📋', roles: ['admin', 'editeur', 'lecteur'] },
  { href: '/dashboard/emplois',          label: 'Emplois Repères',      icon: '👥', roles: ['admin', 'editeur', 'lecteur'] },
  { href: '/dashboard/utilisateurs',     label: 'Utilisateurs',         icon: '🔐', roles: ['admin'] },
];

const ROLE_LABELS: Record<string, string> = {
  admin:   'Administrateur',
  editeur: 'Consultation + Modification',
  lecteur: 'Consultation',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? '';

  const visibleItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-64 flex-col bg-navy shadow-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-navy-light px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold text-navy font-bold text-lg">
          S
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">SeyAmTi</p>
          <p className="text-xs text-blue-200">Conseil</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map(item => {
            const active = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-navy-light text-white'
                      : 'text-blue-200 hover:bg-navy-light hover:text-white'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-navy-light px-4 py-4">
        <p className="text-xs text-blue-300 truncate">{session?.user?.email}</p>
        <p className="text-xs font-medium text-white truncate">{session?.user?.name}</p>
        {role && (
          <p className="mt-0.5 text-xs text-gold truncate">{ROLE_LABELS[role] ?? role}</p>
        )}
        <Link
          href="/dashboard/profil"
          className="mt-2 block w-full rounded-lg bg-navy-light px-3 py-2 text-center text-xs font-medium text-blue-200 hover:text-white transition-colors"
        >
          Mon profil
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-1 w-full rounded-lg bg-navy-light px-3 py-2 text-xs font-medium text-blue-200 hover:bg-red-700 hover:text-white transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
