
import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAgent } from '../context/AgentContext';
import { Project, DesignInput, ModelOutput, ModelStatus, DesignInputType, ExecutionPlan, Task, TaskStatus } from '../types';
import { InputForm } from './InputForm';
import { ModelCard } from './ModelCard';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';
import { ChevronLeftIcon, SparklesIcon, FileTextIcon, ImageIcon, CheckCircleIcon, XCircleIcon, ClockIcon, CodeIcon, DxfFileIcon } from './icons';
import { createExecutionPlan, executePlan } from '../agent/index';
import { Modal } from './common/Modal';
import { ModelViewer } from './ModelViewer';
import { CodeGeneratorModal } from './CodeGeneratorModal';

const TaskStatusIcon: React.FC<{ status: TaskStatus }> = ({ status }) => {
    switch (status) {
        case TaskStatus.PENDING:
            return <ClockIcon className="w-5 h-5 text-muted" />;
        case TaskStatus.IN_PROGRESS:
            return <Spinner size="sm" />;
        case TaskStatus.COMPLETED:
            return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
        case TaskStatus.FAILED:
            return <XCircleIcon className="w-5 h-5 text-red-500" />;
        default:
            return null;
    }
};

const TaskItem: React.FC<{ task: Task }> = ({ task }) => (
    <div className="bg-primary p-3 rounded-md">
        <div className="flex items-center space-x-3">
            <TaskStatusIcon status={task.status} />
            <div>
                <p className="font-medium text-light">{task.name}</p>
                <p className="text-xs text-muted">{task.description}</p>
                 {task.error && <p className="text-xs text-red-400 mt-1">Error: {task.error}</p>}
            </div>
        </div>
    </div>
);

