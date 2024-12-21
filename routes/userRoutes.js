const express = require('express');
const userController = require('../controller/UserController'); 

const router = express.Router();

router.get('/users', userController.getAllUsers); 
router.post('/users', userController.createUser); 
router.get('/users/:id', userController.getUserById); 
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser); 
router.post('/login', userController.loginUser); 

module.exports = router;
