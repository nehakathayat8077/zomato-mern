const foodModel = require('../models/food.model');
const foodPartnerModel = require('../models/foodpartner.model');
const storageService = require('../services/storage.service');
const {v4:uuid} = require('uuid');
const likeModel = require('../models/likes.model');
const saveModel = require('../models/save.model');
const commentModel = require('../models/comment.model');
const reportedContentModel = require('../models/reportedContent.model');
const mongoose = require('mongoose');

const videoExtensionsByMimeType = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov'
}

async function createFood(req,res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "video file is required"
            })
        }

        const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
        if (!name) {
            return res.status(400).json({
                message: "food name is required"
            })
        }

        if (!req.foodPartner) {
            return res.status(401).json({
                message: "login as a food partner"
            })
        }

        const fileExtension = videoExtensionsByMimeType[req.file.mimetype]
        if (!fileExtension) {
            return res.status(415).json({
                message: "upload an MP4, WebM, or MOV video"
            })
        }

        const fileUploadResult = await storageService.uploadFile(
            req.file.buffer,
            `${uuid()}${fileExtension}`
        )
        const tags = typeof req.body.tags === 'string'
            ? req.body.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag, index, list) => tag && list.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
                .slice(0, 12)
            : []

        const foodItem = await foodModel.create({
            name,
            description: typeof req.body.description === 'string'
                ? req.body.description.trim()
                : '',
            video: fileUploadResult.url,
            foodPartner: req.foodPartner._id,
            tags
        })

        res.status(201).json({
            message: "food created successfully",
            food: foodItem
        })
    } catch (error) {
        console.error('Unable to create food:', error)
        res.status(500).json({
            message: "Unable to upload the food. Please try again."
        })
    }
}

async function getFoodItems(req,res) {
    try {
        const foodItems = await foodModel.find({})
            .populate('foodPartner', 'fullName contactName address phone')
            .lean()

        const foodIds = foodItems.map((food) => food._id)
        const [likedFoods, savedFoods] = await Promise.all([
            likeModel.find({ user: req.user._id, food: { $in: foodIds } }).select('food').lean(),
            saveModel.find({ user: req.user._id, food: { $in: foodIds } }).select('food').lean()
        ])

        const likedIds = new Set(likedFoods.map((like) => like.food.toString()))
        const savedIds = new Set(savedFoods.map((save) => save.food.toString()))

        res.status(200).json({
            message: "food items fetched successfully",
            foodItems: foodItems.map((food) => ({
                ...food,
                likeCount: Math.max(0, food.likeCount || 0),
                saveCount: Math.max(0, food.saveCount || 0),
                commentCount: Math.max(0, food.commentCount || 0),
                isLiked: likedIds.has(food._id.toString()),
                isSaved: savedIds.has(food._id.toString())
            }))
        })
    } catch (error) {
        console.error('Unable to fetch food items:', error)
        res.status(500).json({
            message: "Unable to fetch food items"
        })
    }
}

async function likeFood(req,res) {
    try {
        const { foodId } = req.params
        if (!mongoose.Types.ObjectId.isValid(foodId)) {
            return res.status(400).json({ message: "Invalid food id" })
        }

        const food = await foodModel.findById(foodId)
        if (!food) {
            return res.status(404).json({ message: "Food not found" })
        }

        const existingLike = await likeModel.findOne({
            user: req.user._id,
            food: foodId
        })

        if (existingLike) {
            await likeModel.deleteOne({ _id: existingLike._id })
            food.likeCount = Math.max(0, (food.likeCount || 0) - 1)
            await food.save()
            return res.status(200).json({
                message: "food unliked successfully",
                isLiked: false,
                likeCount: food.likeCount
            })
        }

        await likeModel.create({
            user: req.user._id,
            food: foodId
        })
        food.likeCount = (food.likeCount || 0) + 1
        await food.save()
        res.status(200).json({
            message: "liked successfully",
            isLiked: true,
            likeCount: food.likeCount
        })
    } catch (error) {
        console.error('Unable to update food like:', error)
        res.status(500).json({ message: "Unable to update like" })
    }
}

