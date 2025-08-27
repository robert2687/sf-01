

import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };
    return (
        <div className="flex justify-center items-center">
            <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-highlight`}></div>
        </div>
    );
};
