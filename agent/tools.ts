

// This file defines the tools available to the SteelForge AI Agent.

export const Tools = {
  INITIAL_MODEL_GENERATOR: 'INITIAL_MODEL_GENERATOR',
  MODEL_REFINER: 'MODEL_REFINER',
  CODE_GENERATOR: 'CODE_GENERATOR',
  STRUCTURAL_ANALYSIS: 'STRUCTURAL_ANALYSIS', // For future use
  BIM_DATA_ATTACHER: 'BIM_DATA_ATTACHER',     // For future use
};

export interface ToolDefinition {
  name: string;
  description: string;
}

export const toolDefinitions: { [key:string]: ToolDefinition } = {
  [Tools.INITIAL_MODEL_GENERATOR]: {
    name: 'Generate Initial 3D Model',
    description: 'Generates a new 3D model from a set of initial design inputs (text, images). This involves creating a description and then generating the code.',
  },
  [Tools.MODEL_REFINER]: {
    name: 'Refine Existing 3D Model',
    description: 'Modifies an existing 3D model based on user feedback and refinement instructions.',
  },
  [Tools.CODE_GENERATOR]: {
    name: 'Generate External Tool Script',
    description: 'Generates code scripts for external 3D modeling software like Blender (Python), Three.js (JavaScript), or OpenSCAD.',
  },
  [Tools.STRUCTURAL_ANALYSIS]: {
    name: 'Analyze Structural Integrity',
    description: 'Performs a simulated structural analysis on a model to check for weaknesses. (Not implemented)',
  },
  [Tools.BIM_DATA_ATTACHER]: {
    name: 'Attach BIM Data',
    description: 'Attaches Building Information Modeling (BIM) data, like materials and costs, to a model. (Not implemented)',
  },
};
