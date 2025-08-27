
import React, { useState } from 'react';
import { ProjectProvider } from './context/ProjectContext';
import { AgentProvider } from './context/AgentContext';
import { Header } from './components/Header';
import { ProjectList } from './components/ProjectList';
import { ProjectView } from './components/ProjectView';
import { Navigation } from './components/Navigation';
import { Marketplace } from './components/Marketplace';
import { AgentView } from './components/agent/AgentView';
import { DocsView } from './components/DocsView';

type View = 'projects' | 'marketplace' | 'agent' | 'guides';

function App(): React.ReactElement {
  const [currentView, setCurrentView] = useState<View>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  function handleNavigate(view: View) {
    setCurrentView(view);
    // When navigating away, always clear the selected project
    setSelectedProjectId(null);
  }

  function handleSelectProject(id: string) {
    setCurrentView('projects'); // Ensure we are on the projects view
    setSelectedProjectId(id);
  }

  function handleBackToProjects() {
    setSelectedProjectId(null);
  }

  function renderContent() {
    switch (currentView) {
      case 'marketplace':
        return <Marketplace onNavigateToProject={handleSelectProject} />;
      case 'agent':
        return <AgentView />;
      case 'guides':
        return <DocsView />;
      case 'projects':
      default:
        if (selectedProjectId) {
          return <ProjectView projectId={selectedProjectId} onBack={handleBackToProjects} />;
        }
        return <ProjectList onSelectProject={handleSelectProject} />;
    }
  }

  return (
    <ProjectProvider>
      <AgentProvider>
        <div className="min-h-screen bg-primary flex flex-col">
          <Header />
          <Navigation currentView={currentView} onNavigate={handleNavigate} />
          <main className="flex-grow">
            {renderContent()}
          </main>
        </div>
      </AgentProvider>
    </ProjectProvider>
  );
};

export default App;