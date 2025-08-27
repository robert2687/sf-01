

import React, { useState, useEffect } from 'react';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { generateScriptForTool } from '../services/geminiService';
import { Spinner } from './common/Spinner';
import { ClipboardIcon, CheckIcon } from './icons';

type Target = 'blender' | 'threejs' | 'openscad';

const targetLanguageMap: Record<Target, string> = {
    blender: 'python',
    threejs: 'javascript',
    openscad: 'scad',
};

const targetNameMap: Record<Target, string> = {
    blender: 'Blender',
    threejs: 'Three.js',
    openscad: 'OpenSCAD',
};

interface CodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeGeneratorModal: React.FC<CodeGeneratorModalProps> = ({ isOpen, onClose }) => {
    const [target, setTarget] = useState<Target>('blender');
    const [prompt, setPrompt] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    useEffect(() => {
        const codeGenerationMessages = [
            'Consulting AI expert for {target}...',
            'Writing {language} script...',
            'Formatting code output...',
            'Finalizing script...'
        ];
        let interval: ReturnType<typeof setInterval>;
        if (isLoading) {
            let i = 0;
            const updateMessage = () => {
                 const lang = targetLanguageMap[target];
                 const targetName = targetNameMap[target];
                 const msg = codeGenerationMessages[i]
                    .replace('{target}', targetName)
                    .replace('{language}', lang);
                 setLoadingMessage(msg);
                 i = (i + 1) % codeGenerationMessages.length;
            }
            updateMessage();
            interval = setInterval(updateMessage, 2000);
        }
        return () => clearInterval(interval);
    }, [isLoading, target]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedCode('');
        setCopied(false);
        
        try {
            const code = await generateScriptForTool(prompt, target);
            if (code.startsWith('// Generation Failed')) {
                setError(code);
            } else {
                setGeneratedCode(code);
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (generatedCode) {
            navigator.clipboard.writeText(generatedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const resetStateAndClose = () => {
        setTarget('blender');
        setPrompt('');
        setGeneratedCode('');
        setIsLoading(false);
        setError('');
        setCopied(false);
        onClose();
    }
    
    return (
        <Modal isOpen={isOpen} onClose={resetStateAndClose} title="Generate Code for 3D Tools">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label htmlFor="target-select" className="block text-sm font-medium text-muted mb-1">Target</label>
                        <select
                            id="target-select"
                            value={target}
                            onChange={(e) => setTarget(e.target.value as Target)}
                            className="w-full bg-primary text-light px-3 py-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
                        >
                            <option value="blender">Blender (Python)</option>
                            <option value="threejs">Three.js (JS)</option>
                            <option value="openscad">OpenSCAD</option>
                        </select>
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="prompt-input" className="block text-sm font-medium text-muted mb-1">Prompt</label>
                        <textarea
                            id="prompt-input"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A sphere with radius 5 and a glossy blue material"
                            rows={3}
                            className="w-full bg-primary text-light p-2 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
                        />
                    </div>
                </div>

                <Button onClick={handleGenerate} isLoading={isLoading} disabled={isLoading} className="w-full">
                    Generate Script
                </Button>

                {error && <p className="text-red-400 text-sm">{error}</p>}
                
                {(isLoading || generatedCode) && (
                    <div>
                        <h3 className="text-lg font-semibold text-highlight mb-2">Generated Script</h3>
                        <div className="bg-primary p-4 rounded-lg relative min-h-[200px]">
                            {isLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <Spinner />
                                    <p className="text-muted mt-4 text-sm transition-opacity duration-300">{loadingMessage}</p>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={handleCopy}
                                        className="absolute top-2 right-2 p-2 bg-secondary rounded-md hover:bg-accent transition-colors text-light"
                                        aria-label="Copy code"
                                    >
                                        {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                                    </button>
                                    <pre className="max-h-96 overflow-auto">
                                        <code className={`language-${targetLanguageMap[target]}`}>
                                            {generatedCode}
                                        </code>
                                    </pre>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};