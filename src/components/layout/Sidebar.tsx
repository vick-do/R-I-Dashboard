import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { ProgramNode } from '../../lib/api';

/**
 * Navigation, built from the programme tree the API returns rather than from a
 * hard-coded list — so adding a programme in the backend makes it appear here
 * with no frontend change.
 *
 * Two behaviours the previous sidebar lacked:
 *   • the branch containing the active page auto-expands, and opening one
 *     branch no longer collapses its siblings;
 *   • container nodes are links in their own right, showing a roll-up of their
 *     children instead of being inert accordion handles.
 */
export function Sidebar({ programs, onNavigate }: { programs: ProgramNode[]; onNavigate?: () => void }) {
  const location = useLocation();
  const activeKey = location.pathname.startsWith('/p/') ? location.pathname.slice(3) : 'overview';

  // Ancestors of the active page, so the tree opens to reveal it.
  const ancestorKeys = useMemo(() => findAncestors(programs, activeKey), [programs, activeKey]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(ancestorKeys));

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

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3" aria-label="Programmes">
      <NavItem to="/" label="Overview" depth={0} onNavigate={onNavigate} end className="w-full" />
      <div className="my-2 border-t border-slate-200" />
      {roots.map((node) => (
        <TreeNode
          key={node.pageKey}
          node={node}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
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
          label={node.name}
          depth={depth}
          onNavigate={onNavigate}
          className="min-w-0 flex-1"
        />
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.pageKey)}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`}
            className="shrink-0 rounded-lg px-2 text-ink-muted transition hover:bg-slate-100 hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
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
}: {
  to: string;
  label: string;
  depth: number;
  onNavigate?: () => void;
  end?: boolean;
  /**
   * Sizing is the caller's business. `flex-1` belongs only to the row that
   * pairs this link with an expand button — applied unconditionally it also
   * made the standalone Overview link grow to fill the drawer's full height.
   */
  className?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
      className={({ isActive }) =>
        `block truncate rounded-lg py-2 pr-2 text-left text-sm transition ${className} ${
          isActive
            ? 'bg-brand-tint font-semibold text-brand-dark'
            : 'text-ink-secondary hover:bg-slate-100 hover:text-ink'
        }`
      }
    >
      {label}
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
