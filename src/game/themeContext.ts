// App-wide theme + experiment-toggle state, exposed via React Context.
// App is the single writer (it also keeps the dataset attributes in sync
// for CSS to read). Consumer components subscribe via useContext and
// re-render on changes — replaces the MutationObserver pattern that
// AnimatedMascot, MascotIcon, and FlyingPig used to duplicate.

import { createContext, useContext } from 'react';

// True when documentElement[data-theme="dark"] is set.
export const ThemeContext = createContext<boolean>(false);
export const useIsDark = (): boolean => useContext(ThemeContext);

// True when documentElement[data-exp-colored-bg="1"] is set — i.e. the
// start/tutorial screens with a per-mode tinted background. Game and end
// screens keep the neutral cream regardless of mode.
export const ColoredBgContext = createContext<boolean>(false);
export const useColoredBgActive = (): boolean => useContext(ColoredBgContext);
