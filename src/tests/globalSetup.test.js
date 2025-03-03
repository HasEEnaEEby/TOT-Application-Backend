import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

before(async function () {
  this.timeout(30000);
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log("✅ Connected to in-memory MongoDB server");
});

after(async function () {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log("✅ Disconnected from in-memory MongoDB server");
});

afterEach(async function () {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
