import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { ProgramNode } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDataQuality, useSubmissions } from '../../hooks/useData';
import { AdminIcon, ChevronDownIcon, DashboardIcon } from '../ui/Icons';

/**
 * Navigation, built from the programme tree the API returns rather than from a hard-coded list
 * — so adding a programme in the backend makes it appear here with no frontend change.
 */
export function Sidebar({ programs, onNavigate }: { programs: ProgramNode[]; onNavigate?: () => void }) {
  const location = useLocation();
  const { can } = useAuth();
  const activeKey = location.pathname.startsWith('/p/') ? location.pathname.slice(3) : 'overview';

  const ancestorKeys = useMemo(() => findAncestors(programs, activeKey), [programs, activeKey]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(ancestorKeys));
  const [treeOpen, setTreeOpen] = useState(true);

  useEffect(() => {
    setExpanded((prev) => new Set([...prev, ...ancestorKeys]));
  }, [ancestorKeys.join('|')]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const roots = programs.filter((p) => p.pageKey !== 'overview');


  const { data: queue } = useSubmissions('pending');
  const waiting = queue?.counts.total ?? 0;

  return (
    <nav className="flex h-full flex-col gap-1 px-3 py-4" aria-label="Main">
      <SectionLabel>Reporting</SectionLabel>
      <NavItem to="/" label="Overview" depth={0} onNavigate={onNavigate} end icon={<DashboardIcon className="h-5 w-5" />} />

      <SectionLabel
        className="pt-5"
        expanded={treeOpen}
        onToggle={() => setTreeOpen((open) => !open)}
      >
        Programmes
      </SectionLabel>
      {treeOpen
        ? roots.map((node) => (
            <TreeNode
              key={node.pageKey}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              onNavigate={onNavigate}
            />
          ))
        : null}

      {/* Nothing sits under Operations for a public reader, and a heading with
          nothing beneath it reads as something failing to load. */}
      {can('admin') ? (
        <>
          <SectionLabel className="pt-5">Operations</SectionLabel>
          <NavItem to="/admin" label="Administration" depth={0} onNavigate={onNavigate} icon={<AdminIcon className="h-5 w-5" />} />
        </>
      ) : null}
    </nav>
  );
}

function SectionLabel({
  children,
  className = '',
  expanded,
  onToggle,
}: {
  children: React.ReactNode;
  className?: string;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <>
      <span>{children}</span>
      {onToggle ? (
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      ) : null}
    </>
  );

  if (!onToggle) {
    return (
      <div className={`px-3 pb-1 pt-1 text-label-caps uppercase text-on-surface-muted ${className}`}>{children}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`flex w-full items-center justify-between px-3 pb-1 pt-1 text-label-caps uppercase text-on-surface-muted transition hover:text-on-surface ${className}`}
    >
      {content}
    </button>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onNavigate,
}: {
  node: ProgramNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onNavigate?: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.pageKey);

  return (
    <div>
      <div className="flex items-stretch gap-0.5">
        <NavItem
          to={`/p/${node.pageKey}`}
          // The nav may call a page something other than its title.
          label={node.navLabel ?? node.name}
          depth={depth}
          onNavigate={onNavigate}
          className="min-w-0 flex-1"
        />
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.pageKey)}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.navLabel ?? node.name}`}
            className="shrink-0 rounded-md px-2 text-on-surface-muted transition hover:bg-surface-variant hover:text-on-surface"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
      </div>

      {hasChildren && isOpen ? (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.pageKey}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavItem({
  to,
  label,
  depth,
  onNavigate,
  end = false,
  className = '',
  icon,
  badge,
}: {
  to: string;
  label: string;
  depth: number;
  onNavigate?: () => void;
  end?: boolean;
  className?: string;
  icon?: React.ReactNode;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-md py-2 pr-2 text-left text-body-text transition ${className} ${
          isActive
            ? 'bg-primary-container font-semibold text-on-primary-container after:absolute after:inset-y-1 after:right-0 after:w-0.5 after:rounded-full after:bg-primary after:content-[""]'
            : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
        }`
      }
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="truncate capitalize">{label}</span>
      {badge ? (
        <span className="ml-auto shrink-0 rounded-full bg-status-danger-container px-2 py-0.5 text-xs font-semibold text-status-on-danger-container">
          {badge}
        </span>
      ) : null}
    </NavLink>
  );
}

function findAncestors(nodes: ProgramNode[], targetKey: string, trail: string[] = []): string[] {
  for (const node of nodes) {
    if (node.pageKey === targetKey) return trail;
    const found = findAncestors(node.children, targetKey, [...trail, node.pageKey]);
    if (found.length || node.children.some((c) => c.pageKey === targetKey)) {
      return found.length ? found : [...trail, node.pageKey];
    }
  }
  return [];
}
