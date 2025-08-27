import { ExecutionPlan, Task, getTaskStatus, getModelStatus, ProjectContextType } from '../types';
import { getTools } from './tools';
import { generateModelDescription, generateModelData } from '../services/geminiService';

type AgentContext = ProjectContextType;

/**
 * Creates an execution plan for the AI agent based on a high-level goal.
 * @param goal The goal, either 'generate' a new model or 'refine' an existing one.
 * @param args Arguments for the goal, such as input IDs or refinement text.
 * @param systemPrompt The system prompt from the active persona to guide the AI.
 * @returns An ExecutionPlan object.
 */
export function createExecutionPlan(goal: 'generate' | 'refine', args: any, systemPrompt?: string): ExecutionPlan {
    let planId = `plan-${Date.now()}`;
    let tasks: Task[] = [];
    let planGoal: string = '';
    let Tools = getTools(); // Use the lazy getter
    let TaskStatus = getTaskStatus();

    if (goal === 'generate') {
        planGoal = "Create a new 3D model from selected inputs.";
        tasks = [
            {
                id: `${planId}-task-1`,
                name: "Analyzing Inputs & Creating Brief",
                description: "AI will analyze the provided inputs to create a technical description of the 3D model.",
                status: TaskStatus.PENDING,
                toolName: Tools.INITIAL_MODEL_GENERATOR,
                arguments: { inputIds: args.inputIds },
            },
            {
                id: `${planId}-task-2`,
                name: "Generating 3D Geometry & Materials",
                description: "AI will convert the technical description into a renderable component and a Bill of Materials.",
                status: TaskStatus.PENDING,
                toolName: Tools.INITIAL_MODEL_GENERATOR,
                arguments: {}, // Will be populated with description from previous step
            },
        ];
    } else if (goal === 'refine') {
        planGoal = "Refine an existing 3D model based on new instructions.";
        tasks = [
            {
                id: `${planId}-task-1`,
                name: "Re-analyzing Inputs & Refining Brief",
                description: "AI will analyze the original inputs and new instructions to refine the model description.",
                status: TaskStatus.PENDING,
                toolName: Tools.MODEL_REFINER,
                arguments: { inputIds: args.inputIds, refinementText: args.refinementText },
            },
            {
                id: `${planId}-task-2`,
                name: "Generating Refined Geometry & Materials",
                description: "AI will convert the refined description into a new component and an updated Bill of Materials.",
                status: TaskStatus.PENDING,
                toolName: Tools.MODEL_REFINER,
                arguments: {}, // Will be populated with description from previous step
            },
        ];
    }

    return {
        id: planId,
        goal: planGoal,
        tasks,
        status: TaskStatus.PENDING,
        createdAt: new Date().toISOString(),
        modelId: args.modelId,
        systemPrompt: systemPrompt,
    };
}

/**
 * Executes a given plan, running each task sequentially and updating the project state.
 * This function runs asynchronously and does not block the UI.
 * @param plan The execution plan to run.
 * @param projectId The ID of the project this plan belongs to.
 * @param context The project context for state manipulation.
 */
export async function executePlan(plan: ExecutionPlan, projectId: string, context: AgentContext) {
    let { getInputsByIds, updateModel, updateTaskInPlan, updatePlan } = context;
    let TaskStatus = getTaskStatus();
    let ModelStatus = getModelStatus();

    if (!plan.modelId) {
        console.error("Plan cannot be executed without a modelId.");
        await updatePlan(projectId, plan.id, { status: TaskStatus.FAILED });
        return;
    }
    let modelId = plan.modelId;

    await updatePlan(projectId, plan.id, { status: TaskStatus.IN_PROGRESS });

    let previousTaskResult: any = null;

    for (let i = 0; i < plan.tasks.length; i++) {
        let task = plan.tasks[i];
        try {
            await updateTaskInPlan(projectId, plan.id, task.id, { status: TaskStatus.IN_PROGRESS, startedAt: new Date().toISOString() });
            let currentTaskResult: any;

            if (task.name.includes("Description") || task.name.includes("Brief")) {
                let inputs = getInputsByIds(projectId, task.arguments.inputIds);
                let description = await generateModelDescription(inputs, task.arguments.refinementText, plan.systemPrompt);
                if (description.startsWith('Failed')) throw new Error(description);
                
                currentTaskResult = description;
                await updateModel(projectId, modelId, { description: description, status: ModelStatus.GENERATING });

            } else if (task.name.includes("Code & BOM") || task.name.includes("Geometry & Materials")) {
                let description = previousTaskResult;
                if (!description) throw new Error("Description from previous step was not available.");
                
                let { modelCode, billOfMaterials, engineeringRationale } = await generateModelData(description, plan.systemPrompt);

                currentTaskResult = { modelCode, billOfMaterials, engineeringRationale };
                await updateModel(projectId, modelId, { 
                    modelCode, 
                    billOfMaterials,
                    engineeringRationale,
                    status: ModelStatus.COMPLETED 
                });
            }

            previousTaskResult = currentTaskResult;
            await updateTaskInPlan(projectId, plan.id, task.id, { status: TaskStatus.COMPLETED, result: currentTaskResult, completedAt: new Date().toISOString() });
        } catch (error: any) {
            console.error(`Task "${task.name}" failed:`, error);
            let errorMessage = error instanceof Error ? error.message : String(error);
            await updateTaskInPlan(projectId, plan.id, task.id, { status: TaskStatus.FAILED, error: errorMessage, completedAt: new Date().toISOString() });
            await updatePlan(projectId, plan.id, { status: TaskStatus.FAILED });
            await updateModel(projectId, modelId, { status: ModelStatus.FAILED, failureReason: `Task "${task.name}" failed: ${errorMessage}` });
            return; // Stop execution on failure
        }
    }

    await updatePlan(projectId, plan.id, { status: TaskStatus.COMPLETED });
}