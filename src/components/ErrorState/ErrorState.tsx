import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './ErrorState.module.css';

interface ErrorStateProps {
  /** Mensagem de erro técnica (exibida discretamente abaixo do texto principal). */
  errorMessage?: string | null;
  /** Callback disparado ao clicar em "Tentar novamente". */
  onRetry?: () => void;
  /** Oculta o botão de retry (ex: erros não recuperáveis). */
  hideRetry?: boolean;
}

/**
 * Componente de estado de erro alinhado ao Design System Flat do projeto.
 *
 * Substitui os `console.error` silenciosos por uma exibição visual amigável
 * com mensagem clara e botão interativo de retry.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  errorMessage,
  onRetry,
  hideRetry = false,
}) => {
  return (
    <div className={styles.container} role="alert" aria-live="assertive">
      <div className={styles.iconWrapper}>
        <AlertTriangle size={32} strokeWidth={1.5} aria-hidden="true" />
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>Não foi possível carregar os dados</h3>
        <p className={styles.description}>
          Ocorreu um problema ao conectar com o servidor. Verifique sua conexão
          e tente novamente.
        </p>

        {errorMessage && (
          <p className={styles.technicalDetail} title={errorMessage}>
            {errorMessage}
          </p>
        )}
      </div>

      {!hideRetry && onRetry && (
        <button
          id="error-retry-btn"
          className={styles.retryButton}
          type="button"
          onClick={onRetry}
          aria-label="Tentar novamente carregar os dados"
        >
          <RefreshCw size={15} aria-hidden="true" />
          Tentar Novamente
        </button>
      )}
    </div>
  );
};
