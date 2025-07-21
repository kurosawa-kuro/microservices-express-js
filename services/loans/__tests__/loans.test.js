const request = require('supertest');
const app = require('../src/app');

describe('Loans Service API', () => {
  describe('Health Check', () => {
    test('GET /actuator/health should return UP status', async () => {
      const response = await request(app)
        .get('/actuator/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'UP',
        timestamp: expect.any(String),
        service: 'loans-service'
      });
    });
  });

  describe('Build Info', () => {
    test('GET /api/build-info should return build information', async () => {
      const response = await request(app)
        .get('/api/build-info')
        .expect(200);

      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Contact Info', () => {
    test('GET /api/contact-info should return contact information', async () => {
      const response = await request(app)
        .get('/api/contact-info')
        .expect(200);

      expect(response.body).toHaveProperty('name');
    });
  });

  describe('Loan Management', () => {
    test('POST /api/create should create a new loan', async () => {
      const newLoan = {
        mobileNumber: '1234567890',
        loanType: 'Home Loan',
        totalLoan: 100000,
        amountPaid: 0,
        outstandingAmount: 100000
      };

      const response = await request(app)
        .post('/api/create')
        .send(newLoan)
        .expect(201);

      expect(response.body).toHaveProperty('statusCode', '201');
      expect(response.body).toHaveProperty('statusMsg');
    });

    test('GET /api/fetch should return 400 for missing mobile number', async () => {
      const response = await request(app)
        .get('/api/fetch')
        .expect(400);

      expect(response.body).toHaveProperty('errorCode', 'VALIDATION_ERROR');
    });

    test('GET /api/fetch should return loan details for valid mobile number', async () => {
      const newLoan = {
        mobileNumber: '1234567890',
        loanType: 'Home Loan',
        totalLoan: 100000,
        amountPaid: 0,
        outstandingAmount: 100000
      };

      await request(app)
        .post('/api/create')
        .send(newLoan)
        .expect(201);

      const response = await request(app)
        .get('/api/fetch?mobileNumber=1234567890')
        .expect(200);

      expect(response.body).toHaveProperty('mobileNumber', '1234567890');
      expect(response.body).toHaveProperty('loanType', 'Home Loan');
      expect(response.body).toHaveProperty('totalLoan', 100000);
    });
  });
});
