
import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Modal } from './common/Modal';
import { Button } from './common/Button';

interface AddToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (projectId: string) => void;
  componentName: string;
}

export const AddToProjectModal: React.FC<AddToProjectModalProps> = ({ isOpen, onClose, onConfirm, componentName }) => {
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects.length > 0 ? projects[0].id : '');

  const handleSubmit = () => {
    if (selectedProjectId) {
      onConfirm(selectedProjectId);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add "${componentName}" to Project`}>
      {projects.length === 0 ? (
        <p className="text-muted">You need to create a project first before adding components.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-muted">Select a project to add this component to.</p>
          <div>
            <label htmlFor="project-select" className="block text-sm font-medium text-light mb-1">
              Project
            </label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-primary text-light px-3 py-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Add to Project
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
