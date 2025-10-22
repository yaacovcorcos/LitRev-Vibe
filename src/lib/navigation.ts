import type { ComponentType } from 'react';
import {
  BookText,
  Grid,
  Home,
  Layers,
  ListChecks,
  NotebookPen,
  Settings2,
} from 'lucide-react';

export type NavItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const workspaceNav: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Home', href: '/', icon: Home },
      { title: 'Projects', href: '/projects', icon: Grid },
      { title: 'Runs', href: '/runs', icon: Layers },
      { title: 'Notifications', href: '/notifications', icon: ListChecks },
    ],
  },
  {
    label: 'Project',
    items: [
      { title: 'Planning', href: '/project/:id/planning', icon: NotebookPen },
      { title: 'Draft & Compose', href: '/project/:id/draft', icon: BookText },
      { title: 'Export', href: '/project/:id/export', icon: Layers },
      { title: 'Settings', href: '/project/:id/settings', icon: Settings2 },
    ],
  },
];

export function navItemRequiresProject(item: NavItem) {
  return item.href.includes('/:id');
}

export function resolveProjectHref(href: string, projectId: string | null | undefined) {
  if (!href.includes('/:id')) {
    return href;
  }

  if (!projectId) {
    return null;
  }

  return href.replace('/:id', `/${projectId}`);
}

export function extractProjectId(pathname: string | null) {
  if (!pathname) {
    return null;
  }

  const match = pathname.match(/\/project\/([^/]+)/);
  return match ? match[1] : null;
}

export function isActiveNavPath(pathname: string, target: string) {
  if (target === '/') {
    return pathname === '/';
  }

  if (pathname === target) {
    return true;
  }

  return pathname.startsWith(`${target}/`);
}
