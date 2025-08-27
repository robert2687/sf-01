
import React from 'react';

const Section: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
    <div className="bg-secondary p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-2xl font-bold text-highlight mb-4 border-b-2 border-gray-700 pb-2">{title}</h2>
        <div className="prose prose-invert prose-p:text-muted prose-li:text-muted prose-a:text-accent prose-strong:text-light prose-headings:text-light max-w-none space-y-4">{children}</div>
    </div>
);

const CodeBlock: React.FC<{ language: string, children: string }> = ({ language, children }) => (
    <pre className="bg-primary p-4 rounded-md overflow-x-auto"><code className={`language-${language}`}>{children.trim()}</code></pre>
);

export const DocsView: React.FC = () => {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold">AI Development Guides</h1>
                <p className="text-muted mt-2 max-w-3xl mx-auto">
                    A collection of best practices, templates, and advanced techniques for building robust AI-powered applications, from prompt engineering to CI/CD.
                </p>
            </div>

            <Section title="Backend Architecture: REST API & Model Control Plane (MCP)">
                <p>While this application currently runs entirely in the browser using local storage, a production-grade system requires a robust backend. This guide outlines a proposed architecture based on a REST API and a specialized Model Control Plane (MCP) for handling AI tasks.</p>

                <h4>REST API for Data Persistence</h4>
                <p>The core of the backend would be a RESTful API to manage all project data, replacing the current browser-based context. This ensures data is persistent, secure, and accessible across multiple users and sessions.</p>
                <p>Key endpoints would include:</p>
                <ul>
                    <li><code>GET /projects</code>: Fetches all projects for the authenticated user.</li>
                    <li><code>POST /projects</code>: Creates a new project.</li>
                    <li><code>GET /projects/:id</code>: Retrieves a single project with its inputs, models, and plans.</li>
                    <li><code>POST /projects/:id/inputs</code>: Adds a new input (text, image, DXF) to a project.</li>
                    <li><code>POST /projects/:id/models</code>: Initiates the creation of a new model, which triggers the MCP.</li>
                </ul>

                <h4>Model Control Plane (MCP) for AI Workflows</h4>
                <p>The <strong>Model Control Plane (MCP)</strong> is a specialized backend service responsible for managing the entire lifecycle of asynchronous AI tasks. When a user requests to generate or refine a model, the request is sent to the MCP instead of being executed in the browser.</p>
                <p>The MCP's responsibilities include:</p>
                <ul>
                    <li><strong>Task Queuing:</strong> It places new AI generation requests into a queue (e.g., using RabbitMQ or AWS SQS) to be processed by a pool of workers.</li>
                    <li><strong>Execution Management:</strong> It runs the execution plans (like the ones in <code>agent/index.ts</code>) in a secure server environment, calling the Gemini API and other services as needed.</li>
                    <li><strong>State Tracking:</strong> It updates the database with the status of each task and plan (e.g., `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`).</li>
                    <li><strong>Real-time Updates:</strong> It uses WebSockets or server-sent events to push status updates back to the frontend, so the user sees the progress in real time without needing to refresh.</li>
                </ul>
                <p>This architecture decouples the user interface from the heavy lifting of AI processing, creating a scalable, resilient, and non-blocking user experience.</p>
            </Section>

            <Section title="The Core Concept: A Centralized Digital Thread">
                <p>Instead of just linking a 3D model to a BOM, this application is designed around a central Digital Thread. This is a live, shared data environment that connects every piece of information about the product—from the earliest design concept to manufacturing and supply chain logistics. Every action, every comment, and every data update is recorded and reflected in this thread, making it the single source of truth for all users and AI agents interacting with the system.</p>
                
                <h3 className="!mt-8">Application Architecture: A Deeper Dive</h3>
                <p>The architecture is modular and scalable, designed to support real-time, multi-user interaction through specialized services.</p>
                
                <h4>Data Layer: The Digital Thread Database</h4>
                <p>
                    <strong>Core Database:</strong> A robust database (e.g., PostgreSQL or a graph database like Neo4j) stores the intricate relationships between all product data—linking geometry, BOM items, suppliers, comments, and design versions. A graph database is particularly effective here as it naturally models these complex connections.
                </p>
                <p>
                    <strong>File Storage:</strong> A cloud storage solution (like AWS S3) is used for the large, raw CAD files.
                </p>

                <h4>The AI Agent as a Proactive Team Member</h4>
                <p>The AI is no longer just a tool; it's an active participant in the Digital Thread. It can perform tasks like:</p>
                <ul>
                    <li><strong>Conflict Detection:</strong> When a user changes a material, the AI can check the BOM service, see the cost and lead time impact, and proactively post an alert for the team.</li>
                    <li><strong>Opportunity Surfacing:</strong> The AI can constantly scan the BOM to find opportunities for component standardization and cost reduction, suggesting alternatives to the design and supply chain agents.</li>
                </ul>

                <h3 className="!mt-8">Making the Agent a Better Coworker: Collaborative Features</h3>
                <p>These features are enabled by the architecture and are designed to make teamwork intuitive and effective.</p>
                 <ul>
                    <li><strong>Shared Context & Real-Time Presence:</strong> See live avatars of colleagues in the 3D space and use a "Follow Me" mode for guided design reviews.</li>
                    <li><strong>Contextual Communication & Annotation:</strong> "Drop a pin" directly on a 3D part to leave a comment, which notifies relevant team members and links them to the exact camera view for context.</li>
                    <li><strong>Asynchronous Design Reviews & Workflows:</strong> A formal review mode locks parts for changes and uses checklist-based approvals, creating a complete, auditable history of all decisions.</li>
                </ul>

            </Section>

            <Section title="Building an Advanced 3D BOM Visualizer: A Persona-Driven Approach">
                <p>To build an effective tool, you must first understand the users. Different roles have different needs and will interact with a 3D Bill of Materials (BOM) visualizer in unique ways. This guide outlines the core user personas and the technical components required to meet their needs.</p>

                <h3>User Personas: Who is this for? 👥</h3>
                
                <h4>Persona 1: The Design Engineer (Elena)</h4>
                <p><strong>Goal:</strong> To validate her design, ensure all parts fit correctly, check for manufacturability issues, and keep the design within budget and weight targets.</p>
                <p><strong>What Elena Needs:</strong> Instant cross-highlighting, visual interference analysis, and a real-time dashboard showing cost and weight.</p>

                <h4>Persona 2: The Supply Chain Manager (David)</h4>
                <p><strong>Goal:</strong> To manage procurement, identify supply chain risks, and optimize component costs and lead times.</p>
                <p><strong>What David Needs:</strong> BOM data enriched with supplier information, visual flags on the 3D model for at-risk parts, and a procurement dashboard.</p>

                <h4>Persona 3: The Manufacturing Technician (Maria)</h4>
                <p><strong>Goal:</strong> To understand how a product is assembled or disassembled correctly and efficiently.</p>
                <p><strong>What Maria Needs:</strong> Animated, step-by-step assembly sequences, exploded views, and instant part identification on a tablet-friendly UI.</p>

            </Section>
            
            <Section title="AI Studio Prompt Template for 3D Models">
                <p>Use this template structure to generate a complete 3D model pipeline, including a technical description, renderable code, a Bill of Materials (BOM), and optional automation scripts.</p>
                
                <h3>System Prompt</h3>
                <p>Define the AI's role and capabilities.</p>
                <CodeBlock language="text">{`
You are a highly skilled assistant specialized in 3D modeling, structural design, and workshop automation. Your task is to generate a complete 3D model pipeline from user inputs, including:

1. A structured technical description of the model
2. Renderable 3D code (e.g., Blender Python or Three.js)
3. A Bill of Materials (BOM) with optimization metrics
4. Optional automation scripts for CNC and CAD workflows

Ensure the output is modular, practical, and manufacturable. Include engineering rationale and minimize material waste.
                `}</CodeBlock>

                <h3 className="!mt-8">User Prompt Template</h3>
                <p>Structure the user's request for clarity and detail.</p>
                <CodeBlock language="text">{`
📐 Construction Parameters
- Structure Type: [e.g., Steel Frame Hall]
- Dimensions: [Length x Width x Height]
- Application: [e.g., Workshop, Warehouse]
- Environmental Constraints: [e.g., Wind Load, Snow Load]

🧰 Model Components
- Columns: [Profile type, spacing]
- Trusses: [Spacing, style]
- Bracing: [Type, placement]
- Foundation: [e.g., Concrete footings with anchors]
- Roof: [e.g., Gable, Hipped]
                `}</CodeBlock>
            </Section>

            <Section title="Automating Blender Exports & Advanced Viewers">
                 <h3>Automating Exports with a Python Script</h3>
                <p>This Blender Python script automates the process of setting up a scene, creating multiple Levels of Detail (LODs) for a model, and exporting it as a Draco-compressed GLB file, ready for the web.</p>
                <CodeBlock language="python">{`
import bpy
import os

# === CONFIGURATION ===
output_path = bpy.path.abspath("//model.glb")
# Assumes HDRI is in a /textures subfolder. Ensure the file exists.
hdr_path = bpy.path.abspath("//textures/studio_hdr.hdr")

# === SCENE SETUP ===
# Clear existing objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Add HDRI environment for realistic lighting
world = bpy.context.scene.world
world.use_nodes = True
nodes = world.node_tree.nodes
nodes.clear()
bg_node = nodes.new(type='ShaderNodeBackground')
env_node = nodes.new(type='ShaderNodeTexEnvironment')
if os.path.exists(hdr_path):
    env_node.image = bpy.data.images.load(hdr_path)
links = world.node_tree.links
links.new(env_node.outputs['Color'], bg_node.inputs['Color'])
output_node = nodes.new(type='ShaderNodeOutputWorld')
links.new(bg_node.outputs['Background'], output_node.inputs['Surface'])


# === CREATE PAVILION MESHES WITH LODs ===
def create_lod_cube(name, location, size, material_color):
    bpy.ops.mesh.primitive_cube_add(size=size, location=location)
    obj = bpy.context.active_object
    obj.name = name
    mat = bpy.data.materials.new(name + "_Mat")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs['Base Color'].default_value = material_color
    obj.data.materials.append(mat)

# LOD0 (high detail), LOD1 (medium), LOD2 (low)
create_lod_cube("Pavilion_LOD0", (0, 0, 0), 2, (0.6, 0.6, 0.6, 1))
create_lod_cube("Pavilion_LOD1", (3, 0, 0), 1.5, (0.3, 0.3, 0.3, 1))
create_lod_cube("Pavilion_LOD2", (6, 0, 0), 1, (0.1, 0.1, 0.1, 1))

# === EXPORT TO GLB WITH DRACO COMPRESSION ===
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_yup=True
)

print(f"✅ Exported Draco-compressed GLB to: {output_path}")
                `}</CodeBlock>

                <h3 className="!mt-8">Advanced Interactive Viewer Template</h3>
                <p>This HTML template creates a complete, professional 360° WebGL viewer using Three.js. It includes Draco model loading, material variant toggles, LOD switching, and raycast-based annotations.</p>
                 <CodeBlock language="html">{`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Interactive Pavilion Viewer</title>
  <style>
    body { margin: 0; overflow: hidden; font-family: sans-serif; }
    canvas { display: block; }
    .annotation {
      position: absolute;
      background: rgba(255,255,255,0.9);
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 14px;
      pointer-events: none;
      transform: translate(-50%, -100%);
    }
  </style>
</head>
<body>
  <div id="annotation" class="annotation" style="display:none;"></div>
  <script type="module">
    import * as THREE from './libs/three.module.js';
    import { GLTFLoader } from './libs/GLTFLoader.js';
    import { DRACOLoader } from './libs/DRACOLoader.js';
    import { RGBELoader } from './libs/RGBELoader.js';
    import { OrbitControls } from './libs/OrbitControls.js';
    import { GUI } from './libs/dat.gui.module.js';

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(5, 2, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    new RGBELoader().load('./textures/studio_hdr.hdr', hdr => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = hdr;
      scene.background = hdr;
    });

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    let pavilion;
    gltfLoader.load('./model.glb', gltf => {
      pavilion = gltf.scene;
      scene.add(pavilion);
    });

    const gui = new GUI();
    const settings = { LOD: 0 };
    gui.add(settings, 'LOD', 0, 2, 1).onChange(level => {
      if (!pavilion) return;
      pavilion.traverse(obj => {
        if (obj.isMesh) obj.visible = obj.name.includes(\`LOD\${level}\`);
      });
    });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>
                `}</CodeBlock>
            </Section>

            <Section title="Example Prompts for 3D Model Generation">
                <p>Use these examples as a starting point for generating complex and detailed models. The key is to be specific about dimensions, materials, components, and any relevant engineering standards.</p>
                
                <h3>For Structural Systems & Framing 🏛️</h3>
                <CodeBlock language="text">{`
Generate a three-story, open-plan office building frame with dimensions of 30m x 50m. The structural system is a steel moment-resisting frame based on Eurocode 3. Use HEB400 columns for the main grid and IPE500 primary beams. The floor system should be a composite slab with 150mm thick concrete on Holorib decking. Maintain a floor-to-floor height of 4 meters.
                `}</CodeBlock>

                <h3 className="!mt-8">For Detailed Connections & Joints 🔩</h3>
                <CodeBlock language="text">{`
Detail all beam-to-column connections for the previously generated office frame. Use bolted extended end-plate connections. The plates must be 25mm thick with 10 M24 Grade 10.9 bolts, including models for all nuts and washers. Apply a 6mm fillet weld between the beam and the end plate. Ensure bolt holes have a 2mm clearance.
                `}</CodeBlock>

                <h3 className="!mt-8">For Parametric & Generative Design ⚙️</h3>
                <CodeBlock language="text">{`
Generate three design variations of a support scaffold for a 5,000-liter cylindrical tank. The primary goal is to minimize total mass while using standard L-profile steel sections. The structure must safely support a vertical load of 60 kN and a lateral seismic load of 15 kN. The output should include a basic Finite Element Analysis (FEA) stress map for each variation, highlighting areas of maximum stress.
                `}</CodeBlock>

            </Section>
        </div>
    );
};
