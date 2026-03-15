
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

describe('Sidebar', () => {
  it('should render all the links correctly', async () => {
    let getByText: any;
    await act(async () => {
      const { getByText: getByTextFromRrender } = render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );
      getByText = getByTextFromRrender;
    });

    expect(getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(getByText('My Children').closest('a')).toHaveAttribute('href', '/children');
    expect(getByText('Grades').closest('a')).toHaveAttribute('href', '/grades');
    expect(getByText('Profile').closest('a')).toHaveAttribute('href', '/profile');
    expect(getByText('Announcements').closest('a')).toHaveAttribute('href', '/announcements');
    expect(getByText('Timetable').closest('a')).toHaveAttribute('href', '/timetable');
    expect(getByText('Library').closest('a')).toHaveAttribute('href', '/library');
  });
});
