
import { GoogleGenAI, GenerateContentResponse, Part, Type } from "@google/genai";
import { DesignInput, DesignInputType, Project, BillOfMaterialsItem, StructuralAnalysisResult, CfdAnalysisResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function dataUrlToGeminiPart(dataUrl: string, fileName?: string): Part {
  const [header, data] = dataUrl.split(',');
  const mimeTypeMatch = header.match(/:(.*?);/);
  if (!mimeTypeMatch || !data) {
    throw new Error(`Invalid data URL format for file: ${fileName}`);
  }
  const mimeType = mimeTypeMatch[1];
  
  return {
    inlineData: {
      mimeType,
      data,
    },
  };
}

export const generateModelDescription = async (
  inputs: DesignInput[], 
  refinementText?: string,
  systemPrompt?: string
): Promise<string> => {
  try {
    const systemInstruction = systemPrompt || `You are a sophisticated AI agent assisting steel structure engineers and fabricators. Your task is to interpret various inputs (text descriptions, reference images, hand-drawn sketches, DXF CAD files) and generate a coherent, detailed, and technical description for a 3D model of a steel structure. Be precise about components (e.g., I-beams, trusses, columns), dimensions, connections, and overall architectural style. The output must be a single block of text describing the final 3D model.`;

    let userPrompt = "Generate a 3D model description based on the following inputs:\n\n";
    const contentParts: Part[] = [];

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

    const response: GenerateContentResponse = await ai.models.generateContent({
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

export const generateModelData = async (description: string, systemPrompt?: string): Promise<{ modelCode: string; billOfMaterials: BillOfMaterialsItem[]; engineeringRationale: string; }> => {
  const MAX_RETRIES = 3;

  const systemInstruction = systemPrompt || `You are an expert structural detailer and AI assistant for 3D modeling.
Your task is to convert a textual description of a steel structure into a single, valid JSON object containing three things:
1.  A 'modelCode' string: a React component for @react-three/fiber that visualizes the structure.
2.  An 'engineeringRationale' string: an explanation of the key structural choices made.
3.  A 'billOfMaterials' array: a list of the components.

--- RESPONSE FORMAT RULES ---
1.  **Single JSON Object:** Your entire response MUST be a single, raw JSON object. Do not include any other text, explanations, or markdown formatting (like \`\`\`json). The JSON object MUST be complete and strictly adhere to the provided schema.

--- 'modelCode' GENERATION RULES (CRITICAL) ---
1.  **Default Export is Mandatory:** The 'modelCode' value MUST be a JavaScript string that contains a single \`export default\` of an anonymous arrow function. This is the most critical rule.
2.  **Use 'React.createElement':** You MUST NOT use JSX. All elements must be created with \`React.createElement\`.
3.  **Use Global Libraries:** The function will have access to global variables: \`React\`, \`THREE\`, and \`Drei\`. You MUST NOT include \`import\` statements in your code string.
4.  **Structural Realism:** Generate plausible structures using standard profiles (I-beams, trusses) instead of simple cubes for complex descriptions.
5.  **Scaling:** The final model should be scaled to fit within a ~15 unit bounding box.

--- 'modelCode' EXAMPLE ---
This is an example of a PERFECT \`modelCode\` string value:
"export default (props) => { const React = window.React; const Drei = window.ReactThreeDrei; return React.createElement(Drei.Box, { ...props, args: [10, 0.5, 0.5] }); }"

--- RATIONALE & BOM RULES ---
- The 'engineeringRationale' should briefly explain key design choices (e.g., "IPE-300 columns were chosen to handle the 15m span...").
- The 'billOfMaterials' must accurately reflect the components generated in the 'modelCode'.
`;

  const userPrompt = `Generate the JSON output for the following description:\n\nDescription: "${description}"`;
    
  const schema = {
      type: Type.OBJECT,
      properties: {
          modelCode: {
              type: Type.STRING,
              description: "The Javascript code for the React Three Fiber component. Must not contain any markdown formatting."
          },
          engineeringRationale: {
              type: Type.STRING,
              description: "A brief explanation of the structural design choices made in the model code."
          },
          billOfMaterials: {
              type: Type.ARRAY,
              description: "A list of all components required for the structure.",
              items: {
                  type: Type.OBJECT,
                  properties: {
                      component: { type: Type.STRING, description: "Name of the structural component." },
                      quantity: { type: Type.INTEGER, description: "Total number of this component." },
                      estimatedMaterial: { type: Type.STRING, description: "Material specification for a single component (e.g., length and profile)." }
                  },
                  required: ["component", "quantity", "estimatedMaterial"]
              }
          }
      },
      required: ["modelCode", "billOfMaterials", "engineeringRationale"]
  };
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.3 + (attempt - 1) * 0.1, // Increase temperature slightly on retries
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const textResponse = response.text.trim();
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No valid JSON object found in AI response.");
        }
        
        const jsonString = jsonMatch[0];
        const data = JSON.parse(jsonString);
        
        if (!data.modelCode || !data.billOfMaterials || !data.engineeringRationale || !data.modelCode.includes('export default')) {
            throw new Error('Generated JSON is missing required fields or model code is invalid.');
        }
        
        return data;

    } catch (error) {
        console.error(`Error generating model data on attempt ${attempt}:`, error);
        if (attempt === MAX_RETRIES) {
            if (error instanceof Error) {
                throw new Error(`Failed to generate model data after ${MAX_RETRIES} attempts: ${error.message}`);
            }
            throw new Error(`An unknown error occurred during data generation after ${MAX_RETRIES} attempts.`);
        }
        await new Promise(res => setTimeout(res, 1000));
    }
  }

  throw new Error(`Failed to generate model data after all ${MAX_RETRIES} retries.`);
};

// Internal helper to generate a concise summary of project inputs.
const _generateProjectSummaryForImage = async (project: Project): Promise<string> => {
    const systemInstruction = "You are an expert in architectural visualization. Your task is to summarize the key visual elements from the provided project data into a single, vivid sentence for a text-to-image prompt. Focus on the structure type, key materials, and overall shape.";
    
    let prompt = "Summarize the following project details into one descriptive sentence:\n";
    prompt += `Name: ${project.name}\n`;
    prompt += `Description: ${project.description}\n`;
    project.inputs.forEach(input => {
        if (input.type === DesignInputType.TEXT) {
            prompt += `- Input: ${input.data.substring(0, 200)}\n`;
        }
    });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction, temperature: 0.6 }
        });
        return response.text;
    } catch (e) {
        console.error("Failed to generate summary for image prompt:", e);
        // Fallback to simpler description if summary fails
        return `A ${project.description || 'steel structure'}.`;
    }
};

