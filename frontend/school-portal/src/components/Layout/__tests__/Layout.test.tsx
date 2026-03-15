
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '../Layout';

describe('AppLayout', () => {
  it('should render the Sidebar and Navbar', () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    expect(getByTestId('sidebar')).toBeInTheDocument();
    expect(getByTestId('navbar')).toBeInTheDocument();
  });
});
