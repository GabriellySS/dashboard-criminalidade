import React from 'react';
import { Shield, Bell } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoIcon}>
          <Shield size={24} fill="var(--color-accent)" strokeWidth={1.5} />
        </div>
        <h1 className={styles.title}>Monitor de Segurança SP</h1>
      </div>
      
      <div className={styles.actions}>
        <ThemeToggle />
        
        <button className={styles.actionIcon} aria-label="Notificações">
          <div style={{ position: 'relative' }}>
            <Bell size={20} />
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '6px',
              height: '6px',
              backgroundColor: 'var(--color-danger)',
              borderRadius: '50%'
            }} />
          </div>
        </button>

        <img 
          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face" 
          alt="Avatar do Usuário" 
          className={styles.avatar}
        />
      </div>
    </header>
  );
};
