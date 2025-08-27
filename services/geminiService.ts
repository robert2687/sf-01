

import { GoogleGenAI, GenerateContentResponse, Part, Type } from "@google/genai";
import { DesignInput, DesignInputType, Project, BillOfMaterialsItem, StructuralAnalysisResult, CfdAnalysisResult, getDesignInputType } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

var ai: GoogleGenAI | null = null;

// Lazy initialization to avoid a top-level constructor call, which can cause issues in some module parsing environments.
function getAi(): GoogleGenAI {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}


function dataUrlToGeminiPart(dataUrl: string, fileName?: string): Part {
  let [header, data] = dataUrl.split(',');
  let mimeTypeMatch = header.match(/:(.*?);/);
  if (!mimeTypeMatch || !data) {
    throw new Error(`Invalid data URL format for file: ${fileName}`);
  }
  let mimeType = mimeTypeMatch[1];
  
  return {
    inlineData: {
      mimeType,
      data,
    },
  };
}

export async function generateModelDescription(
  inputs: DesignInput[], 
  refinementText?: string,
  systemPrompt?: string
): Promise<string> {
  try {
    let systemInstruction = systemPrompt || `You are a sophisticated AI agent assisting steel structure engineers and fabricators. Your task is to interpret various inputs (text descriptions, reference images, hand-drawn sketches, DXF CAD files) and generate a coherent, detailed, and technical description for a 3D model of a steel structure. 
- Be precise about components (e.g., I-beams, trusses, columns), dimensions, connections, and overall architectural style. 
- When a DXF file is provided, treat its content as precise 2D geometric data, including coordinates, layers, and entities, to accurately inform the 3D model's layout and dimensions.
- The output must be a single block of text describing the final 3D model.`;

    let userPrompt = "Generate a 3D model description based on the following inputs:\n\n";
    let contentParts: Part[] = [];
    let DesignInputType = getDesignInputType();

    inputs.forEach((input, index) => {
      if (input.type === DesignInputType.TEXT) {
        userPrompt += `Input ${index + 1} (Text): ${input.data}\n`;
      } else if (input.type === DesignInputType.IMAGE) {
        userPrompt += `Input ${index + 1} (Image - ${input.fileName}): A visual reference for the structure.\n`;
        contentParts.push(dataUrlToGeminiPart(input.data, input.fileName));
      } else if (input.type === DesignInputType.DXF) {
        userPrompt += `Input ${index + 1} (DXF CAD File - ${input.fileName}): A 2D technical drawing providing the floor plan and dimensions. The content is:\n\`\`\`dxf\n${input.data}\n\`\`\`\n`;
      }
    });

    if (refinementText) {
      userPrompt += `\nRefinement instructions: ${refinementText}\n`;
    }

    contentParts.unshift({ text: userPrompt });

    let response: GenerateContentResponse = await getAi().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contentParts },
      config: {
        systemInstruction,
        temperature: 0.5,
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating model description:", error);
    if (error instanceof Error) {
        return `Failed to generate model: ${error.message}`;
    }
    return "An unknown error occurred during model generation.";
  }
};

