import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Children from '../Children';
import { useGetMyChildrenQuery } from '../../services/familyApi';

jest.mock('../../services/familyApi');

const mockStore = configureStore([]);

test('renders children with data', async () => {
  const store = mockStore({});
  const mockData = [
    { id: '1', first_name: 'Child 1', last_name: 'Test', admission_number: '123', class_: { name: 'Class A' } },
    { id: '2', first_name: 'Child 2', last_name: 'Test', admission_number: '456', class_: { name: 'Class B' } },
  ];
  (useGetMyChildrenQuery as jest.Mock).mockReturnValue({
    data: mockData,
    isLoading: false,
  });

  await act(async () => {
    render(
      <Provider store={store}>
        <Children />
      </Provider>
    );
  });

  expect(screen.getByText('Child 1 Test')).toBeInTheDocument();
  expect(screen.getByText('Child 2 Test')).toBeInTheDocument();
});
