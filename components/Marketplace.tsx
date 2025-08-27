

import React, { useState, useEffect } from 'react';
import { getMarketplaceComponents } from '../services/marketplaceService';
import { MarketplaceComponent, ModelOutput, getModelStatus } from '../types';
import { useProjects } from '../context/ProjectContext';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';
import { AddToProjectModal } from './AddToProjectModal';
import { CheckCircleIcon, PlusIcon } from './icons';

interface MarketplaceProps {
  onNavigateToProject: (projectId: string) => void;
}

export function Marketplace({ onNavigateToProject }: MarketplaceProps): React.ReactElement {
  const { addModelToProject } = useProjects();
  const [components, setComponents] = useState<MarketplaceComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState<MarketplaceComponent | null>(null);
  const [addedInfo, setAddedInfo] = useState<{ projectId: string, componentName: string } | null>(null);
  const ModelStatus = getModelStatus();

  useEffect(() => {
    async function fetchComponents() {
      setIsLoading(true);
      const fetchedComponents = await getMarketplaceComponents();
      setComponents(fetchedComponents);
      setIsLoading(false);
    }
    fetchComponents();
  }, []);

  function handleOpenModal(component: MarketplaceComponent) {
    setSelectedComponent(component);
  }

  function handleConfirmAdd(projectId: string) {
    if (selectedComponent) {
      const newModel: Omit<ModelOutput, 'id'> = {
        projectId,
        status: ModelStatus.COMPLETED,
        description: `Marketplace Component: ${selectedComponent.name}. ${selectedComponent.description}`,
        modelCode: selectedComponent.modelCode,
        inputIds: [], // No user inputs for marketplace items
        createdAt: new Date().toISOString(),
        billOfMaterials: [], // Marketplace items don't have BOMs in this version
      };
      addModelToProject(projectId, newModel);
      setAddedInfo({ projectId, componentName: selectedComponent.name });
      setSelectedComponent(null);
      setTimeout(() => setAddedInfo(null), 5000);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Component Marketplace</h2>
        {addedInfo && (
            <div className="flex items-center space-x-2 text-green-400 bg-secondary p-3 rounded-md shadow-lg animate-fade-in-up">
                <CheckCircleIcon className="w-6 h-6" />
                <span className="font-medium">"{addedInfo.componentName}" added!</span>
                <Button 
                  variant="secondary" 
                  className="ml-4 !text-xs !py-1 !px-3" 
                  onClick={() => onNavigateToProject(addedInfo.projectId)}>
                    Go to Project
                </Button>
            </div>
        )}
      </div>
      <p className="text-muted mb-8 max-w-2xl">
        Browse pre-built components from the community to accelerate your design process. Click "Add to Project" to import a component into your own workspace.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {components.map(component => (
          <Card key={component.id} className="flex flex-col group bg-secondary">
            <div className="relative aspect-[16/9] bg-primary overflow-hidden">
              <img src={component.previewImageUrl} alt={`${component.name} preview`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="p-6 flex-grow flex flex-col">
              <p className="text-sm font-semibold text-accent">{component.category.toUpperCase()}</p>
              <h3 className="text-xl font-bold text-highlight mt-1">{component.name}</h3>
              <p className="text-muted mt-2 flex-grow">{component.description}</p>
              <Button
                onClick={() => handleOpenModal(component)}
                className="w-full mt-4"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add to Project
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AddToProjectModal
        isOpen={!!selectedComponent}
        onClose={() => setSelectedComponent(null)}
        onConfirm={handleConfirmAdd}
        componentName={selectedComponent?.name || ''}
      />
    </div>
  );
};