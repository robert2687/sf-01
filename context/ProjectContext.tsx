

import React, { createContext, useState, useCallback, useContext, ReactNode, useEffect } from 'react';
import { Project, DesignInput, ModelOutput, ExecutionPlan, Task, ProjectContextType, getDesignInputType } from '../types';

let projectContextInstance: React.Context<ProjectContextType | undefined> | null = null;

function getProjectContext(): React.Context<ProjectContextType | undefined> {
    if (!projectContextInstance) {
        projectContextInstance = createContext<ProjectContextType | undefined>(undefined);
    }
    return projectContextInstance;
}

let _project_local_storage_key: string | null = null;
function getProjectLocalStorageKey(): string {
    if (!_project_local_storage_key) {
        _project_local_storage_key = 'steelForgeAI_projects';
    }
    return _project_local_storage_key;
}

function getInitialProjects(): Project[] {
    const DesignInputType = getDesignInputType();
    return [
        {
            id: 'proj-1',
            name: 'Workshop Concept',
            description: 'A 20x15m steel framed workshop for light industrial use.',
            createdAt: new Date().toISOString(),
            inputs: [
                { id: 'input-1', type: DesignInputType.TEXT, data: 'A 20m wide by 15m deep steel portal frame warehouse with a 10-degree gable roof. Eave height should be 6m. Include one large roller door on the front gable end.' }
            ],
            models: [],
            plans: [],
        }
    ];
}

export function ProjectProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
        const storedProjects = window.localStorage.getItem(getProjectLocalStorageKey());
        if (storedProjects) {
            // A simple migration: If a stored project doesn't have a 'plans' array, add it.
            const parsedProjects = JSON.parse(storedProjects);
            return parsedProjects.map((p: Project) => ({ ...p, plans: p.plans || [] }));
        }
    } catch (error) {
        console.error("Failed to parse projects from localStorage", error);
    }
    return getInitialProjects();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(getProjectLocalStorageKey(), JSON.stringify(projects));
    } catch (error) {
      console.error("Failed to save projects to localStorage", error);
    }
  }, [projects]);


  const addProject = useCallback((name: string, description: string) => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      description,
      inputs: [],
      models: [],
      plans: [],
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, newProject]);
  }, []);

  const getProjectById = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);
  
  const getInputsByIds = useCallback((projectId: string, inputIds: string[]): DesignInput[] => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return [];
    return project.inputs.filter(input => inputIds.includes(input.id));
  }, [projects]);

  const addInputToProject = useCallback((projectId: string, input: Omit<DesignInput, 'id'>) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const newInput: DesignInput = { ...input, id: `input-${Date.now()}` };
        return { ...p, inputs: [...p.inputs, newInput] };
      }
      return p;
    }));
  }, []);
  
  const addModelToProject = useCallback((projectId: string, modelData: Omit<ModelOutput, 'id'>) => {
    const newModelId = `model-${Date.now()}`;
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const newModel: ModelOutput = { ...modelData, id: newModelId };
        return { ...p, models: [newModel, ...p.models] };
      }
      return p;
    }));
    return newModelId;
  }, []);

  const updateModel = useCallback((projectId: string, modelId: string, updates: Partial<ModelOutput>) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          models: p.models.map(m => m.id === modelId ? { ...m, ...updates } : m)
        };
      }
      return p;
    }));
  }, []);
  
  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            return { ...p, ...updates };
        }
        return p;
    }));
  }, []);

  const addPlanToProject = useCallback((projectId: string, plan: ExecutionPlan) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, plans: [plan, ...(p.plans || [])] };
      }
      return p;
    }));
  }, []);

  const updatePlan = useCallback((projectId: string, planId: string, updates: Partial<ExecutionPlan>) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, plans: p.plans.map(pl => pl.id === planId ? { ...pl, ...updates } : pl) };
      }
      return p;
    }));
  }, []);

  const updateTaskInPlan = useCallback((projectId: string, planId: string, taskId: string, updates: Partial<Task>) => {
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            return {
                ...p,
                plans: p.plans.map(plan => {
                    if (plan.id === planId) {
                        return {
                            ...plan,
                            tasks: plan.tasks.map(task => task.id === taskId ? { ...task, ...updates } : task)
                        };
                    }
                    return plan;
                })
            };
        }
        return p;
    }));
  }, []);


  const value = { projects, addProject, getProjectById, addInputToProject, addModelToProject, updateModel, getInputsByIds, updateProject, addPlanToProject, updatePlan, updateTaskInPlan };
  
  const ProjectContext = getProjectContext();
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export function useProjects(): ProjectContextType {
  const ProjectContext = getProjectContext();
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}