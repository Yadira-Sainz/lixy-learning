'use client'

import React from 'react';
import { useLocale } from '@/contexts/locale-context';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  completedCount?: number;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, completedCount = 20 }) => {
  const { t } = useLocale();

  if (!isOpen) return null;

  const message = `${t('modal.completedReviewPrefix')} ${completedCount} ${t('modal.completedReviewSuffix')}`;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.text}>{t('modal.congrats')}</h2>
        <p style={styles.text}>{message}</p>
        <button onClick={onClose} style={styles.button}>
          {t('modal.goToDashboard')}
        </button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const, // Cambiado a 'as const'
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center' as const, // Cambiado a 'as const'
  },
  text: {
    color: '#000',
  },
  button: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default Modal;