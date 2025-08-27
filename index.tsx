
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Dynamically import libraries sequentially to ensure correct instantiation and avoid race conditions.
// This is a robust way to prevent the "Multiple instances of Three.js" warning.
import('three')
    .then(THREE => {
        // Make the core THREE library available globally first.
        (window as any).THREE = THREE;

        // Once Three.js is loaded, load the libraries that depend on it.
        return Promise.all([
            import('@react-three/fiber'),
            import('@react-three/drei'),
        ]);
    })
    .then(([ReactThreeFiber, ReactThreeDrei]) => {
        // Make all libraries available globally for components to use.
        (window as any).React = React; // React is already global but this ensures consistency.
        (window as any).ReactThreeFiber = ReactThreeFiber;
        (window as any).ReactThreeDrei = ReactThreeDrei;

        const rootElement = document.getElementById('root');
        if (!rootElement) {
            throw new Error("Could not find root element to mount to");
        }

        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    })
    .catch(error => {
        console.error("Failed to load 3D library modules:", error);
        const rootElement = document.getElementById('root');
        if (rootElement) {
            rootElement.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Error: Failed to load core 3D libraries. The application cannot start. Please check the browser console.</div>';
        }
    });
