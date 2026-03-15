
import { render, screen } from '@testing-library/react';
import Navbar from '../Navbar';

describe('Navbar', () => {
  it('should render the title', () => {
    const { getByText } = render(<Navbar />);
    expect(getByText('SuperAdmin Portal')).toBeInTheDocument();
  });

  it('should have a navbar with the correct data-testid', () => {
    render(<Navbar />);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });
});
