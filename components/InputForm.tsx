

import React, { useState, useEffect } from 'react';
import { DesignInputType, getDesignInputType } from '../types';
import { useProjects } from '../context/ProjectContext';
import { Button } from './common/Button';
import { FileTextIcon, ImageIcon, DxfFileIcon } from './icons';

interface InputFormProps {
  projectId: string;
}

export function InputForm({ projectId }: InputFormProps): React.ReactElement {
  const { addInputToProject } = useProjects();
  const DesignInputType = getDesignInputType();
  const [inputType, setInputType] = useState<DesignInputType>(DesignInputType.TEXT);
  const [textData, setTextData] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset state when input type changes to avoid conflicts
    setTextData('');
    setFile(null);
    setFilePreview(null);
    setError('');
  }, [inputType]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File size must be less than 5MB.');
      return;
    }
    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.error) {
        setError(`Failed to read file: ${reader.error}`);
        return;
      }
      if (inputType === DesignInputType.IMAGE) {
        setFilePreview(reader.result as string);
      } else if (inputType === DesignInputType.DXF) {
        setTextData(reader.result as string);
      }
    };
    reader.onerror = () => setError(`Failed to read file: ${reader.error}`);

    if (inputType === DesignInputType.IMAGE) {
      reader.readAsDataURL(selectedFile);
    } else if (inputType === DesignInputType.DXF) {
      reader.readAsText(selectedFile);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputType === DesignInputType.TEXT && textData.trim()) {
      addInputToProject(projectId, { type: DesignInputType.TEXT, data: textData });
      setTextData('');
    } else if (inputType === DesignInputType.IMAGE && file && filePreview) {
      addInputToProject(projectId, { type: DesignInputType.IMAGE, data: filePreview, fileName: file.name });
      setFile(null);
      setFilePreview(null);
    } else if (inputType === DesignInputType.DXF && file && textData.trim()) {
      addInputToProject(projectId, { type: DesignInputType.DXF, data: textData, fileName: file.name });
      setFile(null);
      setTextData('');
    } else {
        setError('Please provide a valid input.');
    }
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-semibold mb-3 text-lg">Add New Input</h3>
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setInputType(DesignInputType.TEXT)}
          className={`flex-1 p-2 rounded-md flex items-center justify-center space-x-2 transition-colors ${inputType === DesignInputType.TEXT ? 'bg-accent text-white' : 'bg-secondary hover:bg-gray-700'}`}
        >
          <FileTextIcon className="w-5 h-5" />
          <span>Text</span>
        </button>
        <button
          onClick={() => setInputType(DesignInputType.IMAGE)}
          className={`flex-1 p-2 rounded-md flex items-center justify-center space-x-2 transition-colors ${inputType === DesignInputType.IMAGE ? 'bg-accent text-white' : 'bg-secondary hover:bg-gray-700'}`}
        >
          <ImageIcon className="w-5 h-5" />
          <span>Image/Sketch</span>
        </button>
        <button
          onClick={() => setInputType(DesignInputType.DXF)}
          className={`flex-1 p-2 rounded-md flex items-center justify-center space-x-2 transition-colors ${inputType === DesignInputType.DXF ? 'bg-accent text-white' : 'bg-secondary hover:bg-gray-700'}`}
        >
          <DxfFileIcon className="w-5 h-5" />
          <span>DXF</span>
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        {inputType === DesignInputType.TEXT && (
          <textarea
            value={textData}
            onChange={(e) => setTextData(e.target.value)}
            placeholder="Describe the structure, e.g., 'A 30x15m steel warehouse...'"
            rows={5}
            className="w-full bg-primary text-light p-3 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
          />
        )}
        {inputType === DesignInputType.IMAGE && (
          <div>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-blue-800"
            />
            {filePreview && <img src={filePreview} alt="Preview" className="mt-4 rounded-lg max-h-48" />}
          </div>
        )}
        {inputType === DesignInputType.DXF && (
          <div>
            <input
              type="file"
              accept=".dxf"
              onChange={handleFileChange}
              className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-blue-800"
            />
            {file && <p className="mt-2 text-sm text-muted">Selected: {file.name}</p>}
          </div>
        )}
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <Button type="submit" className="w-full mt-4">Add Input</Button>
      </form>
    </div>
  );
};