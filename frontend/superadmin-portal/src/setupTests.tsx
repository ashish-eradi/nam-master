import '@testing-library/jest-dom';
import { vi } from 'vitest';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

vi.mock('@mui/x-data-grid', () => ({
  DataGrid: (props: any) => <div data-testid="mock-data-grid" {...props} />,
}));