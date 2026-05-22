// App-wide React Contexts. App is the single writer (it also keeps the
// dataset attributes in sync for CSS to read). Consumer components
// subscribe via useContext and re-render on changes.
//
// Theme and ColoredBg replaced the MutationObserver pattern that
// AnimatedMascot, MascotIcon, and FlyingPig used to duplicate.
// ColorOverride is the picker's per-mode {bg, accent} values, written
// by FloatingColorPicker and read by AnimatedMascot for live recoloring.

import { createContext, useContext } from 'react';
import type { ModeId } from '../lib/modes';

// True when documentElement[data-theme="dark"] is set.
export const ThemeContext = createContext<boolean>(false);
export const useIsDark = (): boolean => useContext(ThemeContext);

// True when documentElement[data-exp-colored-bg="1"] is set — i.e. the
// start/tutorial screens with a per-mode tinted background. Game and end
// screens keep the neutral cream regardless of mode.
export const ColoredBgContext = createContext<boolean>(false);
export const useColoredBgActive = (): boolean => useContext(ColoredBgContext);

// Live color-picker overrides, keyed per-mode. App reads/writes
// colorOverrides state (persisted to localStorage); FloatingColorPicker
// mutates via setColorOverrides; AnimatedMascot consumes via context.
export interface ModeColorOverride {
  bg?: string;
  accent?: string;
}
export type ColorOverrides = Partial<Record<ModeId, ModeColorOverride>>;
export const ColorOverrideContext = createContext<ColorOverrides>({});
export const useColorOverrides = (): ColorOverrides => useContext(ColorOverrideContext);
