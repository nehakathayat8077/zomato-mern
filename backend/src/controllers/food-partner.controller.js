const foodPartnerModel = require('../models/foodpartner.model');
const foodModel = require('../models/food.model');
const mongoose = require('mongoose');
const storageService = require('../services/storage.service');
const {v4: uuid} = require('uuid');
const followModel = require('../models/follow.model');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getFoodSearchFilter = (search) => {
    const terms = search
        .split(/[\s,]+/)
        .map((term) => term.trim())
        .filter(Boolean)

    if (terms.length === 0) return {}

    const patterns = terms.map((term) => new RegExp(escapeRegex(term), 'i'))
    if (patterns.length === 1) {
        return {
            $or: [
                { name: patterns[0] },
                { tags: { $elemMatch: { $regex: patterns[0] } } }
            ]
        }
    }

    return {
        $and: patterns.map((pattern) => ({
            $or: [
                { name: pattern },
                { tags: { $elemMatch: { $regex: pattern } } }
            ]
        }))
    }
}

async function getFoodPartnerById(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: "Invalid food partner id"
            })
        }

        const partner = await foodPartnerModel.findById(req.params.id)
            .select('fullName contactName address phone profileImage rating ratingCount openingTime closingTime city foodType categories')

        if (!partner) {
            return res.status(404).json({
                message: "Food partner not found"
            })
        }

        const reels = await foodModel.find({ foodPartner: partner._id })
            .sort({ _id: -1 })
        const followerCount = await followModel.countDocuments({ foodPartner: partner._id })
        const isFollowing = req.user
            ? await followModel.exists({ user: req.user._id, foodPartner: partner._id })
            : null

        res.status(200).json({
            partner,
            reels,
            followerCount,
            isFollowing: Boolean(isFollowing)
        })
    } catch (error) {
        console.error('Unable to load food partner profile:', error)
        res.status(500).json({
            message: "Unable to load food partner profile"
        })
    }
}

async function getCurrentFoodPartner(req, res) {
    try {
        const partner = await foodPartnerModel.findById(req.foodPartner._id)
            .select('fullName contactName address phone profileImage rating ratingCount openingTime closingTime city foodType categories')

        if (!partner) {
            return res.status(404).json({ message: "Food partner not found" })
        }

        const reels = await foodModel.find({ foodPartner: partner._id })
            .sort({ _id: -1 })

        res.status(200).json({ partner, reels })
    } catch (error) {
        console.error('Unable to load partner dashboard:', error)
        res.status(500).json({ message: "Unable to load partner dashboard" })
    }
}

async function updateCurrentFoodPartner(req, res) {
    try {
        const partner = await foodPartnerModel.findById(req.foodPartner._id)
        if (!partner) {
            return res.status(404).json({ message: "Food partner not found" })
        }

        if (typeof req.body.fullName === 'string') {
            partner.fullName = req.body.fullName.trim()
        }
        if (typeof req.body.contactName === 'string') {
            partner.contactName = req.body.contactName.trim()
        }
        if (typeof req.body.address === 'string') {
            partner.address = req.body.address.trim()
        }
        if (typeof req.body.phone === 'string') {
            partner.phone = req.body.phone.trim()
        }
        if (typeof req.body.city === 'string') {
            partner.city = req.body.city.trim()
        }
        if (['veg', 'non-veg', 'both'].includes(req.body.foodType)) {
            partner.foodType = req.body.foodType
        }
        if (Array.isArray(req.body.categories)) {
            partner.categories = req.body.categories
        } else if (typeof req.body.categories === 'string') {
            partner.categories = req.body.categories
                .split(',')
                .map((category) => category.trim())
                .filter(Boolean)
        }
        if (typeof req.body.openingTime === 'string') {
            partner.openingTime = req.body.openingTime
        }
        if (typeof req.body.closingTime === 'string') {
            partner.closingTime = req.body.closingTime
        }
        if (typeof req.body.rating !== 'undefined') {
            const rating = Number(req.body.rating)
            if (Number.isFinite(rating) && rating >= 0 && rating <= 5) {
                partner.rating = Math.round(rating * 10) / 10
            }
        }

        if (req.file) {
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(415).json({ message: "Upload a valid profile image" })
            }
            const extension = req.file.mimetype === 'image/png'
                ? '.png'
                : req.file.mimetype === 'image/webp'
                    ? '.webp'
                    : '.jpg'
            const upload = await storageService.uploadFile(
                req.file.buffer,
                `partner-${partner._id}-${uuid()}${extension}`
            )
            partner.profileImage = upload.url
        }

        await partner.save()
        const updatedPartner = await foodPartnerModel.findById(partner._id)
            .select('fullName contactName address phone profileImage rating ratingCount openingTime closingTime city foodType categories')

        res.status(200).json({
            message: "Profile updated successfully",
            partner: updatedPartner
        })
    } catch (error) {
        console.error('Unable to update partner profile:', error)
        res.status(500).json({ message: "Unable to update profile" })
    }
}

