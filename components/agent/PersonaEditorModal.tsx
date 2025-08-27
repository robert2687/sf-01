
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAgent } from '../../context/AgentContext';
import { AgentPersona } from '../../types';

interface PersonaEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    persona: AgentPersona | null;
}

export function PersonaEditorModal({ isOpen, onClose, persona }: PersonaEditorModalProps): React.ReactElement {
    const { addPersona, updatePersona } = useAgent();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');

    const isEditing = persona && persona.id;
    const isDuplicating = persona && !persona.id;

    useEffect(() => {
        if (persona) {
            setName(persona.name);
            setDescription(persona.description);
            setSystemPrompt(persona.systemPrompt);
        } else {
            // Reset for new persona
            setName('');
            setDescription('');
            setSystemPrompt('');
        }
    }, [persona, isOpen]);

    function handleSubmit() {
        const personaData = { name, description, systemPrompt };
        if (isEditing) {
            updatePersona(persona!.id, personaData);
        } else { // Handles both new and duplicated
            addPersona(personaData);
        }
        onClose();
    }

    const modalTitle = isEditing ? "Edit Persona" : (isDuplicating ? "Duplicate Persona" : "Create New Persona");

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="persona-name" className="block text-sm font-medium text-muted mb-1">Persona Name</label>
                    <input
                        id="persona-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Structural Engineer"
                        className="w-full bg-primary text-light px-3 py-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
                    />
                </div>
                 <div>
                    <label htmlFor="persona-desc" className="block text-sm font-medium text-muted mb-1">Description</label>
                    <input
                        id="persona-desc"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A brief summary of this persona's expertise."
                        className="w-full bg-primary text-light px-3 py-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
                    />
                </div>
                <div>
                    <label htmlFor="persona-prompt" className="block text-sm font-medium text-muted mb-1">System Prompt</label>
                    <textarea
                        id="persona-prompt"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="Define the AI's role, expertise, and how it should perform tasks..."
                        rows={10}
                        className="w-full bg-primary text-light p-3 rounded-md border border-gray-600 focus:ring-accent focus:border-accent font-mono text-xs"
                    />
                     <div className="mt-3 p-3 bg-primary rounded-md border border-gray-700 text-xs text-muted space-y-3">
                        <h4 className="font-semibold text-sm text-light">System Prompt Best Practices</h4>
                        
                        <div>
                            <strong className="text-light">Key Components:</strong>
                            <ul className="list-disc list-inside pl-2 space-y-1 mt-1">
                                <li><strong>Role Title:</strong> Describe the persona (e.g., "seasoned structural engineer").</li>
                                <li><strong>Domain Expertise:</strong> Call out the specific field (e.g., "steel design, finite-element analysis").</li>
                                <li><strong>Standards & Guidelines:</strong> Mention relevant codes (Eurocode), file formats (DWG), or tools (FreeCAD).</li>
                                <li><strong>Tone & Style:</strong> Specify clarity, precision, and adherence to technical conventions.</li>
                            </ul>
                        </div>

                        <div>
                            <strong className="text-light">Advanced Prompting Techniques:</strong>
                             <div className="space-y-2 mt-1">
                                <details className="p-2 rounded-md bg-secondary/50">
                                    <summary className="cursor-pointer font-semibold text-light hover:text-highlight">1. Embedding Few-Shot Examples</summary>
                                    <p className="mt-2">Show the AI exactly how to map inputs to outputs. Embed a few concise input/output pairs directly in the system message to demonstrate the required style, tone, and format.</p>
                                </details>
                                <details className="p-2 rounded-md bg-secondary/50">
                                    <summary className="cursor-pointer font-semibold text-light hover:text-highlight">2. Using Chain-of-Thought</summary>
                                    <p className="mt-2">Encourage transparency by asking the model to surface its reasoning. Use a directive like "Think step by step:" and require it to list each calculation or assumption before giving the final answer.</p>
                                </details>
                                 <details className="p-2 rounded-md bg-secondary/50">
                                    <summary className="cursor-pointer font-semibold text-light hover:text-highlight">3. Adding Automated Validation</summary>
                                    <p className="mt-2">Specify assertions the model must perform on its own results. Phrase checks like "After computing X, verify it meets constraint Y." This ensures the AI doesn't stop short of critical checks (e.g., deflection limits).</p>
                                </details>
                                <details className="p-2 rounded-md bg-secondary/50">
                                    <summary className="cursor-pointer font-semibold text-light hover:text-highlight">Combined Example</summary>
                                    <pre className="bg-black/30 p-2 rounded mt-2 text-white/90 whitespace-pre-wrap"><code>
{`{
  "role": "system",
  "content": "You are a seasoned structural engineer specializing in steel beam design under Eurocode. Follow these guidelines:\\n\\n# Few-Shot Examples\\n\\nExample 1:\\nInput: \\"Calculate bending moment for a 6 m simply supported beam with UDL of 5 kN/m.\\"\\nOutput: \\"Step 1: M_max = wL^2/8 = 5×6^2/8 = 22.5 kN·m.\\"\\n\\nExample 2:\\nInput: \\"Check deflection for same beam with EI = 2.4×10^10 N·m^2.\\"\\nOutput: \\"Step 1: δ_max = 5wL^4/(384 EI)… = 6.56 mm.\\"\\n\\n# Reasoning Instructions\\nAlways think step by step:\\n1. List knowns and unknowns.\\n2. Show formula derivation.\\n3. Calculate intermediate values.\\n\\n# Validation Checks\\nAfter computing deflection, verify it meets L/250:\\n- If δ_max > L/250, state: \\"Deflection exceeds limit. Suggest increasing section modulus or using higher-grade steel.\\""
}`}
                                    </code></pre>
                                </details>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Persona</Button>
                </div>
            </div>
        </Modal>
    );
};
