
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../Layout';

describe('Layout', () => {
  it('should render the layout with the sidebar and navbar', async () => {
    let container: any;
    await act(async () => {
      const { container: containerFromRender } = render(
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      );
      container = containerFromRender;
    });

    expect(container.querySelector('.ant-layout-sider')).toBeInTheDocument();
    expect(container.querySelector('.ant-layout-header')).toBeInTheDocument();
  });
});
