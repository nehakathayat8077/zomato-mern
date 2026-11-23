const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router()

//user auth apis
router.post('/user/register',authController.registerUser)
router.post('/user/login',authController.loginUser)
router.get('/user/logout',authController.logoutUser)
router.get('/user/me', authMiddleware.authUserMiddleware, authController.getCurrentUser)
router.patch('/user/me', authMiddleware.authUserMiddleware, upload.single('profileImage'), authController.updateCurrentUser)


//foodpartner auth apis
router.post('/food-partner/register',authController.registerFoodPartner)
router.post('/food-partner/login',authController.loginFoodPartner)
router.get('/food-partner/logout',authController.logoutFoodPartner)
module.exports= router