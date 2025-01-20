import express from 'express';
import { getCustomerDetails, createCustomer } from '../controllers/customerController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { customerValidator } from '../validators/userValidator.js';

const customerRouter = express.Router();

customerRouter.get('/', getCustomerDetails);   
customerRouter.post('/', validateRequest(customerValidator), createCustomer);     

export default customerRouter;
