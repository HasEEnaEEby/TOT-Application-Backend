import * as chai from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import mongoose from 'mongoose'; 

// Configure chai
chai.use(chaiHttp);
chai.use(sinonChai);

// ✅ Export properly
export { chai, sinon, mongoose };
export const expect = chai.expect;
