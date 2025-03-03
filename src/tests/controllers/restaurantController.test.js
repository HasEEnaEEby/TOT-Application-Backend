// import { expect } from 'chai';
// import chaiHttp from 'chai-http';
// import mongoose from 'mongoose';
// import sinon from 'sinon';

// // Import models and controller
// import { customerTableController } from '../../controllers/customerTableController.js';
// import Order from '../../models/Order.js';
// import Table from '../../models/Table.js';
// import { qrCodeUtils } from '../../utils/qrCodeUtils.js';

// chai.use(chaiHttp);

// describe('Customer Table Controller', function() {
//   let sandbox;
//   let mockUser;
//   let mockRestaurantId;
//   let mockTable;

//   beforeEach(function() {
//     // Create a fresh sandbox for each test
//     sandbox = sinon.createSandbox();

//     // Mock user and restaurant data
//     mockRestaurantId = new mongoose.Types.ObjectId();
//     mockUser = {
//       _id: new mongoose.Types.ObjectId(),
//       role: 'customer'
//     };

//     // Mock table data
//     mockTable = {
//       _id: new mongoose.Types.ObjectId(),
//       number: 1,
//       capacity: 4,
//       restaurant: mockRestaurantId,
//       status: 'available',
//       position: 'Main Floor',
//       currentOrder: null,
//       lastUpdated: new Date(),
//       createdAt: new Date(),
//       updatedAt: new Date(),
//       validateQRCode: sandbox.stub().returns(true)
//     };
//   });

//   afterEach(function() {
//     // Restore all stubs
//     sandbox.restore();
//   });

//   describe('getRestaurantTables', function() {
//     it('should retrieve all tables for a restaurant', async function() {
//       // Arrange
//       const req = {
//         params: { restaurantId: mockRestaurantId.toString() }
//       };
//       const res = {
//         status: sandbox.stub().returnsThis(),
//         json: sandbox.stub()
//       };

//       // Stub Table.find to return mock tables
//       sandbox.stub(Table, 'find').resolves([mockTable]);

//       // Act
//       await customerTableController.getRestaurantTables(req, res);

//       // Assert
//       expect(res.status).to.have.been.calledWith(200);
//       expect(res.json).to.have.been.calledOnce;
      
//       const responseData = res.json.firstCall.args[0];
//       expect(responseData.status).to.equal('success');
//       expect(responseData.data.tables).to.be.an('array');
//       expect(responseData.data.tables[0].id).to.equal(mockTable._id.toString());
//     });

//     it('should throw an error if restaurant ID is missing', async function() {
//       // Arrange
//       const req = { params: {} };
//       const res = {
//         status: sandbox.stub().returnsThis(),
//         json: sandbox.stub()
//       };
//       const next = sandbox.stub();

//       // Act & Assert
//       try {
//         await customerTableController.getRestaurantTables(req, res, next);
//         expect.fail('Should have thrown an error');
//       } catch (error) {
//         expect(error.message).to.include('Restaurant ID is required');
//         expect(error.statusCode).to.equal(400);
//       }
//     });
//   });

//   describe('getAvailableTables', function() {
//     it('should retrieve only available tables', async function() {
//       // Arrange
//       const req = {
//         params: { restaurantId: mockRestaurantId.toString() }
//       };
//       const res = {
//         status: sandbox.stub().returnsThis(),
//         json: sandbox.stub()
//       };

//       // Stub Table.find to return mock available table
//       sandbox.stub(Table, 'find').resolves([mockTable]);

//       // Act
//       await customerTableController.getAvailableTables(req, res);

//       // Assert
//       expect(res.status).to.have.been.calledWith(200);
//       expect(res.json).to.have.been.calledOnce;
      
//       const responseData = res.json.firstCall.args[0];
//       expect(responseData.status).to.equal('success');
//       expect(responseData.results).to.equal(1);
//       expect(responseData.data.tables[0].status).to.equal('available');
//     });
//   });

//   describe('getTableById', function() {
//     it('should retrieve a specific table by ID', async function() {
//       // Arrange
//       const req = {
//         params: { tableId: mockTable._id.toString() }
//       };
//       const res = {
//         status: sandbox.stub().returnsThis(),
//         json: sandbox.stub()
//       };

//       // Stub Table.findById to return mock table
//       sandbox.stub(Table, 'findById').resolves(mockTable);

//       // Act
//       await customerTableController.getTableById(req, res);

//       // Assert
//       expect(res.status).to.have.been.calledWith(200);
//       expect(res.json).to.have.been.calledOnce;
      
//       const responseData = res.json.firstCall.args[0];
//       expect(responseData.status).to.equal('success');
//       expect(responseData.data.table.id).to.equal(mockTable._id.toString());
//     });

