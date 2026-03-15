
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

describe('Sidebar', () => {
  it('should render all the links correctly', () => {
    const { getByText } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(getByText('Schools').closest('a')).toHaveAttribute('href', '/schools');
    expect(getByText('Users').closest('a')).toHaveAttribute('href', '/users');
    expect(getByText('Reports').closest('a')).toHaveAttribute('href', '/reports');
    expect(getByText('Library').closest('a')).toHaveAttribute('href', '/library');
    expect(getByText('Transport').closest('a')).toHaveAttribute('href', '/transport');
    expect(getByText('Hostel').closest('a')).toHaveAttribute('href', '/hostel');
  });
});
