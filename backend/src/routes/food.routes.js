const express = require('express');
const router= express.Router()
const foodController = require('../controllers/food.controller');
const authMiddleware = require('../middlewares/auth.middleware');

//to read the video shared
const multer = require('multer');
const upload = multer({
    storage:multer.memoryStorage()
})

/* POST /api/food (protected) */
router.post('/',
    authMiddleware.authFoodPartnerMiddleware,
    upload.single("video") ,
    foodController.createFood)

/* POST /api/food (protected) */
router.get('/',
    authMiddleware.authUserMiddleware,
    foodController.getFoodItems)

router.get('/saved',
    authMiddleware.authUserMiddleware,
    foodController.getSavedFoodItems)

router.post('/:foodId/like',
    authMiddleware.authUserMiddleware,
    foodController.likeFood
)

router.post('/:foodId/save',
    authMiddleware.authUserMiddleware,
    foodController.saveFood
)

router.get('/:foodId/comments',
    authMiddleware.authUserMiddleware,
    foodController.getFoodComments
)

router.post('/:foodId/comments',
    authMiddleware.authUserMiddleware,
    foodController.addFoodComment
)

router.patch('/:foodId',
    authMiddleware.authFoodPartnerMiddleware,
    foodController.editCurrentFood
)

router.delete('/:foodId',
    authMiddleware.authFoodPartnerMiddleware,
    foodController.deleteCurrentFood
)

router.post('/:foodId/report',
    authMiddleware.authUserMiddleware,
    foodController.reportReel
)

router.post('/comments/:commentId/report',
    authMiddleware.authUserMiddleware,
    foodController.reportComment
)

module.exports= router