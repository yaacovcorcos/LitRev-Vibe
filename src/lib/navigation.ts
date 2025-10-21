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
