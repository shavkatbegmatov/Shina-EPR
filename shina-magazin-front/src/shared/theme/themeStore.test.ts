import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveTheme,
  applyTheme,
  useThemeStore,
} from './themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    // Har testdan oldin documentdagi data-theme ni tozalaymiz
    delete document.documentElement.dataset.theme;
  });

  it('resolveTheme maps dark/light to the shina theme names', () => {
    expect(resolveTheme('dark')).toBe('shina-dark');
    expect(resolveTheme('light')).toBe('shina');
  });

  it('applyTheme sets the documentElement data-theme attribute for dark', () => {
    applyTheme('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'shina-dark');
  });

  it('applyTheme sets the documentElement data-theme attribute for light', () => {
    applyTheme('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'shina');
  });

  it('setMode updates the store mode', () => {
    useThemeStore.getState().setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');

    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('setMode applies the resolved theme to the document', () => {
    useThemeStore.getState().setMode('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'shina-dark');

    useThemeStore.getState().setMode('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'shina');
  });

  it('effectiveTheme reflects the current mode after setState', () => {
    useThemeStore.setState({ mode: 'dark' });
    expect(useThemeStore.getState().effectiveTheme()).toBe('shina-dark');

    useThemeStore.setState({ mode: 'light' });
    expect(useThemeStore.getState().effectiveTheme()).toBe('shina');
  });
});
