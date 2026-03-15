import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Grades from '../Grades';
import { useGetMyGradesQuery } from '../../services/familyApi';

jest.mock('../../services/familyApi');

const mockStore = configureStore([]);

test('renders grades with data', async () => {
  const store = mockStore({});
  const mockData = [
    {
      id: 1,
      subject: { name: 'Math' },
      assessment: { name: 'Midterm' },
      score_achieved: 90,
      grade_letter: 'A',
    },
  ];
  (useGetMyGradesQuery as jest.Mock).mockReturnValue({
    data: mockData,
    isLoading: false,
  });

  await act(async () => {
    render(
      <Provider store={store}>
        <Grades />
      </Provider>
    );
  });

  expect(screen.getByText('Math')).toBeInTheDocument();
  expect(screen.getByText('Midterm')).toBeInTheDocument();
  expect(screen.getByText('90')).toBeInTheDocument();
  expect(screen.getByText('A')).toBeInTheDocument();
});
