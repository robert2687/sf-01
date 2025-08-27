

import { ToolName } from './agent/tools';

// Agent Persona for configuration
export interface AgentPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  isPreset?: boolean;
}


// --- TaskStatus ---
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
let _TaskStatus: { [K in TaskStatus]: K } | null = null;
export function getTaskStatus() {
    if (!_TaskStatus) {
        _TaskStatus = Object.freeze({
            PENDING: 'PENDING',
            IN_PROGRESS: 'IN_PROGRESS',
            COMPLETED: 'COMPLETED',
            FAILED: 'FAILED',
        });
    }
    return _TaskStatus;
}


export interface Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  toolName: ToolName;
  arguments: any;
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  tasks: Task[];
  status: TaskStatus; // Overall status of the plan
  createdAt: string;
  modelId?: string; // The model being created or refined by this plan
  systemPrompt?: string; // The system prompt from the active persona
}


// --- DesignInputType ---
export type DesignInputType = 'TEXT' | 'IMAGE' | 'DXF';
let _DesignInputType: { [K in DesignInputType]: K } | null = null;
export function getDesignInputType() {
    if (!_DesignInputType) {
        _DesignInputType = Object.freeze({
            TEXT: 'TEXT',
            IMAGE: 'IMAGE',
            DXF: 'DXF',
        });
    }
    return _DesignInputType;
}


// --- ModelStatus ---
export type ModelStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
let _ModelStatus: { [K in ModelStatus]: K } | null = null;
export function getModelStatus() {
    if (!_ModelStatus) {
        _ModelStatus = Object.freeze({
            PENDING: 'PENDING',
            GENERATING: 'GENERATING',
            COMPLETED: 'COMPLETED',
            FAILED: 'FAILED',
        });
    }
    return _ModelStatus;
}


export interface DesignInput {
  id: string;
  type: DesignInputType;
  data: string; // Text content, Base64 data URL for images, or DXF file content
  fileName?: string;
}

export interface BillOfMaterialsItem {
  component: string;
  quantity: number;
  estimatedMaterial: string;
}

export interface ModelOutput {
  id:string;
  projectId: string;
  status: ModelStatus;
  description: string;
  engineeringRationale?: string; // AI's explanation for design choices
  modelCode?: string; // React component code for the 3D model
  billOfMaterials?: BillOfMaterialsItem[];
  modelUrl?: string; // URL to a GLB file
  thumbnailUrl?: string;
  inputIds: string[];
  refinementOf?: string; // ID of the model this is a refinement of
  createdAt: string;
  failureReason?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  inputs: DesignInput[];
  models: ModelOutput[];
  plans: ExecutionPlan[];
  createdAt: string;
  visualBrief?: { text: string; imageUrl: string; };
}

export interface MarketplaceComponent {
  id: string;
  name: string;
  description: string;
  category: string;
  previewImageUrl: string;
  modelCode: string; // React component code
}

export interface StructuralAnalysisResult {
    report: string; // Markdown formatted report
    data: string;   // CSV formatted data
    imageUrl: string; // base64 data URL for the plot image
}

export interface CfdAnalysisResult {
    report: string; // Markdown formatted report
    data: string;   // CSV formatted data
    imageUrl: string; // base64 data URL for the plot image
}

export interface ProjectContextType {
  projects: Project[];
  addProject: (name: string, description: string) => void;
  getProjectById: (id: string) => Project | undefined;
  addInputToProject: (projectId: string, input: Omit<DesignInput, 'id'>) => void;
  addModelToProject: (projectId: string, model: Omit<ModelOutput, 'id'>) => string;
  updateModel: (projectId: string, modelId: string, updates: Partial<ModelOutput>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  getInputsByIds: (projectId: string, inputIds: string[]) => DesignInput[];
  addPlanToProject: (projectId: string, plan: ExecutionPlan) => void;
  updatePlan: (projectId: string, planId: string, updates: Partial<ExecutionPlan>) => void;
  updateTaskInPlan: (projectId: string, planId: string, taskId: string, updates: Partial<Task>) => void;
}