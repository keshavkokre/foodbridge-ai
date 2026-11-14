import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Server Health Preflight Test', () => {
  it('GET /api/health should return 200 with status ok and theme Harvest Signal', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.theme).toBe('Harvest Signal');
    expect(res.body.system).toBe('FoodBridge AI Core Engine');
  });
});