export async function generateModelData(
  description: string,
  systemPrompt?: string
): Promise<{ modelCode: string; billOfMaterials: BillOfMaterialsItem[]; engineeringRationale: string }> {
  let MAX_RETRIES = 3;

  let systemInstruction = systemPrompt || `You are an expert in 3D modeling and React component generation, specifically using @react-three/drei and THREE.js. Your task is to convert a technical description of a steel structure into a JSON object containing a React component string, a Bill of Materials, and an engineering rationale.

**CRITICAL RULES:**
1.  **NO JSX SYNTAX:** The output \`modelCode\` string **MUST** use \`React.createElement()\` exclusively. Do not use JSX tags like \`<Drei.Box>\`.
2.  **USE GLOBAL VARIABLES:** The code **MUST** reference libraries from the \`window\` object (e.g., \`window.React\`, \`window.THREE\`, \`window.ReactThreeDrei\`). Do **NOT** include any \`import\` statements.
3.  **DEFAULT EXPORT:** The generated code string **MUST** have a default export of a functional React component.
4.  **SYNTACTICALLY CORRECT:** The generated Javascript code must be 100% syntactically correct and ready for dynamic import.
5.  **COMPLETE JSON:** The entire output must be a single, valid JSON object that adheres to the provided schema.

**EXAMPLE of CORRECT \`modelCode\` SYNTAX:**
\`\`\`javascript
export default function Model(props) {
  const React = window.React;
  const Drei = window.ReactThreeDrei;
  const THREE = window.THREE;
  const beamMaterial = React.useMemo(() => new THREE.MeshStandardMaterial({ color: '#cccccc' }), []);
  return React.createElement(
    'group',
    props,
    React.createElement(Drei.Box, { args: [0.5, 5, 0.5], material: beamMaterial, position: [-5, 2.5, 5] })
  );
}
\`\`\`

**FINAL CHECK:** Before outputting the JSON, mentally review the `modelCode` string. Does it contain any JSX? Does it have import statements? Is it a valid default export? If any of these are true, fix it. Your final response MUST be only the raw JSON.`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let response = await getAi().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the system instructions, create the complete JSON object for the following steel structure: ${description}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              modelCode: { type: Type.STRING, description: "A string of React component code using `React.createElement`. It must not contain any JSX syntax or import statements and must have a default export." },
              billOfMaterials: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    component: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    estimatedMaterial: { type: Type.STRING },
                  }
                }
              },
              engineeringRationale: { type: Type.STRING, description: "A brief explanation of the design choices made." },
            },
            required: ["modelCode", "billOfMaterials", "engineeringRationale"],
          },
        },
      });

      // Robustly find and parse the JSON block from the AI's response.
      const rawResponse = response.text.trim();
      let jsonString = rawResponse;
      const jsonMatch = rawResponse.match(/```(json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[2]) {
        jsonString = jsonMatch[2];
      }
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(jsonString);
      } catch (e) {
        console.error(`Attempt ${attempt}: JSON parsing failed. Raw response: "${rawResponse}"`, e);
        throw new Error(`Invalid JSON response from AI. Sanitized attempt: ${jsonString}`);
      }

      // Validate the structure of the parsed object.
      if (typeof parsedResponse !== 'object' || parsedResponse === null || !('modelCode' in parsedResponse) || typeof parsedResponse.modelCode !== 'string') {
        throw new Error(`AI response is not a valid object with a 'modelCode' string property. Response: ${jsonString}`);
      }

      let { modelCode, billOfMaterials, engineeringRationale } = parsedResponse;
      
      if (!modelCode.includes('export default')) {
           throw new Error("Generated code is missing a default export.");
      }
      
      if (/<[a-zA-Z]/.test(modelCode)) { // Simple regex to detect potential JSX
          throw new Error("Generated code appears to contain invalid JSX syntax.");
      }

      // **VALIDATION STEP**
      try {
        let url = 'data:text/javascript;base64,' + btoa(modelCode);
        await import(/* @vite-ignore */ url);
      } catch (e) {
        console.error(`Attempt ${attempt}: Dynamic import validation failed.`, e);
        const originalErrorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Generated code failed validation. Reason: ${originalErrorMessage}`);
      }

      return { modelCode, billOfMaterials, engineeringRationale };

    } catch (error) {
      console.error(`Error on attempt ${attempt} of ${MAX_RETRIES}:`, error);
      if (attempt === MAX_RETRIES) {
        return {
          modelCode: `// Generation Failed after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : String(error)}`,
          billOfMaterials: [],
          engineeringRationale: `Failed to generate a valid model. The AI returned invalid data or code that could not be parsed or validated. Last error: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }

  // This should not be reached, but is a fallback.
  throw new Error("Model generation failed after all retries.");
};

export async function generateProjectVisualBrief(project: Project): Promise<{ text: string; imageUrl: string; }> {
    try {
        const prompt = `You are an AI assistant for an architectural design firm. Your task is to generate a short, compelling "Visual Brief" for a steel structure project. This brief should read like an art director's concept for a photorealistic rendering. Describe the mood, lighting, materials, and environment in a way that paints a vivid picture for the client. Keep it concise (2-3 sentences).

        Project Details:
        - Name: ${project.name}
        - Description: ${project.description}
        - Key Inputs: ${project.inputs.map(i => i.data).join(', ')}.

        Generate the visual brief text only.`;

        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.8,
            }
        });
        
        return {
            text: response.text.trim(),
            imageUrl: 'https://storage.googleapis.com/maker-suite-guides/steel-forge/visual-brief-bg.png'
        };
    } catch (error) {
        console.error("Error generating project visual brief:", error);
        throw new Error("The AI failed to generate a visual brief. Please try again later.");
    }
};

export async function generateModelFileContent(modelDescription: string, format: 'obj'): Promise<string> {
  let prompt = `You are a file format generator. Based on the following technical description, create the complete text content for a 3D model file in the Wavefront OBJ (.obj) format.
  
  **Description:**
  ${modelDescription}
  
  **Instructions:**
  - Generate only the raw text content of the .obj file.
  - Do not include any explanations, comments (unless they are valid OBJ comments starting with '#'), or markdown formatting.
  - Define vertices (v), vertex normals (vn), faces (f), and object groups (o).
  - Ensure the file is syntactically correct.
  
  Begin .obj file content now:`;
  try {
    let response = await getAi().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch(e) {
      console.error("Failed to generate OBJ file content", e);
      return `// Generation Failed: ${e instanceof Error ? e.message : 'Unknown Error'}`;
  }
};

async function performAnalysis(
    modelDescription: string, 
    userPrompt: string, 
    systemPrompt: string
): Promise<StructuralAnalysisResult | CfdAnalysisResult> {

    let response = await getAi().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Model Description: "${modelDescription}". User analysis request: "${userPrompt}"`,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    report: { type: Type.STRING, description: "A markdown-formatted summary of the analysis findings, methodology, and conclusions." },
                    data: { type: Type.STRING, description: "A CSV-formatted string of the raw data. The first line must be the headers." },
                    imageUrl: { type: Type.STRING, description: "A base64-encoded PNG data URL (e.g., 'data:image/png;base64,...') representing a plot of the results (e.g., stress plot, pressure map)." }
                },
                required: ['report', 'data', 'imageUrl']
            }
        }
    });

    try {
        const rawResponse = response.text.trim();
        let jsonString = rawResponse;
        const jsonMatch = rawResponse.match(/```(json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[2]) {
            jsonString = jsonMatch[2];
        }
        
        const result = JSON.parse(jsonString);

        if (typeof result !== 'object' || result === null || !result.imageUrl || !result.imageUrl.startsWith('data:image/png;base64,')) {
            throw new Error('AI did not return a valid object or a valid data URL for the image.');
        }
        return result;
    } catch(e) {
        console.error("Failed to parse analysis result from AI.", e, "Raw response:", response.text);
        throw new Error(`Failed to get a valid analysis from the AI. Raw response: ${response.text}`);
    }
}

