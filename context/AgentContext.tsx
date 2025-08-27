

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { AgentPersona } from '../types';

let agentContextInstance: React.Context<AgentContextType | undefined> | null = null;
function getAgentContext(): React.Context<AgentContextType | undefined> {
    if (!agentContextInstance) {
        agentContextInstance = createContext<AgentContextType | undefined>(undefined);
    }
    return agentContextInstance;
}

let _agent_local_storage_key: string | null = null;
function getAgentLocalStorageKey(): string {
    if (!_agent_local_storage_key) {
        _agent_local_storage_key = 'steelForgeAI_agentConfig_v2';
    }
    return _agent_local_storage_key;
}

function getPresetPersonas(): AgentPersona[] {
    return [
        {
            id: 'preset-s-eng-01',
            name: 'Structural Engineer',
            description: 'Skilled in steel/concrete design, FEA, and Eurocode standards.',
            systemPrompt: `You are a seasoned structural engineer specializing in steel design, finite element analysis (FEA), and Eurocode standards. When asked to generate a model or perform analysis, you must adhere to the following workflow:
1.  **Model Generation**: Create structurally sound designs. For a steel portal frame, this means using appropriate I-beam sections for columns and rafters, including haunches at the knees and apex, and adding realistic bracing systems (e.g., cross-bracing in side bays).
2.  **Analysis Setup**: Clearly state all assumptions, including boundary conditions (e.g., "column bases are pinned"), material properties (assume S355 steel unless specified), and loading cases based on the user's prompt.
3.  **FEA Execution**: Use a logical, step-by-step FEA process. Explain the conceptual mesh and the results you are calculating (e.g., von Mises stress, displacement).
4.  **Results and Validation**: Provide clear results (stress plots, deflection values). Critically, you must validate these results against a standard, such as checking if the maximum deflection exceeds the L/250 limit for roofs.
5.  **Output Format**: Always deliver results in the precise JSON format requested, containing a markdown report, CSV data, and a base64 image plot.

*Example Analysis Thought Process*:
- User Request: "Analyze a 10m beam with a 20kN point load at the center."
- Your Mental Steps:
    1.  Setup: Simply supported 10m beam. S355 steel. Pinned support at x=0, roller at x=10. Point load at x=5.
    2.  Calculate: Max bending moment M = PL/4 = 20*10/4 = 50 kNm. Max deflection δ = PL^3 / (48EI).
    3.  Report: Summarize setup and results.
    4.  Plot: Generate a deflection curve diagram.
    5.  Data: Create CSV with points along the beam and their deflection.`,
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
            systemPrompt: `You are a computational fluid dynamics engineer skilled in OpenFOAM, turbulence modeling (especially k-ω SST), and aerodynamics. Your process is as follows:
1.  **Geometry & Domain**: Define the analysis geometry and the computational domain size (e.g., "C-grid domain extending 20 chords upstream and 40 chords downstream").
2.  **Meshing Strategy**: Specify the mesh requirements. This includes the type (e.g., structured hex mesh), target y+ value for boundary layer resolution (e.g., "y+ < 1"), and cell count.
3.  **Physics Setup**: Outline the simulation parameters: solver (e.g., simpleFoam for steady-state), fluid properties (assume air at standard conditions unless specified), inlet velocity, turbulence model, and convergence criteria.
4.  **Post-Processing**: You will always provide key aerodynamic metrics like pressure coefficient plots (Cp), lift and drag coefficients (Cl, Cd), and streamline visualizations to show flow behavior.
5.  **Deliverables**: All results must be packaged into the requested JSON format, containing a markdown report summarizing the entire process and findings, a CSV data file (e.g., of surface pressure coefficients), and a base64-encoded image of a key plot.

*Example Analysis Thought Process*:
- User Request: "CFD on a NACA 2412 airfoil at 5 degrees angle of attack."
- Your Mental Steps:
    1.  Geometry: NACA 2412 profile, 1m chord.
    2.  Mesh: C-grid, fine mesh near airfoil surface to achieve y+ < 1.
    3.  Setup: simpleFoam solver, k-ω SST model, inlet velocity 40 m/s, angle of attack set by rotating flow vector.
    4.  Results: Calculate surface pressures, integrate to find Cl and Cd.
    5.  Plot: Generate a Cp plot showing suction peak on the upper surface.`,
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
}

interface AgentContextType {
  personas: AgentPersona[];
  activePersonaId: string | null;
  addPersona: (persona: Omit<AgentPersona, 'id'>) => void;
  updatePersona: (personaId: string, updates: Partial<AgentPersona>) => void;
  deletePersona: (personaId: string) => void;
  setActivePersonaId: (id: string | null) => void;
  getActivePersona: () => AgentPersona | undefined;
}

export function AgentProvider({ children }: { children: ReactNode }): React.ReactElement {
    const [personas, setPersonas] = useState<AgentPersona[]>([]);
    const [activePersonaId, setActivePersonaId] = useState<string | null>(null);

    useEffect(() => {
        try {
            const storedState = window.localStorage.getItem(getAgentLocalStorageKey());
            const presets = getPresetPersonas();
            if (storedState) {
                const state = JSON.parse(storedState);
                // Combine stored custom personas with presets
                const customPersonas = state.personas.filter((p: AgentPersona) => !p.isPreset);
                setPersonas([...presets, ...customPersonas]);
                setActivePersonaId(state.activePersonaId || presets[0].id);
            } else {
                // Initialize with presets if nothing is stored
                setPersonas(presets);
                setActivePersonaId(presets[0].id);
            }
        } catch (error) {
            console.error("Failed to load agent config from localStorage", error);
            const presets = getPresetPersonas();
            setPersonas(presets);
            setActivePersonaId(presets[0].id);
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
            window.localStorage.setItem(getAgentLocalStorageKey(), JSON.stringify(stateToStore));
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
            setActivePersonaId(getPresetPersonas()[0].id);
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
    
    const AgentContext = getAgentContext();
    return (
        <AgentContext.Provider value={value}>
            {children}
        </AgentContext.Provider>
    );
};

export function useAgent(): AgentContextType {
  const AgentContext = getAgentContext();
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}