import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  height?: string;
  width?: string;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ height, width, borderRadius, className = '' }) => {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        height: height || '100%',
        width: width || '100%',
        borderRadius: borderRadius || undefined,
      }}
    />
  );
};