export async function performStructuralAnalysis(modelDescription: string, userPrompt: string): Promise<StructuralAnalysisResult> {
    let systemPrompt = `You are an advanced structural analysis AI simulator that performs finite element analysis (FEA). Your task is to analyze a model based on its geometric description and user-defined conditions.

**Chain of Thought Process:**
1.  **Interpret & Setup:**
    *   Parse the geometry from the model description.
    *   Identify loads, constraints, and material properties from the user prompt. Assume standard S235 steel (Young's Modulus = 200 GPa, Poisson's Ratio = 0.3) if not specified.
    *   State any assumptions made (e.g., "Assuming pinned supports at all column bases," "Assuming a 2D planar analysis for simplicity").
    *   Briefly describe the conceptual mesh (e.g., "A fine tetrahedral mesh will be used around connection points").

2.  **Simulate:**
    *   Mentally perform the FEA simulation to calculate stress (von Mises), strain, and displacement fields.

3.  **Generate Outputs (JSON Format):**
    *   **report:** A concise markdown report detailing the setup, assumptions, key results (max stress, max deflection with location), and a conclusion on whether the design is adequate under the given loads.
    *   **data:** A simple CSV table of critical data points. Include at least 5-10 points from high-stress or high-displacement areas (e.g., node_id,x,y,z,stress_MPa,displacement_mm).
    *   **imageUrl:** A base64-encoded PNG data URL of a representative visual plot. This must be a color-mapped stress contour plot or a deflection diagram, clearly labeled with a color legend and units.`;
    return performAnalysis(modelDescription, userPrompt, systemPrompt);
};

export async function performCfdAnalysis(modelDescription: string, userPrompt: string): Promise<CfdAnalysisResult> {
    let systemPrompt = `You are a Computational Fluid Dynamics (CFD) AI simulator. Your task is to simulate fluid flow over a structure.
    1.  **Interpret**: Understand the geometry from the model description and the flow conditions (velocity, fluid type) from the user prompt.
    2.  **Simulate**: Mentally perform a CFD analysis, calculating pressure, velocity fields, and forces.
    3.  **Generate Plot**: Create a visual plot (e.g., a pressure coefficient map or velocity streamlines). Encode this plot as a base64 PNG data URL.
    4.  **Generate Report**: Write a concise markdown report explaining the simulation setup (mesh, turbulence model), key results (lift/drag coefficients), and conclusions.
    5.  **Generate Data**: Create a simple CSV table of relevant data (e.g., surface_point, pressure_coefficient).
    6.  **Output**: Return these three items in the specified JSON format.`;
    return performAnalysis(modelDescription, userPrompt, systemPrompt);
};

export async function generateScriptForTool(prompt: string, target: 'blender' | 'threejs' | 'openscad'): Promise<string> {
    let languageMap = { blender: 'Python', threejs: 'JavaScript', openscad: 'OpenSCAD script' };
    let systemPrompt = `You are an expert code generator for 3D software. Your task is to write a clean, efficient, and fully functional script in ${languageMap[target]} based on the user's prompt.
    - The script must be self-contained and ready to run.
    - Do not include any explanations, markdown, or text outside of the code itself.
    - For Blender, use the bpy library. For Three.js, assume a standard scene setup.
    - Your entire response should be only the raw code.`;

    try {
        let response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a ${languageMap[target]} script for the following request: "${prompt}"`,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.2,
            }
        });
        return response.text.replace(/```[\w\s]*\n|```/g, '').trim(); // Clean up potential markdown fences
    } catch(e) {
        console.error(`Failed to generate script for ${target}`, e);
        return `// Generation Failed: ${e instanceof Error ? e.message : 'Unknown Error'}`;
    }
};