export const generateProjectPreviewImage = async (project: Project): Promise<string> => {
  try {
    // Step 1: Generate a high-quality summary of the project's visual characteristics.
    const summary = await _generateProjectSummaryForImage(project);

    // Step 2: Use the summary to build a detailed and professional image generation prompt.
    const prompt = `Photorealistic architectural rendering of ${summary}.
    Style: cinematic, dramatic lighting, 8K resolution, Unreal Engine 5 render, professional CGI.
    Materials: Emphasize brushed steel beams, polished concrete floors, and large glass panel walls.
    Atmosphere: Clean, modern, professional, with a bright, clear sky in the background suitable for a corporate presentation.
    Composition: A wide-angle shot showing the full structure from a dynamic, low-angle perspective.
    Aspect Ratio: 16:9 widescreen.`;

    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
        throw new Error('No image was generated by the API.');
    }
  } catch (error) {
    console.error("Error generating project preview image:", error);
    if (error instanceof Error) {
        return `Failed to generate image: ${error.message}`;
    }
    return "An unknown error occurred during image generation.";
  }
};

const toolSystemInstructions = {
  blender: `You are an expert in Blender's Python API (bpy). Generate a Python script that can be run directly in Blender's scripting environment. The script should be self-contained and perform the requested 3D modeling task. Do not include any explanations, just the raw Python code. Import the 'bpy' module where necessary.`,
  threejs: `You are an expert in Three.js. Generate a JavaScript code snippet that creates and configures 3D objects as requested. Assume the code will run in an environment where 'THREE' is a global variable representing the Three.js library. The code should be self-contained and ready to be inserted into a Three.js scene setup. Do not include any HTML, setup code (like scene, camera, renderer), or explanations. Just provide the JavaScript code for the object creation and manipulation.`,
  openscad: `You are an expert in OpenSCAD. Generate an OpenSCAD script to create the described model. The script should be concise, correct, and follow best practices for OpenSCAD modeling. Do not include any explanations or comments outside of the code itself. Just provide the raw OpenSCAD script.`,
};


