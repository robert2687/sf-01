


import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAgent } from '../context/AgentContext';
import { Project, DesignInput, ModelOutput, DesignInputType, ExecutionPlan, Task, TaskStatus, StructuralAnalysisResult, getTaskStatus, getModelStatus, getDesignInputType } from '../types';
import { InputForm } from './InputForm';
import { ModelCard } from './ModelCard';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';
import { ChevronLeftIcon, SparklesIcon, FileTextIcon, ImageIcon, CheckCircleIcon, XCircleIcon, ClockIcon, CodeIcon, DxfFileIcon } from './icons';
import { createExecutionPlan, executePlan } from '../agent/index';
import { Modal } from './common/Modal';
import { ModelViewer } from './ModelViewer';
import { CodeGeneratorModal } from './CodeGeneratorModal';
import { performStructuralAnalysis } from '../services/geminiService';
import { AnalysisResultDisplay } from './AnalysisResultDisplay';

function TaskStatusIcon({ status }: { status: TaskStatus }): React.ReactElement | null {
    const TaskStatus = getTaskStatus();
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
}

function TaskItem({ task }: { task: Task }): React.ReactElement {
    return (
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
}

function PlanMonitor({ plan }: { plan: ExecutionPlan }): React.ReactElement {
    return (
        <div className="bg-primary p-4 rounded-lg border-l-4 border-accent">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-md font-semibold text-highlight">Execution Plan</h4>
                <span className="text-xs text-muted">{new Date(plan.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted mb-4">Goal: {plan.goal}</p>
            <div className="space-y-2">
                {plan.tasks.map(task => <TaskItem key={task.id} task={task} />)}
            </div>
        </div>
    );
}

type InputFilter = 'ALL' | DesignInputType;

export function ProjectView({ projectId, onBack }: { projectId: string; onBack: () => void; }): React.ReactElement | null {
  const context = useProjects();
  const agentContext = useAgent();
  const project = context.getProjectById(projectId);

  const [selectedInputs, setSelectedInputs] = useState<Set<string>>(new Set());
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCodeGeneratorOpen, setIsCodeGeneratorOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelOutput | null>(null);
  const [inputFilter, setInputFilter] = useState<InputFilter>('ALL');
  
  // State for Quick Structural Analysis
  const [selectedModelIdForAnalysis, setSelectedModelIdForAnalysis] = useState<string | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState('Perform a standard structural analysis assuming a uniformly distributed load of 15 kN/m and pinned supports at the base of all main columns. Use S235 steel properties.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StructuralAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);


  const TaskStatus = getTaskStatus();
  const ModelStatus = getModelStatus();
  const DesignInputType = getDesignInputType();

  const activePlan = useMemo(() => {
    return project?.plans.find(p => p.status === TaskStatus.IN_PROGRESS || p.status === TaskStatus.PENDING);
  }, [project?.plans, TaskStatus]);

  const filteredInputs = useMemo(() => {
    if (!project) return [];
    if (inputFilter === 'ALL') {
        return project.inputs;
    }
    return project.inputs.filter(input => input.type === inputFilter);
  }, [project, inputFilter]);
  
  const completedModels = useMemo(() => {
    if (!project) return [];
    return project.models.filter(m => m.status === ModelStatus.COMPLETED);
  }, [project, ModelStatus.COMPLETED]);


  function handleToggleInput(inputId: string) {
    setSelectedInputs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(inputId)) {
        newSet.delete(inputId);
      } else {
        newSet.add(inputId);
      }
      return newSet;
    });
  }

  async function handleGenerateModel() {
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
  }
  
  async function handleRefineModel(modelId: string, refinementText: string, originalInputIds: string[]) {
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
  }

  async function handleRunQuickAnalysis() {
    if (!selectedModelIdForAnalysis || !analysisPrompt.trim() || !project) return;
    
    const modelToAnalyze = project.models.find(m => m.id === selectedModelIdForAnalysis);
    if (!modelToAnalyze) {
        setAnalysisError("Selected model could not be found.");
        return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
        const result = await performStructuralAnalysis(modelToAnalyze.description, analysisPrompt);
        setAnalysisResult(result);
    } catch (e: any) {
        setAnalysisError(e.message || "An unknown error occurred during analysis.");
    } finally {
        setIsAnalyzing(false);
    }
  }

  function openViewer(model: ModelOutput) {
    setCurrentModel(model);
    setIsViewerOpen(true);
  }
  
  const modelInputs = useMemo(() => {
    if (!currentModel || !project) return [];
    return project.inputs.filter(input => currentModel.inputIds.includes(input.id));
  }, [currentModel, project]);

  if (!project) {
    return <div>Project not found.</div>;
  }

  const isAgentBusy = project.plans.some(p => p.status === TaskStatus.IN_PROGRESS);
  const activePersonaName = agentContext.getActivePersona()?.name || 'Default Agent';

  function renderInputIcon(type: DesignInputType) {
    switch (type) {
        case DesignInputType.TEXT:
            return <FileTextIcon className="w-6 h-6 text-accent flex-shrink-0" />;
        case DesignInputType.IMAGE:
            return <ImageIcon className="w-6 h-6 text-accent flex-shrink-0" />;
        case DesignInputType.DXF:
            return <DxfFileIcon className="w-6 h-6 text-accent flex-shrink-0" />;
        default:
            return null;
    }
  }

  const filterButtonStyle = (filter: InputFilter) =>
    `px-3 py-1 text-xs font-medium rounded-md transition-colors ${
        inputFilter === filter
            ? 'bg-accent text-white'
            : 'bg-primary hover:bg-gray-800 text-muted'
    }`;

  return (
    <div className="container mx-auto py-8 px-4">
      <button onClick={onBack} className="flex items-center text-muted hover:text-light mb-4">
        <ChevronLeftIcon className="w-5 h-5 mr-1" />
        Back to Projects
      </button>
      <h2 className="text-3xl font-bold">{project.name}</h2>
      <p className="text-muted mt-1">{project.description}</p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <InputForm projectId={projectId} />
          <div className="bg-secondary p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold">Project Inputs ({project.inputs.length})</h3>
            </div>
            
            <div className="flex space-x-2 mb-4 p-1 bg-secondary rounded-lg">
                <button onClick={() => setInputFilter('ALL')} className={filterButtonStyle('ALL')}>All</button>
                <button onClick={() => setInputFilter(DesignInputType.TEXT)} className={filterButtonStyle(DesignInputType.TEXT)}>Text</button>
                <button onClick={() => setInputFilter(DesignInputType.IMAGE)} className={filterButtonStyle(DesignInputType.IMAGE)}>Image</button>
                <button onClick={() => setInputFilter(DesignInputType.DXF)} className={filterButtonStyle(DesignInputType.DXF)}>DXF</button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {filteredInputs.length === 0 && (
                <p className="text-muted text-sm text-center py-4">
                  {project.inputs.length > 0 ? 'No inputs match the current filter.' : 'No inputs yet. Add one above to get started.'}
                </p>
              )}
              {filteredInputs.map(input => {
                const isSelected = selectedInputs.has(input.id);
                return (
                    <div
                      key={input.id}
                      onClick={() => handleToggleInput(input.id)}
                      className={`p-3 rounded-lg cursor-pointer border-2 transition-all flex items-center space-x-4 bg-primary hover:bg-gray-800 ${isSelected ? 'border-highlight ring-2 ring-highlight/50' : 'border-gray-700'}`}
                    >
                      {renderInputIcon(input.type)}
                      <p className="text-sm truncate flex-grow">{input.type === 'TEXT' ? input.data : input.fileName}</p>
                      {isSelected && <CheckCircleIcon className="w-5 h-5 text-highlight flex-shrink-0" />}
                    </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-secondary p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-semibold">Generate New 3D Model</h3>
            <p className="text-muted text-sm mt-1">Select one or more inputs, then delegate the task to the AI agent using the <span className="font-bold text-highlight">{activePersonaName}</span> persona.</p>
            <Button
              onClick={handleGenerateModel}
              disabled={selectedInputs.size === 0 || isAgentBusy}
              isLoading={isAgentBusy && activePlan?.goal.includes('Create')}
              className="w-full mt-4"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Generate with AI ({selectedInputs.size} selected)
            </Button>
          </div>
          
          <div className="bg-secondary p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-semibold">Code Generation Utilities</h3>
            <p className="text-muted text-sm mt-1">Generate scripts for external 3D software like Blender or Three.js.</p>
            <Button
              onClick={() => setIsCodeGeneratorOpen(true)}
              variant="secondary"
              className="w-full mt-4"
            >
              <CodeIcon className="w-5 h-5 mr-2" />
              Open Code Generator
            </Button>
          </div>
          
           <div className="bg-secondary p-6 rounded-lg shadow-xl">
                <h3 className="text-xl font-semibold">Quick Structural Analysis</h3>
                <p className="text-muted text-sm mt-1">Select a completed model to run an analysis without opening the full viewer.</p>
                
                <div className="mt-4 space-y-3">
                    <select
                        value={selectedModelIdForAnalysis || ''}
                        onChange={e => {
                            setSelectedModelIdForAnalysis(e.target.value);
                            setAnalysisResult(null);
                            setAnalysisError(null);
                        }}
                        disabled={completedModels.length === 0 || isAnalyzing}
                        className="w-full bg-primary text-light px-3 py-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent disabled:opacity-50"
                    >
                        <option value="">{completedModels.length === 0 ? 'No completed models available' : 'Select a model...'}</option>
                        {completedModels.map(m => (
                            <option key={m.id} value={m.id}>Model: {m.id.slice(-6)} - {m.description.substring(0, 40)}...</option>
                        ))}
                    </select>

                    <textarea
                        value={analysisPrompt}
                        onChange={e => setAnalysisPrompt(e.target.value)}
                        rows={3}
                        className="w-full bg-primary text-light p-3 rounded-md border border-gray-600 focus:ring-accent focus:border-accent disabled:opacity-50"
                        placeholder="Enter loading conditions..."
                        disabled={!selectedModelIdForAnalysis || isAnalyzing}
                    />

                    <Button
                        onClick={handleRunQuickAnalysis}
                        isLoading={isAnalyzing}
                        disabled={!selectedModelIdForAnalysis || isAgentBusy || isAnalyzing}
                        className="w-full"
                    >
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        Run Analysis
                    </Button>

                    {analysisError && <p className="text-sm text-red-400 mt-2 p-3 bg-red-900/20 rounded-md">{analysisError}</p>}
                    {analysisResult && (
                        <div className="mt-4 p-4 bg-primary rounded-lg border border-gray-700">
                            <h3 className="text-lg font-bold text-highlight mb-3">Quick Analysis Result</h3>
                            <AnalysisResultDisplay result={analysisResult} />
                        </div>
                    )}
                </div>
            </div>

          <div className="bg-secondary p-6 rounded-lg shadow-xl">
             <h3 className="text-xl font-semibold mb-3">Agent Activity</h3>
             {project.plans.length === 0 && <p className="text-muted text-sm">No agent activity yet. Generate a model to begin.</p>}
             <div className="space-y-4">
                {project.plans.map(plan => <PlanMonitor key={plan.id} plan={plan} />)}
             </div>
          </div>
          
          <div className="bg-secondary p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-semibold mb-3">Generated Models ({project.models.length})</h3>
             {project.models.length === 0 && <p className="text-muted text-sm">No models have been generated for this project yet.</p>}
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
            isLoadingRefinement={isAgentBusy && activePlan?.goal.includes('Refine')}
          />
        )}
      </Modal>
      <CodeGeneratorModal isOpen={isCodeGeneratorOpen} onClose={() => setIsCodeGeneratorOpen(false)} />
    </div>
  );
};