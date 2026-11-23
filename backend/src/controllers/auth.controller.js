const userModel = require('../models/user.model');
const foodPartnerModel = require('../models/foodpartner.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const storageService = require('../services/storage.service');
const {v4: uuid} = require('uuid');

const authCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
}

async function registerUser(req,res) {
    const {fullName, email , password}= req.body
    const isUserAlreadyExist = await userModel.findOne({email})
    //return if user already exists
    if(isUserAlreadyExist){
        return res.status(400).json({
            message:"user already exist with this email"
        })
    }
    //hash password
    const hashedPassword= await bcrypt.hash(password,10)
    //create user
    const user = await userModel.create({
        fullName,
        email,
        password:hashedPassword
    })
    //now create token to know from where the request is coming
    const token = jwt.sign({
        id:user._id,
    },process.env.JWT_SECRET)
    //create cookie to store token 
    res.cookie("token",token,authCookieOptions)
    res.status(201).json({
        message:"user registered successfully",
        user:{
            _id:user._id,
            email:user.email,
            fullName:user.fullName
        }
    })
}
async function loginUser(req,res) {
    const{email,password}= req.body
    const user = await userModel.findOne({
        email     })
    if(!user){
        return res.status(400).json({
            message:"invalid email or password"
        })
    }
    const isPasswordValid  = await bcrypt.compare(password, user.password)
    if(!isPasswordValid){
        return res.status(400).json({
            message:"invalid email or password"
        })
    }
    const token = jwt.sign({
        id:user._id
    },process.env.JWT_SECRET)
    res.cookie("token", token, authCookieOptions)
    res.status(200).json({
        message:"user registered successfully",
        user:{
            _id:user._id,
            email:user.email,
            fullName:user.fullName
        }
    })
}
async function logoutUser(req,res) {
    res.clearCookie("token",authCookieOptions)
    res.status(200).json({
        message:"user logged out successfully"
})
    
}

async function getCurrentUser(req, res) {
    try {
        const user = await userModel.findById(req.user._id)
            .select('fullName email profileImage')
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        res.status(200).json({ user })
    } catch (error) {
        console.error('Unable to load user profile:', error)
        res.status(500).json({ message: "Unable to load profile" })
    }
}

async function updateCurrentUser(req, res) {
    try {
        const user = await userModel.findById(req.user._id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (typeof req.body.fullName === 'string') {
            user.fullName = req.body.fullName.trim()
        }

        if (typeof req.body.email === 'string') {
            const email = req.body.email.trim().toLowerCase()
            if (!email) {
                return res.status(400).json({ message: "Email is required" })
            }
            const existingUser = await userModel.findOne({ email, _id: { $ne: user._id } })
            if (existingUser) {
                return res.status(409).json({ message: "This email is already in use" })
            }
            user.email = email
        }

        if (typeof req.body.password === 'string' && req.body.password) {
            const currentPassword = typeof req.body.currentPassword === 'string'
                ? req.body.currentPassword
                : ''
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password is required" })
            }
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
            if (!isPasswordValid) {
                return res.status(400).json({ message: "Current password is incorrect" })
            }
            if (req.body.password.length < 6) {
                return res.status(400).json({ message: "New password must be at least 6 characters" })
            }
            user.password = await bcrypt.hash(req.body.password, 10)
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
                `user-${user._id}-${uuid()}${extension}`
            )
            user.profileImage = upload.url
        }

        await user.save()
        const updatedUser = await userModel.findById(user._id)
            .select('fullName email profileImage')
        res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser
        })
    } catch (error) {
        console.error('Unable to update user profile:', error)
        res.status(500).json({ message: "Unable to update profile" })
    }
}
async function registerFoodPartner(req,res) {
    const {fullName, email , password, contactName , phone , address, city, foodType}= req.body
    const isfoodPartnerAlreadyExist = await foodPartnerModel.findOne({email})
    //return if foodPartner already exists
    if(isfoodPartnerAlreadyExist){
        return res.status(400).json({
            message:"foodPartner already exist with this email"
        })
    }
    //hash password
    const hashedPassword= await bcrypt.hash(password,10)
    //create foodPartner
    const foodPartner = await foodPartnerModel.create({
        fullName,
        email,
        password:hashedPassword,
        phone,
        address,
        contactName,
        city: typeof city === 'string' ? city.trim() : '',
        foodType: ['veg', 'non-veg', 'both'].includes(foodType) ? foodType : 'both'
    })
    //now create token to know from where the request is coming
    const token = jwt.sign({
        id:foodPartner._id,
    },process.env.JWT_SECRET)
    //create cookie to store token 
    res.cookie("token",token,authCookieOptions)
    res.status(201).json({
        message:"foodPartner registered successfully",
        foodPartner:{
            _id:foodPartner._id,
            email:foodPartner.email,
            fullName:foodPartner.fullName
        }
    })
}
async function loginFoodPartner(req,res) {
    const{email,password}= req.body
    const foodPartner = await foodPartnerModel.findOne({
        email     })
    if(!foodPartner){
        return res.status(400).json({
            message:"invalid email or password"
        })
    }
    const isPasswordValid  = await bcrypt.compare(password, foodPartner.password)
    if(!isPasswordValid){
        return res.status(400).json({
            message:"invalid email or password"
        })
    }
    const token = jwt.sign({
        id:foodPartner._id
    },process.env.JWT_SECRET)
    res.cookie("token", token, authCookieOptions)
    res.status(200).json({
        message:"foodPartner registered successfully",
        foodPartner:{
            _id:foodPartner._id,
            email:foodPartner.email,
            fullName:foodPartner.fullName
        }
    })
}
async function logoutFoodPartner(req,res) {
    res.clearCookie("token",authCookieOptions)
    res.status(200).json({
        message:"foodPartner logged out successfully"
})
    
}
module.exports= {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    updateCurrentUser,
    loginFoodPartner,
    registerFoodPartner,
    logoutFoodPartner
}