async function toggleFollow(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid food partner id" })
        }

        const partner = await foodPartnerModel.findById(req.params.id)
        if (!partner) {
            return res.status(404).json({ message: "Food partner not found" })
        }

        const existingFollow = await followModel.findOne({
            user: req.user._id,
            foodPartner: partner._id
        })

        if (existingFollow) {
            await followModel.deleteOne({ _id: existingFollow._id })
        } else {
            await followModel.create({
                user: req.user._id,
                foodPartner: partner._id
            })
        }

        const followerCount = await followModel.countDocuments({ foodPartner: partner._id })
        res.status(200).json({
            isFollowing: !existingFollow,
            followerCount
        })
    } catch (error) {
        console.error('Unable to update follow:', error)
        res.status(500).json({ message: "Unable to update follow" })
    }
}

async function getPartnerCities(req, res) {
    try {
        const cities = await foodPartnerModel.distinct('city', {
            city: { $nin: ['', null] }
        })
        res.status(200).json({
            cities: cities
                .filter(Boolean)
                .map((city) => city.trim())
                .filter((city, index, list) => list.findIndex((item) => item.toLowerCase() === city.toLowerCase()) === index)
                .sort((first, second) => first.localeCompare(second))
        })
    } catch (error) {
        console.error('Unable to load cities:', error)
        res.status(500).json({ message: "Unable to load cities" })
    }
}

async function discoverPartners(req, res) {
    try {
        const { city, foodType, category, search } = req.query
        const filter = {}
        const partnerConditions = []
        const foodMatchConditions = []

        if (city) filter.city = { $regex: `^${escapeRegex(city)}$`, $options: 'i' }
        if (foodType === 'veg') filter.foodType = { $in: ['veg', 'both'] }
        if (foodType === 'non-veg') filter.foodType = { $in: ['non-veg', 'both'] }

        if (category) {
            const categoryRegex = new RegExp(escapeRegex(category), 'i')
            foodMatchConditions.push({
                $or: [
                    { name: categoryRegex },
                    { tags: { $elemMatch: { $regex: categoryRegex } } }
                ]
            })
        }

        if (search) foodMatchConditions.push(getFoodSearchFilter(search))

        let matchingFoodPartnerIds = []
        if (foodMatchConditions.length > 0) {
            const foodFilter = foodMatchConditions.length === 1
                ? foodMatchConditions[0]
                : { $and: foodMatchConditions }
            matchingFoodPartnerIds = await foodModel.find(foodFilter).distinct('foodPartner')
        }

        if (category) {
            partnerConditions.push({
                $or: [
                    { categories: { $in: [new RegExp(`^${escapeRegex(category)}$`, 'i')] } },
                    { _id: { $in: matchingFoodPartnerIds } }
                ]
            })
        }

        if (search) {
            const searchRegex = escapeRegex(search)
            partnerConditions.push({
                $or: [
                    { fullName: { $regex: searchRegex, $options: 'i' } },
                    { address: { $regex: searchRegex, $options: 'i' } },
                    { city: { $regex: searchRegex, $options: 'i' } },
                    { _id: { $in: matchingFoodPartnerIds } }
                ]
            })
        }
        if (partnerConditions.length > 0) filter.$and = partnerConditions

        const partners = await foodPartnerModel.find(filter)
            .select('fullName address city profileImage rating ratingCount openingTime closingTime foodType categories')
            .sort({ rating: -1, fullName: 1 })
            .lean()

        const partnerIds = partners.map((partner) => partner._id)
        const reelCounts = await foodModel.aggregate([
            { $match: { foodPartner: { $in: partnerIds } } },
            { $group: { _id: '$foodPartner', reelCount: { $sum: 1 } } }
        ])
        const reelCountByPartner = new Map(
            reelCounts.map((item) => [item._id.toString(), item.reelCount])
        )
        const matchingFoodsByPartner = foodMatchConditions.length > 0
            ? await foodModel.find({
                foodPartner: { $in: partnerIds },
                ...(foodMatchConditions.length === 1
                    ? foodMatchConditions[0]
                    : { $and: foodMatchConditions })
            }).select('foodPartner name tags').lean()
            : []
        const matchesByPartner = new Map()
        matchingFoodsByPartner.forEach((food) => {
            const key = food.foodPartner.toString()
            const matches = matchesByPartner.get(key) || []
            matches.push(food)
            matchesByPartner.set(key, matches)
        })

        res.status(200).json({
            partners: partners.map((partner) => ({
                ...partner,
                reelCount: reelCountByPartner.get(partner._id.toString()) || 0,
                matchingFoods: matchesByPartner.get(partner._id.toString()) || []
            }))
        })
    } catch (error) {
        console.error('Unable to discover partners:', error)
        res.status(500).json({ message: "Unable to discover restaurants" })
    }
}

module.exports={
    getFoodPartnerById,
    getCurrentFoodPartner,
    updateCurrentFoodPartner,
    toggleFollow,
    getPartnerCities,
    discoverPartners
}