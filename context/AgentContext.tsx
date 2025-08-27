
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { AgentPersona } from '../types';

const LOCAL_STORAGE_KEY = 'steelForgeAI_agentConfig_v2';

const presetPersonas: AgentPersona[] = [
    {
        id: 'preset-s-eng-01',
        name: 'Structural Engineer',
        description: 'Skilled in steel/concrete design, FEA, and Eurocode standards.',
        systemPrompt: `You are a seasoned structural engineer skilled in steel and concrete design, finite element analysis, and Eurocode standards. When asked to perform analysis, you will:
1.  Clearly define beam geometry, loading, and boundary conditions.
2.  Use a finite element analysis approach.
3.  Provide results as bending moment/shear force diagrams, deflection values, and stress plots.
4.  Suggest design improvements if deflection exceeds L/250.
5.  Always output results in the requested format (e.g., CSV, PNG, Markdown).`,
        isPreset: true,
    },
    {
        id: 'preset-cam-01',
        name: 'CAM Specialist',
        description: 'Deep knowledge of G-code for 3-axis CNC milling.',
        systemPrompt: `You are a CAM specialist with deep knowledge of G-code for 3-axis CNC milling. When a request is made, you must:
1.  Define the workpiece stock, material, and dimensions.
2.  Specify the tool to be used (e.g., end mill diameter, flutes).
3.  Define the roughing and finishing operations with specific parameters (step-down, feed rate, RPM).
4.  Describe the exact toolpath (e.g., pocketing, drilling).
5.  Output the full, valid G-code, including safety and tool-change commands.`,
        isPreset: true,
    },
    {
        id: 'preset-cfd-01',
        name: 'CFD Engineer',
        description: 'Skilled in OpenFOAM, turbulence modeling, and fluid dynamics analysis.',
        systemPrompt: `You are a computational fluid dynamics engineer skilled in OpenFOAM and turbulence modeling. Your process is as follows:
1.  Define the geometry to be analyzed (e.g., airfoil type, dimensions).
2.  Specify the mesh requirements (e.g., structured, y+ value, density).
3.  Outline the simulation parameters (solver, inlet velocity, turbulence model, convergence criteria).
4.  For post-processing, you will always provide pressure coefficient plots, lift/drag coefficients, and streamline visualizations.
5.  Deliverables must include the OpenFOAM case folder structure and any necessary Python plotting scripts.`,
        isPreset: true,
    },
    {
        id: 'preset-cad-auto-01',
        name: 'CAD Automation Engineer',
        description: 'Proficient in Python scripting for FreeCAD and parametric modeling.',
        systemPrompt: `You are an expert CAD automation engineer proficient in Python scripting for FreeCAD and parametric modeling. When asked to generate a script, you will:
1.  Create the primary geometry with specified dimensions.
2.  Add secondary features like holes or fillets with precise parameters.
3.  Export the final model to all requested file formats (e.g., STEP, DWG).
4.  The output must be a single, fully commented Python script ready to be executed in FreeCAD.`,
        isPreset: true,
    }
];

interface AgentContextType {
  personas: AgentPersona[];
  activePersonaId: string | null;
  addPersona: (persona: Omit<AgentPersona, 'id'>) => void;
  updatePersona: (personaId: string, updates: Partial<AgentPersona>) => void;
  deletePersona: (personaId: string) => void;
  setActivePersonaId: (id: string | null) => void;
  getActivePersona: () => AgentPersona | undefined;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [personas, setPersonas] = useState<AgentPersona[]>([]);
    const [activePersonaId, setActivePersonaId] = useState<string | null>(null);

    useEffect(() => {
        try {
            const storedState = window.localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedState) {
                const state = JSON.parse(storedState);
                // Combine stored custom personas with presets
                const customPersonas = state.personas.filter((p: AgentPersona) => !p.isPreset);
                setPersonas([...presetPersonas, ...customPersonas]);
                setActivePersonaId(state.activePersonaId || presetPersonas[0].id);
            } else {
                // Initialize with presets if nothing is stored
                setPersonas(presetPersonas);
                setActivePersonaId(presetPersonas[0].id);
            }
        } catch (error) {
            console.error("Failed to load agent config from localStorage", error);
            setPersonas(presetPersonas);
            setActivePersonaId(presetPersonas[0].id);
        }
    }, []);

    useEffect(() => {
        try {
            // Only store custom personas and the active ID
            const customPersonas = personas.filter(p => !p.isPreset);
            const stateToStore = {
                personas: customPersonas,
                activePersonaId: activePersonaId,
            };
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
        } catch (error) {
            console.error("Failed to save agent config to localStorage", error);
        }
    }, [personas, activePersonaId]);
  
    const addPersona = useCallback((personaData: Omit<AgentPersona, 'id'>) => {
        const newPersona: AgentPersona = { ...personaData, id: `persona-${Date.now()}` };
        setPersonas(prev => [...prev, newPersona]);
    }, []);

    const updatePersona = useCallback((personaId: string, updates: Partial<AgentPersona>) => {
        setPersonas(prev => prev.map(p => p.id === personaId ? { ...p, ...updates } : p));
    }, []);

    const deletePersona = useCallback((personaId: string) => {
        setPersonas(prev => prev.filter(p => p.id !== personaId));
        // If the deleted persona was active, reset to the first preset
        if (activePersonaId === personaId) {
            setActivePersonaId(presetPersonas[0].id);
        }
    }, [activePersonaId]);

    const getActivePersona = useCallback(() => {
        return personas.find(p => p.id === activePersonaId);
    }, [personas, activePersonaId]);

    const value = {
        personas,
        activePersonaId,
        addPersona,
        updatePersona,
        deletePersona,
        setActivePersonaId,
        getActivePersona
    };

    return (
        <AgentContext.Provider value={value}>
            {children}
        </AgentContext.Provider>
    );
};

export const useAgent = (): AgentContextType => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};
