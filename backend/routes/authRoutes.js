const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail);
router.get('/users', authController.getUsers);
router.get('/users/:login/public', authController.getPublicUserProfile);

module.exports = router;
