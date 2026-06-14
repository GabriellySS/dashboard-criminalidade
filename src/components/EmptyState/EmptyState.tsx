import React from 'react';
import { SearchX } from 'lucide-react';
import styles from './EmptyState.module.css';

export const EmptyState: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <SearchX size={32} strokeWidth={1.5} />
      </div>
      <h3 className={styles.title}>Nenhum registro encontrado</h3>
      <p className={styles.description}>
        Não há dados de criminalidade para a combinação de filtros selecionada.
      </p>
    </div>
  );
};
