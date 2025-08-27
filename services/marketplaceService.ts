import { MarketplaceComponent } from '../types';

let marketplaceComponents: MarketplaceComponent[] | null = null;

function getComponents(): MarketplaceComponent[] {
    if (marketplaceComponents) {
        return marketplaceComponents;
    }

    // Simple model code for a single beam
    let beamModelCode = `
export default function BeamComponent({ props }) {
  const React = window.React;
  const Drei = window.ReactThreeDrei;
  return React.createElement(
    'group',
    props,
    React.createElement(
        Drei.Box,
        { args: [8, 0.5, 0.5] },
        React.createElement('meshStandardMaterial', { color: '#cccccc', metalness: 0.8, roughness: 0.4 })
    )
  );
}
`;

    // Simple model code for a truss
    let trussModelCode = `
export default function TrussComponent({ props }) {
    const React = window.React;
    const Drei = window.ReactThreeDrei;
    const THREE = window.THREE;
    const beamMaterial = React.useMemo(() => new THREE.MeshStandardMaterial({ color: '#A9A9A9', metalness: 0.8, roughness: 0.4 }), []);

    const TrussBeam = (args, position, rotation) => React.createElement(Drei.Box, { args, material: beamMaterial, position, rotation });

    return React.createElement(
        'group',
        props,
        // Top and bottom chords
        TrussBeam([10, 0.2, 0.2], [0, 1, 0]),
        TrussBeam([10, 0.2, 0.2], [0, -1, 0]),
        // Verticals
        TrussBeam([0.2, 2, 0.2], [-4, 0, 0]),
        TrussBeam([0.2, 2, 0.2], [0, 0, 0]),
        TrussBeam([0.2, 2, 0.2], [4, 0, 0]),
        // Diagonals
        TrussBeam([5.66, 0.2, 0.2], [-2, 0, 0], [0, 0, Math.PI / 4]),
        TrussBeam([5.66, 0.2, 0.2], [2, 0, 0], [0, 0, -Math.PI / 4])
    );
}
`;

    marketplaceComponents = [
      {
        id: 'comp-truss-01',
        name: 'Standard Warren Truss',
        description: 'A 10-meter long standard Warren-style truss. Ideal for roofing and bridge applications. Parametric adjustments not yet supported.',
        category: 'Trusses',
        previewImageUrl: 'https://storage.googleapis.com/maker-suite-guides/steel-forge/truss.png',
        modelCode: trussModelCode,
      },
      {
        id: 'comp-beam-01',
        name: '8m I-Beam',
        description: 'An 8-meter long standard structural I-beam component. Can be used as a column or rafter.',
        category: 'Beams',
        previewImageUrl: 'https://storage.googleapis.com/maker-suite-guides/steel-forge/beam.png',
        modelCode: beamModelCode,
      },
    ];
    
    return marketplaceComponents;
}

export async function getMarketplaceComponents(): Promise<MarketplaceComponent[]> {
  // In a real app, this would be a network request
  return Promise.resolve(getComponents());
};