import { expect, mongoose } from './setup.mjs';

describe('Database Setup', () => {
  it('should connect to the database', () => {
    expect(mongoose.connection.readyState).to.equal(1);
  });
});