//     it('should throw an error for non-existent table', async function() {
//       // Arrange
//       const req = {
//         params: { tableId: new mongoose.Types.ObjectId().toString() }
//       };
//       const res = {
//         status: sandbox.stub().returnsThis(),
//         json: sandbox.stub()
//       };

//       // Stub Table.findById to return null
//       sandbox.stub(Table, 'findById').resolves(null);

//       // Act & Assert
//       try {
//         await customerTableController.getTableById(req, res);
//         expect.fail('Should have thrown an error');
//       } catch (error) {
//         expect(error.message).to.include('Table not found');
//         expect(error.statusCode).to.equal(404);
//       }
//     });
//   });

//   describe('validateTableQR', function() {
//     it('should validate a valid QR code', async function() {
//       // Arrange
//       const mockQRData = {
//         r: mockRestaurantId.toString(),
//         t: mockTable._id.toString(),
//         v: 'valid-token'
//       };
//       const req = {
//         body: { qrData: mockQRData }
//       };
//       const res = {
//         status: sandbox.stub().returnsThis(),
//         json: sandbox.stub()
//       };

//       // Stub Table.findById to return mock table
//       sandbox.stub(Table, 'findById').resolves(mockTable);

//       // Stub QR code validation
//       sandbox.stub(qrCodeUtils, 'validateQRCodeData').returns(true);

//       // Act
//       await customerTableController.validateTableQR(req, res);

//       // Assert
//       expect(res.status).to.have.been.calledWith(200);
//       expect(res.json).to.have.been.calledOnce;
      
//       const responseData = res.json.firstCall.args[0];
//       expect(responseData.status).to.equal('success');
//       expect(responseData.data.validated).to.be.true;
//       expect(responseData.data.table.id).to.equal(mockTable._id.toString());
//     });

//     it('should throw an error for invalid QR code', async function() {
//       // Arrange
//       const req = {
//         body: { qrData: 'invalid-qr-data' }
//       };
//       const res = {
//         status: sandbox.stub().returnsThis(),
//         json: sandbox.stub()
//       };

//       // Act & Assert
//       try {
//         await customerTableController.validateTableQR(req, res);
//         expect.fail('Should have thrown an error');
//       } catch (error) {
//         expect(error.message).to.include('Invalid QR code format');
//         expect(error.statusCode).to.equal(400);
//       }
//     });
//   });

//   describe('requestTable', function() {
//     it('should request an available table', async function() {
//       // Arrange
//       const req = {
//         params: { tableId: mockTable._id.toString() },
//         body: { sessionToken: 'valid-token' },
//         user: mockUser
//       };
//       const res = {
//         status: sandbox.stub().returnsThis(),
//         json: sandbox.stub()
//       };

//       // Stub Table.findById to return mock table
//       const findByIdStub = sandbox.stub(Table, 'findById').resolves(mockTable);

//       // Stub Order.create
//       const createOrderStub = sandbox.stub(Order, 'create').resolves({
//         _id: new mongoose.Types.ObjectId(),
//         customer: mockUser._id,
//         restaurant: mockRestaurantId,
//         table: mockTable._id,
//         status: 'active',
//         items: []
//       });

//       // Act
//       await customerTableController.requestTable(req, res);

//       // Assert
//       expect(findByIdStub).to.have.been.calledWith(mockTable._id.toString());
//       expect(createOrderStub).to.have.been.calledOnce;
//       expect(res.status).to.have.been.calledWith(200);
//       expect(res.json).to.have.been.calledOnce;
      
//       const responseData = res.json.firstCall.args[0];
//       expect(responseData.status).to.equal('success');
//       expect(responseData.data.table.status).to.equal('occupied');
//       expect(responseData.data.orderId).to.exist;
//     });

//     it('should throw an error for unavailable table', async function() {
//       // Arrange
//       const unavailableTable = { ...mockTable, status: 'occupied' };
//       const req = {
//         params: { tableId: unavailableTable._id.toString() },
//         body: { sessionToken: 'valid-token' },
//         user: mockUser
//       };
//       const res = {
//         status: sandbox.stub().returnsThis(),
//         json: sandbox.stub()
//       };

//       // Stub Table.findById to return unavailable table
//       sandbox.stub(Table, 'findById').resolves(unavailableTable);

//       // Act & Assert
//       try {
//         await customerTableController.requestTable(req, res);
//         expect.fail('Should have thrown an error');
//       } catch (error) {
//         expect(error.message).to.include('This table is occupied');
//         expect(error.statusCode).to.equal(400);
//       }
//     });
//   });
// });