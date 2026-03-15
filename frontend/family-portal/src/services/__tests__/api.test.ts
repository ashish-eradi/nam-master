import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

jest.mock('@reduxjs/toolkit/query/react', () => {
  const original = jest.requireActual('@reduxjs/toolkit/query/react');
  return {
    ...original,
    fetchBaseQuery: jest.fn(),
  };
});

describe('api', () => {
  it('should add authorization header if token exists', () => {
    const testToken = 'test-jwt-token';
    const prepareHeaders = jest.fn((headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    });
    (fetchBaseQuery as jest.Mock).mockReturnValue({
      prepareHeaders,
    });
    const getState = () => ({
      auth: {
        token: testToken,
      },
    });
    const headers = new Headers();
    const preparedHeaders = prepareHeaders(headers, { getState });
    expect(preparedHeaders.get('authorization')).toBe(`Bearer ${testToken}`);
  });

  it('should not add authorization header if token does not exist', () => {
    const prepareHeaders = jest.fn((headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    });
    (fetchBaseQuery as jest.Mock).mockReturnValue({
      prepareHeaders,
    });
    const getState = () => ({
      auth: {
        token: null,
      },
    });
    const headers = new Headers();
    const preparedHeaders = prepareHeaders(headers, { getState });
    expect(preparedHeaders.has('authorization')).toBeFalsy();
  });
});