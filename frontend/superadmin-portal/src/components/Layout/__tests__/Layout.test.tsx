
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../Layout';

describe('Layout', () => {
  it('should render the Sidebar and Navbar', () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <Layout>
          <div>Child Content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(getByTestId('sidebar')).toBeInTheDocument();
    expect(getByTestId('navbar')).toBeInTheDocument();
  });
});
