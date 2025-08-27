



import React, { Suspense, useState, useEffect, useMemo } from 'react';
// Canvas and Drei are now sourced from window globals to ensure a single instance.
// import { Canvas } from '@react-three/fiber';
// import * as Drei from '@react-three/drei';
import { ModelOutput, DesignInput, StructuralAnalysisResult, CfdAnalysisResult, ModelStatus, getModelStatus } from '../types';
import { SteelFrame } from './SteelFrame';
import { Spinner } from './common/Spinner';
import { Button } from './common/Button';
import { DownloadIcon, MicrophoneIcon, SparklesIcon, WindIcon, XCircleIcon } from './icons';
import { generateModelFileContent, performStructuralAnalysis, performCfdAnalysis } from '../services/geminiService';
import { AnalysisResultDisplay } from './AnalysisResultDisplay';
import { ErrorBoundary } from './common/ErrorBoundary';

interface ModelViewerProps {
  model: ModelOutput;
  inputs: DesignInput[];
  onRefine: (modelId: string, refinementText: string, originalInputIds: string[]) => void;
  isLoadingRefinement: boolean;
}

function DynamicModel({ code }: { code: string }): React.ReactElement | null {
    const [Component, setComponent] = useState<React.ComponentType | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setComponent(null);
        setError(null);

        if (!code || code.startsWith('// Generation Failed')) {
            setError(code || 'No code available for this model.');
            return;
        }

        async function loadComponent() {
            try {
                // Sanitize the code to remove any rogue import statements that the AI might have added.
                // This prevents multiple instances of libraries like Three.js from being loaded.
                // The new regex is more robust and handles multi-line imports.
                let sanitizedCode = code.replace(/import[\s\S]*?from\s*['"].*['"];?/g, '// Import removed by sanitizer');

                // The global `window.*` variables are populated in index.tsx
                let fullCode = `
                    const React = window.React;
                    const THREE = window.THREE;
                    const Drei = window.ReactThreeDrei;
                    ${sanitizedCode}
                `;
                
                let url = 'data:text/javascript;base64,' + btoa(fullCode);
                let mod = await import(/* @vite-ignore */ url);
                
                if (isMounted) {
                    if (mod.default && typeof mod.default === 'function') {
                        setComponent(() => mod.default);
                    } else {
                        throw new Error("Generated code doesn't have a default export or it's not a React component.");
                    }
                }
            } catch (e) {
                console.error("Failed to load dynamic component:", e);
                if (isMounted) {
                    setError(e instanceof Error ? e.message : String(e));
                }
            }
        }

        loadComponent();

        return () => {
            isMounted = false;
        };
    }, [code]);

    let Drei = (window as any).ReactThreeDrei;
    if (!Drei) return null; // Wait for Drei to be available

    if (error) {
        return <Drei.Text color="red" fontSize={0.2} maxWidth={5} textAlign="center" >{`Error rendering model:\n${error}`}</Drei.Text>;
    }

    if (!Component) {
        return (
             <Drei.Text color="white" fontSize={0.3} anchorX="center" anchorY="middle">Assembling 3D components...</Drei.Text>
        );
    }

    return <Suspense fallback={null}><Component /></Suspense>;
};


// Minimal type definition for the Web Speech API to add type safety.
// This is required because the API is experimental and not in default TS DOM types.
interface SpeechRecognition {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
}

