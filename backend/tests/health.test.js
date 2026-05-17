const request = require('supertest');
const app = require('../src/app');

describe('Health endpoint', () => {
  it('returns service health details', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'digital-department-hub-api'
      })
    );
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('returns the same health payload on the api health route', async () => {
    const response = await request(app).get('/api/health');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'digital-department-hub-api'
      })
    );
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('returns a structured 404 for unknown routes', async () => {
    const response = await request(app).get('/api/v1/definitely-not-a-route');

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'Route not found',
        path: '/api/v1/definitely-not-a-route'
      })
    );
    expect(response.body.requestId).toBeDefined();
  });
});
