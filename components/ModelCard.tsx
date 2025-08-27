

import React from 'react';
import { ModelOutput, ModelStatus } from '../types';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';
import { CubeIcon } from './icons';

interface ModelCardProps {
  model: ModelOutput;
  onView: (model: ModelOutput) => void;
  activeTaskName?: string;
}

const StatusBadge: React.FC<{ status: ModelStatus }> = ({ status }) => {
  const statusStyles = {
    [ModelStatus.PENDING]: 'bg-yellow-600/50 text-yellow-300',
    [ModelStatus.GENERATING]: 'bg-blue-600/50 text-blue-300 animate-pulse',
    [ModelStatus.COMPLETED]: 'bg-green-600/50 text-green-300',
    [ModelStatus.FAILED]: 'bg-red-600/50 text-red-300',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
      {status}
    </span>
  );
};

export const ModelCard: React.FC<ModelCardProps> = ({ model, onView, activeTaskName }) => {
  const isProcessing = model.status === ModelStatus.PENDING || model.status === ModelStatus.GENERATING;

  const processingText = activeTaskName ? (
    <>
        {activeTaskName}<span className="inline-block animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]">...</span>
    </>
  ) : 'Waiting for AI agent...';

  return (
    <Card className="p-4 flex flex-col justify-between">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 h-16 w-16 bg-primary rounded-md flex items-center justify-center">
          {isProcessing ? <Spinner /> : <CubeIcon className="w-10 h-10 text-highlight" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted">Model ID: {model.id.slice(-6)}</p>
            <StatusBadge status={model.status} />
          </div>
          <p className="text-sm text-light mt-1 truncate">
            {isProcessing ? processingText : (model.description.substring(0, 70) + (model.description.length > 70 ? '...' : ''))}
          </p>
          {model.refinementOf && <p className="text-xs text-accent mt-1">Refines: {model.refinementOf.slice(-6)}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => onView(model)} disabled={model.status !== ModelStatus.COMPLETED}>
          View & Refine
        </Button>
      </div>
    </Card>
  );
};
