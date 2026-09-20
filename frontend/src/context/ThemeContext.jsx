import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('uuds_theme') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.className = 'bg-slate-100 text-slate-900 antialiased selection:bg-blue-600 selection:text-white min-h-screen';
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      document.body.className = 'bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white min-h-screen';
    }
    localStorage.setItem('uuds_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
