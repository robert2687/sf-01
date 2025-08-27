
import React, { useState } from 'react';
import { useAgent } from '../../context/AgentContext';
import { CogIcon, PlusIcon, SparklesIcon } from '../icons';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { AgentPersona } from '../../types';
import { PersonaEditorModal } from './PersonaEditorModal';

export const AgentView: React.FC = () => {
    const { personas, activePersonaId, setActivePersonaId, deletePersona } = useAgent();
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingPersona, setEditingPersona] = useState<AgentPersona | null>(null);

    const handleCreate = () => {
        setEditingPersona(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (persona: AgentPersona) => {
        setEditingPersona(persona);
        setIsEditorOpen(true);
    };
    
    const handleDuplicate = (persona: AgentPersona) => {
        setEditingPersona({
            ...persona,
            id: '', // Clear ID to indicate duplication
            name: `${persona.name} (Copy)`,
            isPreset: false,
        });
        setIsEditorOpen(true);
    };

    const handleDelete = (persona: AgentPersona) => {
        if (!persona.isPreset && window.confirm(`Are you sure you want to delete the "${persona.name}" persona?`)) {
            deletePersona(persona.id);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <CogIcon className="w-10 h-10 text-highlight" />
                    <h2 className="text-3xl font-bold">AI Agent Personas</h2>
                </div>
                <Button onClick={handleCreate}>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create New Persona
                </Button>
            </div>
            <p className="text-muted mb-8 max-w-3xl">
                Manage AI personas to control the agent's expertise and behavior. The active persona's System Prompt will guide the AI in all generation and analysis tasks.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {personas.map(persona => (
                    <Card key={persona.id} className={`flex flex-col border-2 ${activePersonaId === persona.id ? 'border-highlight' : 'border-secondary'}`}>
                        <div className="p-6 flex-grow">
                             {persona.isPreset && (
                                <div className="text-xs font-bold uppercase text-accent mb-2 flex items-center">
                                    <SparklesIcon className="w-4 h-4 mr-1.5"/>
                                    Preset Persona
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-light">{persona.name}</h3>
                            <p className="text-muted mt-2 flex-grow min-h-[40px]">{persona.description}</p>
                        </div>
                        <div className="p-4 bg-gray-800 border-t border-gray-700 space-y-2">
                             <Button
                                variant={activePersonaId === persona.id ? 'primary' : 'secondary'}
                                onClick={() => setActivePersonaId(persona.id)}
                                className="w-full"
                                disabled={activePersonaId === persona.id}
                            >
                                {activePersonaId === persona.id ? 'Active Persona' : 'Set as Active'}
                            </Button>
                            <div className="flex space-x-2">
                                <Button variant="secondary" onClick={() => handleEdit(persona)} className="w-full text-xs">Edit</Button>
                                <Button variant="secondary" onClick={() => handleDuplicate(persona)} className="w-full text-xs">Duplicate</Button>
                                {!persona.isPreset && (
                                    <Button variant="danger" onClick={() => handleDelete(persona)} className="w-full text-xs">Delete</Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            
            <PersonaEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                persona={editingPersona}
            />
        </div>
    );
};
