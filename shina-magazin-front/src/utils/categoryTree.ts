import { icons, Folder, type LucideIcon } from 'lucide-react';
import type { Category } from '../types';

export interface FlatCategory {
  id: number;
  name: string;
  depth: number;
  parentId?: number;
}

/**
 * Kategoriya daraxtini indent (chuqurlik) bilan tekis ro'yxatga aylantiradi —
 * select variantlari va daraxt ko'rinishlari uchun.
 */
export function flattenCategoryTree(tree: Category[], depth = 0): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const node of tree) {
    result.push({ id: node.id, name: node.name, depth, parentId: node.parentId });
    if (node.children?.length) {
      result.push(...flattenCategoryTree(node.children, depth + 1));
    }
  }
  return result;
}

/** Berilgan tugun va uning barcha avlodlari id'lari (parent selectda o'zini tanlashni bloklash uchun). */
export function collectSubtreeIds(tree: Category[], rootId: number): Set<number> {
  const ids = new Set<number>();
  const walk = (nodes: Category[], inside: boolean) => {
    for (const node of nodes) {
      const isInside = inside || node.id === rootId;
      if (isInside) ids.add(node.id);
      if (node.children?.length) walk(node.children, isInside);
    }
  };
  walk(tree, false);
  return ids;
}

/** Select uchun "— " prefiksli variant nomi. */
export function indentLabel(name: string, depth: number): string {
  return depth > 0 ? `${'   '.repeat(depth)}└ ${name}` : name;
}

/** DB'da saqlanadigan kebab-case lucide ikonka nomini komponentga aylantiradi. */
export function getCategoryIcon(name?: string): LucideIcon {
  if (!name) return Folder;
  const pascal = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return (icons as Record<string, LucideIcon>)[pascal] ?? Folder;
}

/** Kategoriya ikonka tanlagichi uchun tavsiya etilgan to'plam (kebab-case). */
export const CATEGORY_ICON_CHOICES = [
  'circle-dot',
  'disc',
  'car',
  'car-front',
  'truck',
  'bike',
  'gauge',
  'zap',
  'wrench',
  'settings',
  'package',
  'tag',
  'layers',
  'shopping-bag',
  'snowflake',
  'sun',
] as const;
