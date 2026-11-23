const foodPartnerModel = require('../models/foodpartner.model');
const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');

async function authFoodPartnerMiddleware(req,res,next) {
    const token = req.cookies.token
    if(!token){
        return res.status(401).json({
            message:"login first"
        })
    }
    //if token then verify
    try{
        const decoded= jwt.verify(token , process.env.JWT_SECRET)
        const foodPartner= await foodPartnerModel.findById(decoded.id)
        //creating new property
        req.foodPartner= foodPartner
        next()
    }catch(err){
        return res.status(401).json({
            message:"invalid token"
        })
    }

}
async function authUserMiddleware(req,res,next) {
    const token = req.cookies.token
    if(!token){
        return res.status(401).json({
            message:"login first"
        })
    }
    //if token then verify
    try{
        const decoded= jwt.verify(token , process.env.JWT_SECRET)
        const user= await userModel.findById(decoded.id)
        //creating new property
        req.user= user
        next()
    }catch(err){
        return res.status(401).json({
            message:"invalid token"
        })
    }

}

module.exports={authFoodPartnerMiddleware, authUserMiddleware}