export function ModelViewer({ model, inputs, onRefine, isLoadingRefinement }: ModelViewerProps): React.ReactElement {
  type AiTask = 'refining' | 'structural_analysis' | 'cfd_analysis';
  
  const [refinementText, setRefinementText] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [activeAiTask, setActiveAiTask] = useState<AiTask | null>(null);

  // Structural Analysis State
  const [analysisPrompt, setAnalysisPrompt] = useState('Perform a standard structural analysis assuming a uniformly distributed load of 15 kN/m and pinned supports at the base of all main columns. Use S235 steel properties.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StructuralAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisLoadingMessage, setAnalysisLoadingMessage] = useState('');
  
  // CFD Analysis State
  const [cfdPrompt, setCfdPrompt] = useState('Analyze the airflow over the structure at an inlet velocity of 30 m/s using a k-ω SST turbulence model. Provide pressure coefficient plots and lift/drag values.');
  const [isCfdAnalyzing, setIsCfdAnalyzing] = useState(false);
  const [cfdAnalysisResult, setCfdAnalysisResult] = useState<CfdAnalysisResult | null>(null);
  const [cfdAnalysisError, setCfdAnalysisError] = useState<string | null>(null);
  const [cfdLoadingMessage, setCfdLoadingMessage] = useState('');
  
  // Refinement State
  const [refinementLoadingMessage, setRefinementLoadingMessage] = useState('');

  // Memoize speech recognition object and support
  const { isVoiceSupported, recognition } = useMemo(() => {
    let SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let isSupported = !!SpeechRecognitionAPI;
    let rec: SpeechRecognition | null = null;
    if (isSupported) {
        rec = new SpeechRecognitionAPI();
        rec.continuous = false;
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
    }
    return { isVoiceSupported: isSupported, recognition: rec };
  }, []);

  // Effect to manage the active AI task state
  useEffect(() => {
    if (isLoadingRefinement) {
        setActiveAiTask('refining');
    } else if (isAnalyzing) {
        setActiveAiTask('structural_analysis');
    } else if (isCfdAnalyzing) {
        setActiveAiTask('cfd_analysis');
    } else {
        setActiveAiTask(null);
    }
  }, [isLoadingRefinement, isAnalyzing, isCfdAnalyzing]);

  // Effect for Refinement loading messages
  useEffect(() => {
    let refinementMessages = [
        'Re-interpreting your instructions...',
        'Generating new design brief...',
        'Re-building 3D geometry...',
        'Finalizing refined model...',
    ];
    let interval: ReturnType<typeof setInterval>;
    if (isLoadingRefinement) {
        let i = 0;
        setRefinementLoadingMessage(refinementMessages[i]);
        interval = setInterval(() => {
            i = (i + 1) % refinementMessages.length;
            setRefinementLoadingMessage(refinementMessages[i]);
        }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoadingRefinement]);

  // Effect for Structural Analysis loading messages
  useEffect(() => {
    let structuralAnalysisMessages = [
        'Simulating structural loads...',
        'Calculating stress and strain...',
        'Generating FEA plot...',
        'Finalizing engineering report...',
    ];
    let interval: ReturnType<typeof setInterval>;
    if (isAnalyzing) {
        let i = 0;
        setAnalysisLoadingMessage(structuralAnalysisMessages[i]);
        interval = setInterval(() => {
            i = (i + 1) % structuralAnalysisMessages.length;
            setAnalysisLoadingMessage(structuralAnalysisMessages[i]);
        }, 2500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Effect for CFD Analysis loading messages
  useEffect(() => {
    let cfdAnalysisMessages = [
        'Meshing geometry for fluid simulation...',
        'Solving Navier-Stokes equations...',
        'Visualizing airflow and pressure...',
        'Compiling CFD report...',
    ];
    let interval: ReturnType<typeof setInterval>;
    if (isCfdAnalyzing) {
        let i = 0;
        setCfdLoadingMessage(cfdAnalysisMessages[i]);
        interval = setInterval(() => {
            i = (i + 1) % cfdAnalysisMessages.length;
            setCfdLoadingMessage(cfdAnalysisMessages[i]);
        }, 2500);
    }
    return () => clearInterval(interval);
  }, [isCfdAnalyzing]);

  const currentLoadingMessage = useMemo(() => {
    switch (activeAiTask) {
        case 'refining': return refinementLoadingMessage;
        case 'structural_analysis': return analysisLoadingMessage;
        case 'cfd_analysis': return cfdLoadingMessage;
        default: return '';
    }
  }, [activeAiTask, refinementLoadingMessage, analysisLoadingMessage, cfdLoadingMessage]);

  const activeTaskName = useMemo(() => {
      switch (activeAiTask) {
          case 'refining': return "Model Refinement";
          case 'structural_analysis': return "Structural Analysis";
          case 'cfd_analysis': return "CFD Analysis";
          default: return null;
      }
  }, [activeAiTask]);

  useEffect(() => {
    if (!recognition) return;

    function handleResult(event: any) {
        let transcript = event.results[0][0].transcript;
        setRefinementText(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsRecording(false);
    }

    function handleError(event: any) {
        console.error('Speech recognition error:', event.error);
        setVoiceError(`Voice error: ${event.error}. Please try again.`);
        setIsRecording(false);
        setTimeout(() => setVoiceError(null), 5000); // Clear the error after 5 seconds
    }

    function handleEnd() {
        setIsRecording(false); // This is called on successful recognition and on timeout/error
    }

    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;

    // Cleanup function to prevent memory leaks and errors on component unmount.
    return () => {
        if (recognition) {
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            recognition.stop(); // Ensure it stops if component unmounts while recording
        }
    };
  }, [recognition]);

  function handleRefine() {
    if (refinementText.trim()) {
      onRefine(model.id, refinementText, model.inputIds);
      setRefinementText('');
    }
  }
  
  function handleToggleRecording() {
    if (!isVoiceSupported || !recognition) return;
    if (isRecording) {
        recognition.stop();
    } else {
        setVoiceError(null); // Clear any previous errors before starting
        recognition.start();
        setIsRecording(true);
    }
  }

  async function handleDownload(format: 'GLB' | 'FBX' | 'OBJ') {
    if (format !== 'OBJ') {
      alert(`Downloading ${format} files is not yet implemented. Please use OBJ format.`);
      return;
    }

    setDownloadingFormat(format);
    try {
        let fileContent = await generateModelFileContent(model.description, 'obj');

        if (fileContent.startsWith('// Generation Failed')) {
            alert(`Failed to generate OBJ file: ${fileContent}`);
            setDownloadingFormat(null);
            return;
        }

        let blob = new Blob([fileContent], { type: 'text/plain' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `steelforge-model-${model.id}.obj`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download error:', error);
        alert('An unexpected error occurred while generating the download file.');
    } finally {
        setDownloadingFormat(null);
    }
  }

  async function handleRunAnalysis() {
    if (!analysisPrompt.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
        let result = await performStructuralAnalysis(model.description, analysisPrompt);
        setAnalysisResult(result);
    } catch (e: any) {
        setAnalysisError(e.message || "An unknown error occurred during analysis.");
    } finally {
        setIsAnalyzing(false);
    }
  }
  
  async function handleRunCfdAnalysis() {
    if (!cfdPrompt.trim()) return;
    setIsCfdAnalyzing(true);
    setCfdAnalysisResult(null);
    setCfdAnalysisError(null);
    try {
        let result = await performCfdAnalysis(model.description, cfdPrompt);
        setCfdAnalysisResult(result);
    } catch (e: any) {
        setCfdAnalysisError(e.message || "An unknown error occurred during CFD analysis.");
    } finally {
        setIsCfdAnalyzing(false);
    }
  }

  // Source R3F components from globals to ensure single instance
  let ReactThreeFiber = (window as any).ReactThreeFiber;
  let Canvas = ReactThreeFiber ? ReactThreeFiber.Canvas : null;
  let Drei = (window as any).ReactThreeDrei;

  if (!Canvas || !Drei) {
    return <div className="flex items-center justify-center h-full"><Spinner /> <p className="ml-4">Loading 3D libraries...</p></div>;
  }
  
  let ModelStatus = getModelStatus();
  if (model.status === ModelStatus.FAILED) {
    return (
        <div className="bg-red-900/20 border border-red-700 text-red-300 p-6 rounded-lg text-center flex flex-col items-center">
            <XCircleIcon className="w-12 h-12 text-highlight mb-4" />
            <h3 className="text-xl font-bold text-light mb-2">Model Generation Failed</h3>
            <p className="text-sm mb-4">The AI agent encountered an error while processing this model.</p>
            {model.failureReason && (
                <div className="w-full text-left">
                    <p className="text-sm font-semibold text-light mb-2">Error Details:</p>
                    <pre className="text-xs bg-primary p-3 rounded-md whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                        {model.failureReason}
                    </pre>
                </div>
            )}
        </div>
    );
  }


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[75vh]">
      <div className="bg-primary rounded-lg relative overflow-hidden">
        <Canvas camera={{ fov: 45 }}>
          <Suspense fallback={null}>
            <Drei.Stage intensity={0.6} environment={null}>
                <ErrorBoundary fallback={
                    <Drei.Text color="red" fontSize={0.2} maxWidth={5} textAlign="center" >
                        {'Rendering failed.\nThe AI-generated code\ncontains a runtime error.'}
                    </Drei.Text>
                }>
                    {model.modelCode ? <DynamicModel code={model.modelCode} /> : <SteelFrame />}
                </ErrorBoundary>
            </Drei.Stage>
          </Suspense>
          <Drei.OrbitControls makeDefault autoRotate />
        </Canvas>
        <div className="absolute top-2 left-2 bg-secondary/50 p-2 rounded-md text-xs">
          Drag to rotate, Scroll to zoom, Right-click to pan.
        </div>
      </div>

      <div className="flex flex-col space-y-4 overflow-y-auto pr-2">
        {activeAiTask && (
            <div className="flex items-center space-x-3 bg-blue-900/50 border border-blue-700 text-blue-300 p-3 rounded-md mb-4">
                <div className="animate-spin">
                    <SparklesIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <p className="font-semibold text-sm text-light">AI Task in Progress: {activeTaskName}</p>
                    <p className="text-xs transition-opacity duration-500">{currentLoadingMessage}</p>
                </div>
            </div>
        )}

        <div>
          <h3 className="text-xl font-semibold mb-2 text-highlight">AI-Generated Description</h3>
          <p className="text-muted bg-primary p-4 rounded-md whitespace-pre-wrap">{model.description}</p>
        </div>

        {model.engineeringRationale && (
            <div>
              <h3 className="text-xl font-semibold mb-2 text-highlight">Engineering Rationale</h3>
              <p className="text-muted bg-primary p-4 rounded-md whitespace-pre-wrap">{model.engineeringRationale}</p>
            </div>
        )}

        <div>
          <h3 className="text-xl font-semibold mb-2 text-highlight">Refine Model</h3>
           <div className="relative">
             <textarea
              value={refinementText}
              onChange={(e) => setRefinementText(e.target.value)}
              placeholder="Type or use the microphone to say 'Make the roof steeper by 15 degrees'..."
              rows={4}
              className="w-full bg-primary text-light p-3 rounded-md border border-gray-600 focus:ring-accent focus:border-accent pr-12"
            />
            {isVoiceSupported && (
                <button
                    onClick={handleToggleRecording}
                    disabled={activeAiTask !== null}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'bg-highlight text-white animate-pulse' : 'text-muted hover:text-light hover:bg-secondary'}`}
                    title="Record voice command"
                    aria-label="Start voice recording"
                >
                    <MicrophoneIcon className="w-5 h-5" />
                </button>
            )}
           </div>
          {isRecording && <p className="text-sm text-highlight mt-1 text-center" aria-live="assertive">Listening...</p>}
          {voiceError && <p className="text-sm text-red-400 mt-1 text-center" role="alert">{voiceError}</p>}
          <Button onClick={handleRefine} isLoading={isLoadingRefinement} className="w-full mt-2" disabled={activeAiTask !== null || isRecording}>
            Generate Refinement
          </Button>
        </div>

        <div>
            <h3 className="text-xl font-semibold mb-2 text-highlight">Structural Analysis</h3>
            <textarea
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
                placeholder="Enter loading conditions, material properties, and boundary conditions..."
                rows={4}
                className="w-full bg-primary text-light p-3 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
            />
            <Button onClick={handleRunAnalysis} isLoading={isAnalyzing} className="w-full mt-2" disabled={activeAiTask !== null}>
                <SparklesIcon className="w-5 h-5 mr-2" />
                Run Analysis with AI
            </Button>
            {analysisError && <p className="text-sm text-red-400 mt-2 p-3 bg-red-900/20 rounded-md">{analysisError}</p>}
            {analysisResult && (
                <div className="mt-4 p-4 bg-secondary rounded-lg border border-gray-700">
                    <h3 className="text-lg font-bold text-highlight mb-3">Analysis Complete</h3>
                    <AnalysisResultDisplay result={analysisResult} />
                </div>
            )}
        </div>
        
        <div>
            <h3 className="text-xl font-semibold mb-2 text-highlight">Computational Fluid Dynamics (CFD)</h3>
            <textarea
                value={cfdPrompt}
                onChange={(e) => setCfdPrompt(e.target.value)}
                placeholder="Enter fluid properties, flow velocity, turbulence models..."
                rows={4}
                className="w-full bg-primary text-light p-3 rounded-md border border-gray-600 focus:ring-accent focus:border-accent"
            />
            <Button onClick={handleRunCfdAnalysis} isLoading={isCfdAnalyzing} className="w-full mt-2" disabled={activeAiTask !== null}>
                <WindIcon className="w-5 h-5 mr-2" />
                Run CFD Analysis with AI
            </Button>
            {cfdAnalysisError && <p className="text-sm text-red-400 mt-2 p-3 bg-red-900/20 rounded-md">{cfdAnalysisError}</p>}
            {cfdAnalysisResult && (
                <div className="mt-4 p-4 bg-secondary rounded-lg border border-gray-700">
                    <h3 className="text-lg font-bold text-highlight mb-3">CFD Analysis Complete</h3>
                    <AnalysisResultDisplay result={cfdAnalysisResult} />
                </div>
            )}
        </div>

        <div>
            <h3 className="text-xl font-semibold mb-2 text-highlight">Download Model</h3>
            <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" onClick={() => handleDownload('GLB')} disabled={downloadingFormat !== null}>
                    <DownloadIcon className="w-4 h-4 mr-2" /> GLB
                </Button>
                <Button variant="secondary" onClick={() => handleDownload('FBX')} disabled={downloadingFormat !== null}>
                    <DownloadIcon className="w-4 h-4 mr-2" /> FBX
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => handleDownload('OBJ')}
                  isLoading={downloadingFormat === 'OBJ'}
                  disabled={downloadingFormat !== null}
                >
                    {downloadingFormat !== 'OBJ' && <DownloadIcon className="w-4 h-4 mr-2" />}
                    {downloadingFormat === 'OBJ' ? 'Generating OBJ...' : 'OBJ'}
                </Button>
            </div>
            <p className="text-xs text-muted mt-2">GLB/FBX export coming soon. OBJ export is AI-generated and may be experimental.</p>
        </div>

        <div>
            <h3 className="text-xl font-semibold mb-2 text-highlight">Bill of Materials</h3>
            {model.billOfMaterials && model.billOfMaterials.length > 0 ? (
                <div className="bg-primary p-3 rounded-md border border-gray-700">
                    <table className="w-full text-sm text-left">
                        <thead className="text-muted border-b border-gray-600">
                            <tr>
                                <th className="py-2 px-3 font-semibold">Component</th>
                                <th className="py-2 px-3 font-semibold text-center">Qty</th>
                                <th className="py-2 px-3 font-semibold">Material Spec</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.billOfMaterials.map((item, index) => (
                                <tr key={index} className="border-t border-gray-700">
                                    <td className="py-2 px-3">{item.component}</td>
                                    <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                                    <td className="py-2 px-3 text-muted">{item.estimatedMaterial}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-muted bg-primary p-4 rounded-md">No Bill of Materials available for this model.</p>
            )}
        </div>
      </div>
    </div>
  );
}