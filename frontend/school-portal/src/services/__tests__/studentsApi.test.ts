
import { configureStore } from '@reduxjs/toolkit';
import { studentsApi, Student } from '../studentsApi';
import authSlice from '../../store/authSlice';

const store = configureStore({
  reducer: {
    [studentsApi.reducerPath]: studentsApi.reducer,
    auth: authSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(studentsApi.middleware),
});

describe('studentsApi', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  const getCallArgs = (call: any) => {
    if (call[0] instanceof Request) {
      return { url: call[0].url, method: call[0].method, body: call[0].body };
    } else {
      return { url: call[0], method: call[1]?.method, body: call[1]?.body };
    }
  };

  describe('getStudents', () => {
    it('should make a GET request to /api/v1/students and return a list of students', async () => {
      const students: Student[] = [{ id: '1', first_name: 'John', last_name: 'Doe', admission_number: '123', class_: { name: 'class 1' } }];
      fetchMock.mockResponseOnce(JSON.stringify(students));

      const { data } = await store.dispatch(studentsApi.endpoints.getStudents.initiate());
      const { url } = getCallArgs(fetchMock.mock.calls[0]);

      expect(url).toEqual('/api/v1/students');
      expect(data).toEqual(students);
    });
  });

  describe('getStudentsByClassId', () => {
    it('should make a GET request to /api/v1/students?class_id=CLASS_ID and return a list of students', async () => {
      const students: Student[] = [{ id: '1', first_name: 'John', last_name: 'Doe', admission_number: '123', class_: { name: 'class 1' } }];
      fetchMock.mockResponseOnce(JSON.stringify(students));

      const { data } = await store.dispatch(studentsApi.endpoints.getStudentsByClassId.initiate('CLASS_ID'));
      const { url } = getCallArgs(fetchMock.mock.calls[0]);

      expect(url).toEqual('/api/v1/students?class_id=CLASS_ID');
      expect(data).toEqual(students);
    });
  });

  describe('createStudent', () => {
    it('should make a POST request to /api/v1/students and return the created student', async () => {
      const student: Partial<Student> = { first_name: 'John', last_name: 'Doe' };
      const createdStudent: Student = { id: '1', ...student, admission_number: '123', class_: { name: 'class 1' } } as Student;
      fetchMock.mockResponseOnce(JSON.stringify(createdStudent));

      const { data } = await store.dispatch(studentsApi.endpoints.createStudent.initiate(student));
      const { url, method, body } = getCallArgs(fetchMock.mock.calls[0]);

      expect(url).toEqual('/api/v1/students');
      expect(method).toEqual('POST');
      expect(body.toString()).toEqual(JSON.stringify(student));
      expect(data).toEqual(createdStudent);
    });
  });

  describe('updateStudent', () => {
    it('should make a PUT request to /api/v1/students/1 and return the updated student', async () => {
      const student: Partial<Student> = { first_name: 'John', last_name: 'Doe' };
      const updatedStudent: Student = { id: '1', ...student, admission_number: '123', class_: { name: 'class 1' } } as Student;
      fetchMock.mockResponseOnce(JSON.stringify(updatedStudent));

      const { data } = await store.dispatch(studentsApi.endpoints.updateStudent.initiate({ id: '1', body: student }));
      const { url, method, body } = getCallArgs(fetchMock.mock.calls[0]);

      expect(url).toEqual('/api/v1/students/1');
      expect(method).toEqual('PUT');
      expect(body.toString()).toEqual(JSON.stringify(student));
      expect(data).toEqual(updatedStudent);
    });
  });

  describe('bulkImportStudents', () => {
    it('should make a POST request to /api/v1/students/bulk-import', async () => {
      const formData = new FormData();
      fetchMock.mockResponseOnce(JSON.stringify({}));

      await store.dispatch(studentsApi.endpoints.bulkImportStudents.initiate(formData));
      const { url, method, body } = getCallArgs(fetchMock.mock.calls[0]);

      expect(url).toEqual('/api/v1/students/bulk-import');
      expect(method).toEqual('POST');
      // When FormData is sent, fetchMock receives it as a Buffer.
      // We can check if it's a Buffer and that it's not empty.
      expect(body instanceof Buffer).toBeTruthy();
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe('exportStudents', () => {
    it('should make a GET request to /api/v1/students/export', async () => {
      fetchMock.mockResponseOnce(JSON.stringify('csv data'));

      const { data } = await store.dispatch(studentsApi.endpoints.exportStudents.initiate());
      const { url } = getCallArgs(fetchMock.mock.calls[0]);

      expect(url).toEqual('/api/v1/students/export');
      expect(data).toEqual('csv data');
    });
  });
});
