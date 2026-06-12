import React from 'react';
import { Shield } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoIcon}>
          <Shield size={24} strokeWidth={2.5} />
        </div>
        <h1 className={styles.title}>Monitor de Segurança SP</h1>
      </div>
      <ThemeToggle />
    </header>
  );
};
