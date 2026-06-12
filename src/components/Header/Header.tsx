import React from 'react';
import { Shield } from 'lucide-react';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logoIcon}>
        <Shield size={28} strokeWidth={2.5} />
      </div>
      <h1 className={styles.title}>Monitor de Segurança SP</h1>
    </header>
  );
};