export const generateScriptForTool = async (
  prompt: string,
  target: 'blender' | 'threejs' | 'openscad'
): Promise<string> => {
  try {
    const systemInstruction = toolSystemInstructions[target];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'text/plain',
      },
    });

    let code = response.text;
    code = code.replace(/^```(python|javascript|openscad|js)?\n/, '').replace(/```$/, '').trim();
    return code;

  } catch (error) {
    console.error("Error generating script for tool:", error);
    if (error instanceof Error) {
        return `// Generation Failed: ${error.message}`;
    }
    return "// An unknown error occurred during script generation.";
  }
};

export const generateModelFileContent = async (description: string, format: 'obj'): Promise<string> => {
    try {
        const systemInstruction = `You are an expert 3D modeler who specializes in generating 3D model file content from textual descriptions.
Your task is to convert a detailed description of a steel structure into a valid, text-based 3D model file format.

RULES:
1.  Your entire response must be ONLY the raw text content for the requested file format (e.g., the content of an .obj file).
2.  DO NOT include any explanations, comments outside the file format's spec, or markdown formatting like \`\`\`obj.
3.  For the 'obj' format, you must define vertices (v), and faces (f). You can optionally include vertex normals (vn) if it improves the output.
4.  Ensure the model is manifold and has correct face winding order.
5.  The model geometry should be reasonably scaled to fit within a 15x15x15 bounding box, centered around the origin.
6.  Be precise and generate complex geometry that accurately reflects the description. Simple cubes are not acceptable for detailed descriptions.
7.  The header of the file should contain a comment with the description. For OBJ it's '#'.

Example for a simple cube:
# A simple 1x1x1 cube.
v -0.5 -0.5 -0.5
v -0.5 -0.5 0.5
v -0.5 0.5 -0.5
v -0.5 0.5 0.5
v 0.5 -0.5 -0.5
v 0.5 -0.5 0.5
v 0.5 0.5 0.7
v 0.5 0.5 0.5
f 1 3 4 2
f 5 6 8 7
f 1 5 7 3
f 2 4 8 6
f 1 2 6 5
f 3 7 8 4
`;

        const userPrompt = `Generate the file content for the following request:
Description: "${description}"
Format: "${format}"

File Content:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.3,
                responseMimeType: 'text/plain',
            }
        });

        let fileContent = response.text.trim();
        fileContent = fileContent.replace(/^```(obj)?\n/,'').replace(/```$/,'').trim();
        
        // Basic validation for OBJ
        if (format === 'obj' && (!fileContent.includes('v ') || !fileContent.includes('f '))) {
          throw new Error('Generated OBJ content is invalid. Missing vertices or faces.');
        }

        return fileContent;

    } catch (error) {
        console.error("Error generating model file content:", error);
        if (error instanceof Error) {
            return `// Generation Failed: ${error.message}`;
        }
        return "// An unknown error occurred during file generation.";
    }
};

