
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
    expect(getByText('Students').closest('a')).toHaveAttribute('href', '/students');
    expect(getByText('Subjects').closest('a')).toHaveAttribute('href', '/subjects');
    expect(getByText('Classes').closest('a')).toHaveAttribute('href', '/classes');
    expect(getByText('Attendance').closest('a')).toHaveAttribute('href', '/attendance');
    expect(getByText('Grades').closest('a')).toHaveAttribute('href', '/grades');
    expect(getByText('Finance').closest('a')).toHaveAttribute('href', '/finance');
    expect(getByText('Library').closest('a')).toHaveAttribute('href', '/library');
    expect(getByText('Transport').closest('a')).toHaveAttribute('href', '/transport');
    expect(getByText('Exams').closest('a')).toHaveAttribute('href', '/exams');
    expect(getByText('Announcements').closest('a')).toHaveAttribute('href', '/announcements');
    expect(getByText('Timetable').closest('a')).toHaveAttribute('href', '/timetable');
    expect(getByText('Reports').closest('a')).toHaveAttribute('href', '/reports');
    expect(getByText('Hostel').closest('a')).toHaveAttribute('href', '/hostel');
  });
});
