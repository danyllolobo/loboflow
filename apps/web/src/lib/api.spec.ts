import { describe, it, expect } from 'vitest';
import { ApiError } from './api';

describe('ApiError class', () => {
  it('creates an ApiError with status, code and message', () => {
    const error = new ApiError(403, 'FORBIDDEN', 'Acesso negado');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Acesso negado');
    expect(error.name).toBe('ApiError');
  });
});
