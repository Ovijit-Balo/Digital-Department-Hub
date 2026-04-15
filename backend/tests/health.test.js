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
  });
});