const PlanMonitor: React.FC<{ plan: ExecutionPlan }> = ({ plan }) => {
    return (
        <div className="bg-secondary p-4 rounded-lg shadow-lg border-l-4 border-accent">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold text-highlight">Agent Execution Plan</h4>
                <span className="text-xs text-muted">{new Date(plan.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted mb-4">Goal: {plan.goal}</p>
            <div className="space-y-2">
                {plan.tasks.map(task => <TaskItem key={task.id} task={task} />)}
            </div>
        </div>
    );
};


export const ProjectView: React.FC<{ projectId: string; onBack: () => void; }> = ({ projectId, onBack }) => {
  const context = useProjects();
  const agentContext = useAgent();
  const project = context.getProjectById(projectId);

  const [selectedInputs, setSelectedInputs] = useState<Set<string>>(new Set());
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCodeGeneratorOpen, setIsCodeGeneratorOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelOutput | null>(null);

  const activePlan = useMemo(() => {
    return project?.plans.find(p => p.status === TaskStatus.IN_PROGRESS || p.status === TaskStatus.PENDING);
  }, [project?.plans]);

  const handleToggleInput = (inputId: string) => {
    setSelectedInputs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(inputId)) {
        newSet.delete(inputId);
      } else {
        newSet.add(inputId);
      }
      return newSet;
    });
  };

  const handleGenerateModel = async () => {
    if (selectedInputs.size === 0 || !project) return;
    
    const inputIds = Array.from(selectedInputs);
    const newModelId = context.addModelToProject(projectId, {
      projectId,
      status: ModelStatus.PENDING,
      description: 'Waiting for AI agent to start...',
      inputIds,
      createdAt: new Date().toISOString(),
    });

    const activePersona = agentContext.getActivePersona();
    const plan = createExecutionPlan('generate', { inputIds, modelId: newModelId }, activePersona?.systemPrompt);
    context.addPlanToProject(projectId, plan);
    
    // Non-blocking execution
    executePlan(plan, projectId, context);
    setSelectedInputs(new Set());
  };
  
  const handleRefineModel = async (modelId: string, refinementText: string, originalInputIds: string[]) => {
     if (!project) return;
    
    const newModelId = context.addModelToProject(projectId, {
      projectId,
      status: ModelStatus.PENDING,
      description: 'Waiting for AI agent to refine...',
      inputIds: originalInputIds,
      refinementOf: modelId,
      createdAt: new Date().toISOString(),
    });
    
    const activePersona = agentContext.getActivePersona();
    const plan = createExecutionPlan('refine', {
        inputIds: originalInputIds,
        refinementText,
        modelId: newModelId,
    }, activePersona?.systemPrompt);
    context.addPlanToProject(projectId, plan);
    
    // Non-blocking execution
    executePlan(plan, projectId, context).then(() => {
        const updatedProject = context.getProjectById(projectId);
        const newModel = updatedProject?.models.find(m => m.id === newModelId);
        if(newModel && newModel.status === ModelStatus.COMPLETED) {
            setCurrentModel(newModel);
        } else {
             // If refinement failed, we might want to close the modal or show an alert
            if (isViewerOpen) {
                alert(`Refinement failed. Please check the plan status for details.`);
            }
        }
    });
  };

  const openViewer = (model: ModelOutput) => {
    setCurrentModel(model);
    setIsViewerOpen(true);
  };
  
  const modelInputs = useMemo(() => {
    if (!currentModel || !project) return [];
    return project.inputs.filter(input => currentModel.inputIds.includes(input.id));
  }, [currentModel, project]);

  if (!project) {
    return <div>Project not found.</div>;
  }

  const isAgentBusy = project.plans.some(p => p.status === TaskStatus.IN_PROGRESS);
  const activePersonaName = agentContext.getActivePersona()?.name || 'Default Agent';

  const renderInputIcon = (type: DesignInputType) => {
    switch (type) {
        case DesignInputType.TEXT:
            return <FileTextIcon className="w-5 h-5 text-accent flex-shrink-0" />;
        case DesignInputType.IMAGE:
            return <ImageIcon className="w-5 h-5 text-accent flex-shrink-0" />;
        case DesignInputType.DXF:
            return <DxfFileIcon className="w-5 h-5 text-accent flex-shrink-0" />;
        default:
            return null;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <button onClick={onBack} className="flex items-center text-muted hover:text-light mb-4">
        <ChevronLeftIcon className="w-5 h-5 mr-1" />
        Back to Projects
      </button>
      <h2 className="text-3xl font-bold">{project.name}</h2>
      <p className="text-muted mt-1">{project.description}</p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <InputForm projectId={projectId} />
          <div>
            <h3 className="text-xl font-semibold mb-3">Project Inputs ({project.inputs.length})</h3>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {project.inputs.map(input => (
                <div
                  key={input.id}
                  onClick={() => handleToggleInput(input.id)}
                  className={`p-3 rounded-lg cursor-pointer border-2 transition-all ${selectedInputs.has(input.id) ? 'border-highlight bg-highlight/10' : 'border-secondary bg-secondary'}`}
                >
                  <div className="flex items-center space-x-3">
                    {renderInputIcon(input.type)}
                    <p className="text-sm truncate">{input.type === 'TEXT' ? input.data : input.fileName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-secondary p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold">Generate New 3D Model</h3>
            <p className="text-muted text-sm mt-1">Select one or more inputs, then delegate the task to the AI agent using the <span className="font-bold text-highlight">{activePersonaName}</span> persona.</p>
            <Button
              onClick={handleGenerateModel}
              disabled={selectedInputs.size === 0 || isAgentBusy}
              isLoading={isAgentBusy && !activePlan?.goal.includes('Refine')}
              className="w-full mt-4"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Generate with AI ({selectedInputs.size} selected)
            </Button>
          </div>
          
          <div className="bg-secondary p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold">Code Generation Utilities</h3>
            <p className="text-muted text-sm mt-1">Generate scripts for external 3D software like Blender or Three.js.</p>
            <Button
              onClick={() => setIsCodeGeneratorOpen(true)}
              className="w-full mt-4"
            >
              <CodeIcon className="w-5 h-5 mr-2" />
              Open Code Generator
            </Button>
          </div>

          <div>
             <h3 className="text-xl font-semibold mb-3">Agent Activity</h3>
             {project.plans.length === 0 && <p className="text-muted text-sm">No agent activity yet. Generate a model to begin.</p>}
             <div className="space-y-4">
                {project.plans.map(plan => <PlanMonitor key={plan.id} plan={plan} />)}
             </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-3">Generated Models ({project.models.length})</h3>
            <div className="space-y-4">
              {project.models.map(model => {
                const modelPlan = project.plans.find(p => p.modelId === model.id && (p.status === TaskStatus.IN_PROGRESS || p.status === TaskStatus.PENDING));
                const activeTask = modelPlan?.tasks.find(t => t.status === TaskStatus.IN_PROGRESS);

                return (
                    <ModelCard 
                        key={model.id}
                        model={model} 
                        onView={openViewer}
                        activeTaskName={activeTask?.name}
                    />
                );
              })}
            </div>
          </div>
        </div>
      </div>
       <Modal isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} title={`Model Viewer - ${currentModel?.id.slice(-6)}`}>
        {currentModel && (
          <ModelViewer 
            model={currentModel} 
            inputs={modelInputs}
            onRefine={handleRefineModel}
            isLoadingRefinement={isAgentBusy}
          />
        )}
      </Modal>
      <CodeGeneratorModal isOpen={isCodeGeneratorOpen} onClose={() => setIsCodeGeneratorOpen(false)} />
    </div>
  );
};