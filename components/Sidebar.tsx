'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';

interface NavLeaf {
  kind: 'leaf';
  label: string;
  href: string;
  roles: string[];
}

interface NavGroup {
  kind: 'group';
  label: string;
  href?: string;
  roles: string[];
  children: NavNode[];
}

type NavNode = NavLeaf | NavGroup;

const NAV_TREE: NavNode[] = [
  {
    kind: 'leaf',
    label: 'Tableau de bord',
    href: '/dashboard',
    roles: ['admin', 'editeur', 'lecteur'],
  },
  {
    kind: 'group',
    label: 'Budget structure',
    href: '/dashboard/budget-structure',
    roles: ['admin', 'editeur', 'lecteur'],
    children: [
      {
        kind: 'leaf',
        label: 'Ressources',
        href: '/dashboard/budget-structure?tab=ressources',
        roles: ['admin', 'editeur', 'lecteur'],
      },
      {
        kind: 'leaf',
        label: 'Dépenses',
        href: '/dashboard/budget-structure?tab=depenses',
        roles: ['admin', 'editeur', 'lecteur'],
      },
    ],
  },
  {
    kind: 'leaf',
    label: 'Contrôle budgétaire',
    href: '/dashboard/controle-budgetaire',
    roles: ['admin', 'editeur', 'lecteur'],
  },
  {
    kind: 'leaf',
    label: 'Budget action',
    href: '/dashboard/budget-action',
    roles: ['admin', 'editeur', 'lecteur'],
  },
  {
    kind: 'group',
    label: 'Actions',
    href: '/dashboard/actions',
    roles: ['admin', 'editeur', 'lecteur'],
    children: [
      {
        kind: 'leaf',
        label: 'Ressources',
        href: '/dashboard/actions',
        roles: ['admin', 'editeur', 'lecteur'],
      },
      {
        kind: 'group',
        label: 'Dépenses',
        roles: ['admin', 'editeur', 'lecteur'],
        children: [
          {
            kind: 'leaf',
            label: 'Dép. de personnel',
            href: '/dashboard/actions',
            roles: ['admin', 'editeur', 'lecteur'],
          },
          {
            kind: 'leaf',
            label: 'Dép. de fonctionnement',
            href: '/dashboard/actions',
            roles: ['admin', 'editeur', 'lecteur'],
          },
          {
            kind: 'leaf',
            label: 'Dép. de prestations',
            href: '/dashboard/actions',
            roles: ['admin', 'editeur', 'lecteur'],
          },
        ],
      },
    ],
  },
  {
    kind: 'leaf',
    label: 'Suivi affectation des ressources',
    href: '/dashboard/suivi-ressources',
    roles: ['admin', 'editeur', 'lecteur'],
  },
  {
    kind: 'leaf',
    label: 'Emplois repères',
    href: '/dashboard/emplois',
    roles: ['admin', 'editeur', 'lecteur'],
  },
  {
    kind: 'group',
    label: 'FicheProjet Pro',
    href: '/dashboard/fiches-projet',
    roles: ['admin', 'editeur', 'lecteur'],
    children: [
      {
        kind: 'leaf',
        label: 'Mes fiches projet',
        href: '/dashboard/fiches-projet',
        roles: ['admin', 'editeur', 'lecteur'],
      },
      {
        kind: 'leaf',
        label: 'Nouvelle fiche',
        href: '/dashboard/fiches-projet/nouveau',
        roles: ['admin', 'editeur'],
      },
    ],
  },
  {
    kind: 'leaf',
    label: 'Utilisateurs',
    href: '/dashboard/utilisateurs',
    roles: ['admin'],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  editeur: 'Consultation + Modification',
  lecteur: 'Consultation',
};

function isNodeActive(node: NavNode, pathname: string, tab: string | null): boolean {
  if (node.kind === 'leaf') {
    const [hrefPath, hrefQuery] = node.href.split('?');
    if (hrefQuery) {
      const hrefParams = new URLSearchParams(hrefQuery);
      const hrefTab = hrefParams.get('tab');
      return pathname === hrefPath && tab === hrefTab;
    }
    if (hrefPath === '/dashboard') return pathname === '/dashboard';
    return pathname === hrefPath || pathname.startsWith(hrefPath + '/');
  }
  // group: active if its href matches or any child is active
  if (node.href) {
    if (pathname === node.href || pathname.startsWith(node.href + '/')) return true;
  }
  return node.children.some(child => isNodeActive(child, pathname, tab));
}

interface NavItemProps {
  node: NavNode;
  role: string;
  pathname: string;
  tab: string | null;
  depth: number;
  defaultOpen?: boolean;
}

function NavItem({ node, role, pathname, tab, depth }: NavItemProps) {
  const isActive = isNodeActive(node, pathname, tab);
  const [open, setOpen] = useState(isActive);

  // Re-sync when route changes
  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  if (!node.roles.includes(role)) return null;

  const indent = depth * 14;

  if (node.kind === 'leaf') {
    const [hrefPath, hrefQuery] = node.href.split('?');
    let active = false;
    if (hrefQuery) {
      const hrefParams = new URLSearchParams(hrefQuery);
      const hrefTab = hrefParams.get('tab');
      active = pathname === hrefPath && tab === hrefTab;
    } else if (hrefPath === '/dashboard') {
      active = pathname === '/dashboard';
    } else {
      active = pathname === hrefPath || pathname.startsWith(hrefPath + '/');
    }

    return (
      <li>
        <Link
          href={node.href}
          style={{ paddingLeft: `${12 + indent}px` }}
          className={`flex items-center gap-2 rounded-lg pr-3 py-2 text-sm font-medium transition-colors ${
            active
              ? 'bg-navy-light text-white'
              : 'text-blue-200 hover:bg-navy-light hover:text-white'
          }`}
        >
          {node.label}
        </Link>
      </li>
    );
  }

  // group node
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        style={{ paddingLeft: `${12 + indent}px` }}
        className={`flex items-center rounded-lg pr-2 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-navy-light text-white'
            : 'text-blue-200 hover:bg-navy-light hover:text-white'
        }`}
      >
        {node.href ? (
          <Link href={node.href} className="flex-1 min-w-0 truncate">
            {node.label}
          </Link>
        ) : (
          <span className="flex-1 min-w-0 truncate">{node.label}</span>
        )}
        {hasChildren && (
          <button
            onClick={() => setOpen(o => !o)}
            className="ml-1 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            aria-label={open ? 'Réduire' : 'Développer'}
          >
            <span className="text-xs select-none">{open ? '▾' : '▸'}</span>
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child, i) => (
            <NavItem
              key={i}
              node={child}
              role={role}
              pathname={pathname}
              tab={tab}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function SidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const { data: session } = useSession();
  const role = session?.user?.role ?? '';

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
        <ul className="space-y-0.5">
          {NAV_TREE.map((node, i) => (
            <NavItem
              key={i}
              node={node}
              role={role}
              pathname={pathname}
              tab={tab}
              depth={0}
            />
          ))}
        </ul>
      </nav>

      {/* User footer */}
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

export default function Sidebar() {
  return (
    <Suspense fallback={
      <aside className="flex h-screen w-64 flex-col bg-navy shadow-xl">
        <div className="flex items-center gap-3 border-b border-navy-light px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold text-navy font-bold text-lg">S</div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">SeyAmTi</p>
            <p className="text-xs text-blue-200">Conseil</p>
          </div>
        </div>
        <div className="flex-1" />
      </aside>
    }>
      <SidebarInner />
    </Suspense>
  );
}
