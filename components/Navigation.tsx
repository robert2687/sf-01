
import React from 'react';
import { CubeIcon, LayoutGridIcon, CogIcon, BookOpenIcon } from './icons';

type View = 'projects' | 'marketplace' | 'agent' | 'guides';

interface NavigationProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, isActive, onClick }: NavButtonProps): React.ReactElement {
  const baseClasses = "flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200";
  const activeClasses = "bg-accent text-white";
  const inactiveClasses = "text-muted hover:bg-secondary hover:text-light";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};


export function Navigation({ currentView, onNavigate }: NavigationProps): React.ReactElement {
  return (
    <nav className="bg-primary border-b border-secondary">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-2 py-2">
            <NavButton
                label="My Projects"
                icon={<CubeIcon className="w-5 h-5" />}
                isActive={currentView === 'projects'}
                onClick={() => onNavigate('projects')}
            />
            <NavButton
                label="Marketplace"
                icon={<LayoutGridIcon className="w-5 h-5" />}
                isActive={currentView === 'marketplace'}
                onClick={() => onNavigate('marketplace')}
            />
            <NavButton
                label="AI Agent"
                icon={<CogIcon className="w-5 h-5" />}
                isActive={currentView === 'agent'}
                onClick={() => onNavigate('agent')}
            />
             <NavButton
                label="Guides"
                icon={<BookOpenIcon className="w-5 h-5" />}
                isActive={currentView === 'guides'}
                onClick={() => onNavigate('guides')}
            />
        </div>
      </div>
    </nav>
  );
};