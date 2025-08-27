
import React, { Suspense, useState, useEffect, useMemo } from 'react';
// Canvas and Drei are now sourced from window globals to ensure a single instance.
// import { Canvas } from '@react-three/fiber';
// import * as Drei from '@react-three/drei';
import { ModelOutput, DesignInput, StructuralAnalysisResult, CfdAnalysisResult } from '../types';
import { SteelFrame } from './SteelFrame';
import { Spinner } from './common/Spinner';
import { Button } from './common/Button';
import { DownloadIcon, MicrophoneIcon, SparklesIcon, WindIcon } from './icons';
import { generateModelFileContent, performStructuralAnalysis, performCfdAnalysis } from '../services/geminiService';

interface ModelViewerProps {
  model: ModelOutput;
  inputs: DesignInput[];
  onRefine: (modelId: string, refinementText: string, originalInputIds: string[]) => void;
  isLoadingRefinement: boolean;
}

const DynamicModel: React.FC<{ code: string }> = ({ code }) => {
    const [Component, setComponent] = useState<React.ComponentType | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setComponent(null);
        setError(null);

        if (!code || code.startsWith('// Failed')) {
            setError(code || 'No code available for this model.');
            return;
        }

        const loadComponent = async () => {
            try {
                // Sanitize the code to remove any rogue import statements that the AI might have added.
                // This prevents multiple instances of libraries like Three.js from being loaded.
                // The new regex is more robust and handles multi-line imports.
                const sanitizedCode = code.replace(/import[\s\S]*?from\s*['"].*['"];?/g, '// Import removed by sanitizer');

                // The global `window.*` variables are populated in index.tsx
                const fullCode = `
                    const React = window.React;
                    const THREE = window.THREE;
                    const Drei = window.ReactThreeDrei;
                    ${sanitizedCode}
                `;
                
                const url = 'data:text/javascript;base64,' + btoa(fullCode);
                const mod = await import(/* @vite-ignore */ url);
                
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
        };

        loadComponent();

        return () => {
            isMounted = false;
        };
    }, [code]);

    const Drei = (window as any).ReactThreeDrei;
    if (!Drei) return null; // Wait for Drei to be available

    if (error) {
        return <Drei.Text color="red" fontSize={0.2} maxWidth={5} textAlign="center" >{`Error rendering model:\n${error}`}</Drei.Text>;
    }

    if (!Component) {
        return (
             <Drei.Text color="white" fontSize={0.3} anchorX="center" anchorY="middle">Loading dynamic model...</Drei.Text>
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

const AnalysisResultDisplay: React.FC<{ result: StructuralAnalysisResult | CfdAnalysisResult }> = ({ result }) => {
    const tableData = useMemo(() => {
        const rows = result.data.split('\n').filter(Boolean);
        const header = rows[0].split(',');
        const body = rows.slice(1).map(row => row.split(','));
        return { header, body };
    }, [result.data]);

    const handleDownload = (content: string, fileName: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-lg font-semibold text-light mb-2">Analysis Plot</h4>
                <div className="bg-primary p-2 rounded-md">
                   <img src={result.imageUrl} alt="Analysis plot" className="w-full h-auto object-contain rounded" />
                   <Button onClick={() => handleDownload(result.imageUrl, 'analysis-plot.png', 'image/png')} variant="secondary" className="w-full mt-2 text-xs">
                        <DownloadIcon className="w-4 h-4 mr-2"/> Download Image
                   </Button>
                </div>
            </div>
             <div>
                <h4 className="text-lg font-semibold text-light mb-2">Analysis Report</h4>
                <div className="bg-primary p-4 rounded-md whitespace-pre-wrap text-sm text-muted max-h-60 overflow-y-auto">{result.report}</div>
            </div>
            <div>
                <h4 className="text-lg font-semibold text-light mb-2">Data Table</h4>
                 <div className="bg-primary p-2 rounded-md">
                    <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-muted border-b border-gray-600 sticky top-0 bg-primary">
                                <tr>
                                    {tableData.header.map((h, i) => <th key={i} className="py-2 px-3 font-semibold">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.body.map((row, i) => (
                                    <tr key={i} className="border-t border-gray-700">
                                        {row.map((cell, j) => <td key={j} className="py-2 px-3">{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button onClick={() => handleDownload(result.data, 'analysis-data.csv', 'text/csv;charset=utf-8;')} variant="secondary" className="w-full mt-2 text-xs">
                        <DownloadIcon className="w-4 h-4 mr-2"/> Download CSV
                   </Button>
                </div>
            </div>
        </div>
    );
};


export const ModelViewer: React.FC<ModelViewerProps> = ({ model, inputs, onRefine, isLoadingRefinement }) => {
  const [refinementText, setRefinementText] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
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

  // Memoize speech recognition object and support
  const { isVoiceSupported, recognition } = useMemo(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isSupported = !!SpeechRecognitionAPI;
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

  // Effect for Structural Analysis loading messages
  useEffect(() => {
    const structuralAnalysisMessages = [
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
    const cfdAnalysisMessages = [
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

  useEffect(() => {
    if (!recognition) return;

    const handleResult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setRefinementText(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsRecording(false);
    };

    const handleError = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
    };

    const handleEnd = () => {
        setIsRecording(false);
    };

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

  const handleRefine = () => {
    if (refinementText.trim()) {
      onRefine(model.id, refinementText, model.inputIds);
      setRefinementText('');
    }
  };
  
  const handleToggleRecording = () => {
    if (!isVoiceSupported || !recognition) return;
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
        setIsRecording(true);
    }
  };

  const handleDownload = async (format: 'GLB' | 'FBX' | 'OBJ') => {
    if (format !== 'OBJ') {
      alert(`Downloading ${format} files is not yet implemented. Please use OBJ format.`);
      return;
    }

    setDownloadingFormat(format);
    try {
        const fileContent = await generateModelFileContent(model.description, 'obj');

        if (fileContent.startsWith('// Generation Failed')) {
            alert(`Failed to generate OBJ file: ${fileContent}`);
            setDownloadingFormat(null);
            return;
        }

        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
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
  };

  const handleRunAnalysis = async () => {
    if (!analysisPrompt.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
        const result = await performStructuralAnalysis(model.description, analysisPrompt);
        setAnalysisResult(result);
    } catch (e: any) {
        setAnalysisError(e.message || "An unknown error occurred during analysis.");
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const handleRunCfdAnalysis = async () => {
    if (!cfdPrompt.trim()) return;
    setIsCfdAnalyzing(true);
    setCfdAnalysisResult(null);
    setCfdAnalysisError(null);
    try {
        const result = await performCfdAnalysis(model.description, cfdPrompt);
        setCfdAnalysisResult(result);
    } catch (e: any) {
        setCfdAnalysisError(e.message || "An unknown error occurred during CFD analysis.");
    } finally {
        setIsCfdAnalyzing(false);
    }
  };

  // Source R3F components from globals to ensure single instance
  const { Canvas } = (window as any).ReactThreeFiber || {};
  const Drei = (window as any).ReactThreeDrei;

  if (!Canvas || !Drei) {
    return <div className="flex items-center justify-center h-full"><Spinner /> <p className="ml-4">Loading 3D libraries...</p></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[75vh]">
      <div className="bg-primary rounded-lg relative overflow-hidden">
        <Canvas camera={{ fov: 45 }}>
          <Suspense fallback={null}>
            <Drei.Stage intensity={0.6} environment={null}>
                {model.modelCode ? <DynamicModel code={model.modelCode} /> : <SteelFrame />}
            </Drei.Stage>
          </Suspense>
          <Drei.OrbitControls makeDefault autoRotate />
        </Canvas>
        <div className="absolute top-2 left-2 bg-secondary/50 p-2 rounded-md text-xs">
          Drag to rotate, Scroll to zoom, Right-click to pan.
        </div>
      </div>

      <div className="flex flex-col space-y-4 overflow-y-auto pr-2">
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
                    disabled={isLoadingRefinement}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'bg-highlight text-white animate-pulse' : 'text-muted hover:text-light hover:bg-secondary'}`}
                    title="Record voice command"
                >
                    <MicrophoneIcon className="w-5 h-5" />
                </button>
            )}
           </div>
          {isRecording && <p className="text-sm text-highlight mt-1 text-center">Listening...</p>}
          <Button onClick={handleRefine} isLoading={isLoadingRefinement} className="w-full mt-2" disabled={isLoadingRefinement || isRecording}>
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
            <Button onClick={handleRunAnalysis} isLoading={isAnalyzing} className="w-full mt-2">
                <SparklesIcon className="w-5 h-5 mr-2" />
                Run Analysis with AI
            </Button>
            {isAnalyzing && <p className="text-sm text-highlight mt-2 text-center transition-opacity duration-300">{analysisLoadingMessage}</p>}
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
            <Button onClick={handleRunCfdAnalysis} isLoading={isCfdAnalyzing} className="w-full mt-2">
                <WindIcon className="w-5 h-5 mr-2" />
                Run CFD Analysis with AI
            </Button>
            {isCfdAnalyzing && <p className="text-sm text-highlight mt-2 text-center transition-opacity duration-300">{cfdLoadingMessage}</p>}
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
};