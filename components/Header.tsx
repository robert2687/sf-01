
import React from 'react';
import { CubeIcon } from './icons';

export function Header(): React.ReactElement {
  return (
    <header className="bg-secondary p-4 shadow-md sticky top-0 z-40">
      <div className="container mx-auto flex items-center">
        <CubeIcon className="w-8 h-8 text-highlight mr-3" />
        <h1 className="text-2xl font-bold text-light">SteelForge AI</h1>
      </div>
    </header>
  );
};