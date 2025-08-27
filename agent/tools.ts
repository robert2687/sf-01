// This file defines the tools available to the SteelForge AI Agent.

// A string union type to ensure type safety for tool names.
export type ToolName =
  | 'INITIAL_MODEL_GENERATOR'
  | 'MODEL_REFINER'
  | 'CODE_GENERATOR'
  | 'STRUCTURAL_ANALYSIS'
  | 'BIM_DATA_ATTACHER';

// An interface for the tools object.
interface ToolsObject {
  INITIAL_MODEL_GENERATOR: 'INITIAL_MODEL_GENERATOR';
  MODEL_REFINER: 'MODEL_REFINER';
  CODE_GENERATOR: 'CODE_GENERATOR';
  STRUCTURAL_ANALYSIS: 'STRUCTURAL_ANALYSIS';
  BIM_DATA_ATTACHER: 'BIM_DATA_ATTACHER';
}

let toolsInstance: ToolsObject | null = null;

/**
 * Provides a lazy-initialized singleton object for tool names.
 * This avoids a complex top-level constant initialization, which can cause
 * parsing errors in some sensitive build environments.
 * @returns {ToolsObject} The frozen tools object.
 */
export function getTools(): ToolsObject {
    if (!toolsInstance) {
        toolsInstance = Object.freeze({
            INITIAL_MODEL_GENERATOR: 'INITIAL_MODEL_GENERATOR',
            MODEL_REFINER: 'MODEL_REFINER',
            CODE_GENERATOR: 'CODE_GENERATOR',
            STRUCTURAL_ANALYSIS: 'STRUCTURAL_ANALYSIS',
            BIM_DATA_ATTACHER: 'BIM_DATA_ATTACHER',
        });
    }
    return toolsInstance;
}
