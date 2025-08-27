
// Agent Persona for configuration
export interface AgentPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  isPreset?: boolean;
}


// Content from agent/task.ts moved here to break circular dependency
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  toolName: string;
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


export enum DesignInputType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DXF = 'DXF',
}

export enum ModelStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
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
  previewImageUrl?: string;
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