import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../../../src/services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('sustenta_dark') === 'true';
  });

  // Aplica/remove classe dark no <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('sustenta_dark', String(darkMode));
  }, [darkMode]);

  // Sincroniza com Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    updateDoc(doc(db, 'usuarios', user.uid), { darkMode }).catch(() => {});
  }, [darkMode]);

  // Carrega preferência do Firestore ao logar
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists() && typeof snap.data().darkMode === 'boolean') {
          setDarkMode(snap.data().darkMode);
        }
      } catch { }
    });
    return unsub;
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode: () => setDarkMode(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  );
};