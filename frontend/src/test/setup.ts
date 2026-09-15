import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Polyfill ResizeObserver for React Flow
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill window.matchMedia if needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock @xyflow/react for JSDOM compatibility
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-react-flow' }, children),
  Background: () => React.createElement('div', { 'data-testid': 'mock-rf-background' }),
  Controls: () => React.createElement('div', { 'data-testid': 'mock-rf-controls' }),
  MiniMap: () => React.createElement('div', { 'data-testid': 'mock-rf-minimap' }),
  Handle: () => React.createElement('div', { 'data-testid': 'mock-rf-handle' }),
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  MarkerType: { ArrowClosed: 'arrowclosed' }
}));