async function saveFood(req,res) {
    try {
        const { foodId } = req.params
        if (!mongoose.Types.ObjectId.isValid(foodId)) {
            return res.status(400).json({ message: "Invalid food id" })
        }

        const food = await foodModel.findById(foodId)
        if (!food) {
            return res.status(404).json({ message: "Food not found" })
        }

        const existingSave = await saveModel.findOne({
            user: req.user._id,
            food: foodId
        })

        if (existingSave) {
            await saveModel.deleteOne({ _id: existingSave._id })
            food.saveCount = Math.max(0, (food.saveCount || 0) - 1)
            await food.save()
            return res.status(200).json({
                message: "food removed from saved items",
                isSaved: false,
                saveCount: food.saveCount
            })
        }

        await saveModel.create({
            user: req.user._id,
            food: foodId
        })
        food.saveCount = (food.saveCount || 0) + 1
        await food.save()
        res.status(200).json({
            message: "food saved successfully",
            isSaved: true,
            saveCount: food.saveCount
        })
    } catch (error) {
        console.error('Unable to update saved food:', error)
        res.status(500).json({ message: "Unable to save food" })
    }
}

async function getSavedFoodItems(req, res) {
    try {
        const savedItems = await saveModel.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .select('food')
            .lean()

        const foodIds = savedItems.map((item) => item.food)
        const foodItems = await foodModel.find({ _id: { $in: foodIds } })
            .populate('foodPartner', 'fullName contactName address phone')
            .lean()

        const likedFoods = await likeModel.find({
            user: req.user._id,
            food: { $in: foodIds }
        }).select('food').lean()
        const likedIds = new Set(likedFoods.map((like) => like.food.toString()))
        const savedIdSet = new Set(foodIds.map((id) => id.toString()))

        const foodById = new Map(foodItems.map((food) => [food._id.toString(), food]))
        const orderedItems = foodIds
            .map((id) => foodById.get(id.toString()))
            .filter(Boolean)
            .map((food) => ({
                ...food,
                likeCount: Math.max(0, food.likeCount || 0),
                saveCount: Math.max(0, food.saveCount || 0),
                commentCount: Math.max(0, food.commentCount || 0),
                isLiked: likedIds.has(food._id.toString()),
                isSaved: savedIdSet.has(food._id.toString())
            }))

        res.status(200).json({
            message: "saved food fetched successfully",
            foodItems: orderedItems
        })
    } catch (error) {
        console.error('Unable to fetch saved food:', error)
        res.status(500).json({ message: "Unable to fetch saved food" })
    }
}

async function getFoodComments(req, res) {
    try {
        const { foodId } = req.params
        if (!mongoose.Types.ObjectId.isValid(foodId)) {
            return res.status(400).json({ message: "Invalid food id" })
        }

        const flatComments = await commentModel.find({ food: foodId })
            .populate('user', 'fullName')
            .sort({ createdAt: -1 })
            .lean()

        const commentsById = new Map(flatComments.map((comment) => [
            comment._id.toString(),
            {
                ...comment,
                isOwn: comment.user?._id?.toString() === req.user._id.toString(),
                replies: []
            }
        ]))
        const comments = []
        commentsById.forEach((comment) => {
            const parentId = comment.parentComment?.toString()
            const parent = parentId ? commentsById.get(parentId) : null
            if (parent) {
                parent.replies.push(comment)
            } else {
                comments.push(comment)
            }
        })

        res.status(200).json({ comments })
    } catch (error) {
        console.error('Unable to fetch comments:', error)
        res.status(500).json({ message: "Unable to fetch comments" })
    }
}

async function addFoodComment(req, res) {
    try {
        const { foodId } = req.params
        const text = typeof req.body.text === 'string' ? req.body.text.trim() : ''

        if (!mongoose.Types.ObjectId.isValid(foodId)) {
            return res.status(400).json({ message: "Invalid food id" })
        }
        if (!text) {
            return res.status(400).json({ message: "Comment text is required" })
        }
        if (text.length > 500) {
            return res.status(400).json({ message: "Comment must be 500 characters or fewer" })
        }

        const food = await foodModel.findById(foodId)
        if (!food) {
            return res.status(404).json({ message: "Food not found" })
        }

        let parentComment = null
        if (req.body.parentCommentId) {
            if (!mongoose.Types.ObjectId.isValid(req.body.parentCommentId)) {
                return res.status(400).json({ message: "Invalid parent comment id" })
            }
            parentComment = await commentModel.findOne({
                _id: req.body.parentCommentId,
                food: foodId
            }).select('_id')
            if (!parentComment) {
                return res.status(404).json({ message: "Parent comment not found" })
            }
        }

        const comment = await commentModel.create({
            user: req.user._id,
            food: foodId,
            text,
            parentComment: parentComment?._id || null
        })
        const populatedComment = await commentModel.findById(comment._id)
            .populate('user', 'fullName')
            .lean()

        food.commentCount = (food.commentCount || 0) + 1
        await food.save()

        res.status(201).json({
            message: "comment posted successfully",
            comment: {
                ...populatedComment,
                isOwn: true,
                replies: []
            },
            commentCount: food.commentCount
        })
    } catch (error) {
        console.error('Unable to add comment:', error)
        res.status(500).json({ message: "Unable to post comment" })
    }
}

