const express = require('express');
const foodPartnerController = require('../controllers/food-partner.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router()

router.get('/me',
    authMiddleware.authFoodPartnerMiddleware,
    foodPartnerController.getCurrentFoodPartner)

router.patch('/me',
    authMiddleware.authFoodPartnerMiddleware,
    upload.single('profileImage'),
    foodPartnerController.updateCurrentFoodPartner)

router.get('/cities',
    authMiddleware.authUserMiddleware,
    foodPartnerController.getPartnerCities)

router.get('/discover',
    authMiddleware.authUserMiddleware,
    foodPartnerController.discoverPartners)

router.post('/:id/follow',
    authMiddleware.authUserMiddleware,
    foodPartnerController.toggleFollow)

/* GET /api/food-partner/:id */
router.get('/:id',
    authMiddleware.authUserMiddleware,
    foodPartnerController.getFoodPartnerById)

module.exports= router