export const performStructuralAnalysis = async (modelDescription: string, analysisPrompt: string, systemPrompt?: string): Promise<StructuralAnalysisResult> => {
    const systemInstruction = systemPrompt || `You are a seasoned structural engineer. Your task is to analyze a given steel structure based on its description and user-provided loading conditions. You must return a comprehensive analysis in a specific JSON format.

The analysis should include:
1.  A summary report in Markdown format.
2.  A data table in CSV format, including key metrics like moments, forces, and deflections.
3.  A concise, descriptive prompt for an image generation model to create a visual representation of the analysis (e.g., a stress contour plot or a bending moment diagram).

You must return a single, valid JSON object that adheres to the provided schema.`;
    
    const userPrompt = `Please perform a structural analysis on the following model:

**Model Description:**
${modelDescription}

**Analysis Prompt (Loads, Boundary Conditions, etc.):**
${analysisPrompt}

Provide the results in the requested JSON format.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            report: {
                type: Type.STRING,
                description: "A detailed structural analysis report in Markdown format. Include sections for assumptions, methodology, results, and conclusions/recommendations."
            },
            data: {
                type: Type.STRING,
                description: "A CSV-formatted string representing key analysis data. The first row must be the header. For example: 'Point,BendingMoment_kNm,ShearForce_kN,Deflection_mm'."
            },
            plotPrompt: {
                type: Type.STRING,
                description: "A clear, detailed prompt for a text-to-image AI to generate a visualization of the results. E.g., 'A finite element analysis (FEA) stress plot of a steel I-beam under uniform load, showing stress concentrations in red near the supports. The style should be a professional engineering diagram.'"
            }
        },
        required: ["report", "data", "plotPrompt"]
    };

    try {
        // Step 1: Generate the analysis text and the image prompt
        const analysisResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.4,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const jsonString = analysisResponse.text.trim().replace(/^```(json)?\n/, '').replace(/```$/, '').trim();
        const analysisData = JSON.parse(jsonString);

        if (!analysisData.report || !analysisData.data || !analysisData.plotPrompt) {
            throw new Error('Analysis generation failed to return all required fields.');
        }

        // Step 2: Generate the visualization image using the prompt from Step 1
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: analysisData.plotPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '16:9',
            },
        });

        if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
            throw new Error('Image generation failed for the analysis plot.');
        }

        const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

        return {
            report: analysisData.report,
            data: analysisData.data,
            imageUrl: imageUrl,
        };

    } catch (error) {
        console.error("Error performing structural analysis:", error);
        if (error instanceof Error) {
            throw new Error(`Analysis failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during structural analysis.");
    }
};

export const performCfdAnalysis = async (modelDescription: string, analysisPrompt: string, systemPrompt?: string): Promise<CfdAnalysisResult> => {
    const systemInstruction = systemPrompt || `You are a computational fluid dynamics (CFD) engineer. Your task is to perform a CFD analysis on a given structure based on its description and user-provided simulation parameters. You must return a comprehensive analysis in a specific JSON format.

The analysis should include:
1.  A summary report in Markdown format, detailing the setup, methodology (e.g., turbulence model), and results.
2.  A data table in CSV format, including key metrics like lift and drag coefficients, pressure coefficients at key points, etc.
3.  A concise, descriptive prompt for an image generation model to create a visual representation of the fluid flow (e.g., streamlines, velocity contours, or pressure plots).

You must return a single, valid JSON object that adheres to the provided schema.`;

    const userPrompt = `Please perform a CFD analysis on the following model:

**Model Description:**
${modelDescription}

**CFD Analysis Prompt (Flow conditions, models, etc.):**
${analysisPrompt}

Provide the results in the requested JSON format.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            report: {
                type: Type.STRING,
                description: "A detailed CFD analysis report in Markdown format. Include sections for mesh strategy, boundary conditions, turbulence model, results, and conclusions."
            },
            data: {
                type: Type.STRING,
                description: "A CSV-formatted string representing key CFD data. The first row must be the header. For example: 'Coefficient,Value,Unit\\nLiftCoefficient,1.2,-'."
            },
            plotPrompt: {
                type: Type.STRING,
                description: "A clear, detailed prompt for a text-to-image AI to generate a visualization of the CFD results. E.g., 'A CFD visualization of airflow over a building, showing areas of high velocity in yellow and low velocity in blue. The style should be a professional engineering diagram.'"
            }
        },
        required: ["report", "data", "plotPrompt"]
    };

    try {
        // Step 1: Generate the CFD analysis text and the image prompt
        const analysisResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.4,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const jsonString = analysisResponse.text.trim().replace(/^```(json)?\n/, '').replace(/```$/, '').trim();
        const analysisData = JSON.parse(jsonString);

        if (!analysisData.report || !analysisData.data || !analysisData.plotPrompt) {
            throw new Error('CFD analysis generation failed to return all required fields.');
        }

        // Step 2: Generate the visualization image using the prompt from Step 1
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: analysisData.plotPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '16:9',
            },
        });

        if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
            throw new Error('Image generation failed for the CFD plot.');
        }

        const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

        return {
            report: analysisData.report,
            data: analysisData.data,
            imageUrl: imageUrl,
        };

    } catch (error) {
        console.error("Error performing CFD analysis:", error);
        if (error instanceof Error) {
            throw new Error(`CFD analysis failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during CFD analysis.");
    }
};