async function editCurrentFood(req,res) {
    try {
        const { foodId } = req.params

        if (!mongoose.Types.ObjectId.isValid(foodId)) {
            return res.status(400).json({ message: "Invalid food id" })
        }

        const food = await foodModel.findById(foodId)
        if (!food) {
            return res.status(404).json({ message: "Food reel not found" })
        }

        // Only the partner who created this reel can edit it.
        if (food.foodPartner.toString() !== req.foodPartner._id.toString()) {
            return res.status(403).json({ message: "You can only edit your own reels" })
        }

        if (typeof req.body.name === 'string') {
            const name = req.body.name.trim()
            if (!name) {
                return res.status(400).json({ message: "Food name is required" })
            }
            food.name = name
        }

        if (typeof req.body.description === 'string') {
            food.description = req.body.description.trim()
        }
        if (typeof req.body.tags === 'string') {
            food.tags = req.body.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag, index, list) => tag && list.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
                .slice(0, 12)
        }

        await food.save()
        res.status(200).json({
            message: "Food reel updated successfully",
            food
        })
    } catch (error) {
        console.error('Unable to edit food reel:', error)
        res.status(500).json({ message: "Unable to edit food reel" })
    }
}

async function deleteCurrentFood(req,res) {
    try {
        const { foodId } = req.params

        if (!mongoose.Types.ObjectId.isValid(foodId)) {
            return res.status(400).json({ message: "Invalid food id" })
        }

        const food = await foodModel.findById(foodId)
        if (!food) {
            return res.status(404).json({ message: "Food reel not found" })
        }

        // Only the partner who created this reel can delete it.
        if (food.foodPartner.toString() !== req.foodPartner._id.toString()) {
            return res.status(403).json({ message: "You can only delete your own reels" })
        }

        await Promise.all([
            likeModel.deleteMany({ food: foodId }),
            saveModel.deleteMany({ food: foodId }),
            commentModel.deleteMany({ food: foodId }),
            foodModel.deleteOne({ _id: foodId })
        ])

        res.status(200).json({
            message: "Food reel deleted successfully",
            foodId
        })
    } catch (error) {
        console.error('Unable to delete food reel:', error)
        res.status(500).json({ message: "Unable to delete food reel" })
    }
}

async function reportReel(req, res) {
    try {
        const { foodId } = req.params
        const { reason, details = '' } = req.body

        if (!mongoose.Types.ObjectId.isValid(foodId)) {
            return res.status(400).json({ message: "Invalid food id" })
        }

        const allowedReasons = ['spam', 'inappropriate', 'false_information', 'harassment', 'other']
        if (!allowedReasons.includes(reason)) {
            return res.status(400).json({ message: "Choose a valid report reason" })
        }

        const reelExists = await foodModel.exists({ _id: foodId })
        if (!reelExists) {
            return res.status(404).json({ message: "Reel not found" })
        }

        await reportedContentModel.findOneAndUpdate(
            { reporter: req.user._id, contentType: 'reel', reel: foodId },
            { $set: { reason, details: details.trim(), status: 'open' } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )

        res.status(201).json({ message: "Reel reported successfully" })
    } catch (error) {
        console.error('Unable to report reel:', error)
        res.status(500).json({ message: "Unable to report reel" })
    }
}

async function reportComment(req, res) {
    try {
        const { commentId } = req.params
        const { reason, details = '' } = req.body

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ message: "Invalid comment id" })
        }

        const allowedReasons = ['spam', 'inappropriate', 'false_information', 'harassment', 'other']
        if (!allowedReasons.includes(reason)) {
            return res.status(400).json({ message: "Choose a valid report reason" })
        }

        const comment = await commentModel.findById(commentId).select('food user')
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" })
        }
        if (comment.user?.toString() === req.user._id.toString()) {
            return res.status(403).json({ message: "You cannot report your own comment" })
        }

        await reportedContentModel.findOneAndUpdate(
            { reporter: req.user._id, contentType: 'comment', comment: commentId },
            {
                $set: {
                    reel: comment.food,
                    reason,
                    details: details.trim(),
                    status: 'open'
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )

        res.status(201).json({ message: "Comment reported successfully" })
    } catch (error) {
        console.error('Unable to report comment:', error)
        res.status(500).json({ message: "Unable to report comment" })
    }
}

module.exports= {
    createFood,
    getFoodItems,
    likeFood,
    saveFood,
    getSavedFoodItems,
    getFoodComments,
    addFoodComment,
    editCurrentFood,
    deleteCurrentFood,
    reportReel,
    reportComment
}