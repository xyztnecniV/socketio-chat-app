const request = require('supertest');
const server = require('../server');

describe('GET /health', function () {
  let s;

  before(function (done) {
    s = server.listen(0, done);
  });

  after(function (done) {
    s.close(done);
  });

  it('responds with status ok', function (done) {
    request(s)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect((res) => {
        if (!res.body || res.body.status !== 'ok') throw new Error('Invalid body');
      })
      .end(done);
  });
});