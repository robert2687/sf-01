

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  const baseClasses = "bg-secondary rounded-lg shadow-lg overflow-hidden";
  const clickableClasses = onClick ? "cursor-pointer hover:shadow-xl hover:ring-2 hover:ring-accent transition-all duration-200" : "";

  return (
    <div className={`${baseClasses} ${clickableClasses} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};
