const mongoose = require('mongoose');

const foodPartnerSchema= new mongoose.Schema({
    fullName:{
        type: String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true

    },
    contactName:{
        type: String,
        required:true
    },
    address:{
        type: String,
        required:true
    },
    phone:{
        type: String,
        required:true
    },
    profileImage:{
        type:String,
        default:''
    },
    rating:{
        type:Number,
        default:0,
        min:0,
        max:5
    },
    ratingCount:{
        type:Number,
        default:0,
        min:0
    },
    openingTime:{
        type:String,
        default:''
    },
    closingTime:{
        type:String,
        default:''
    },
    city:{
        type:String,
        trim:true,
        default:''
    },
    foodType:{
        type:String,
        enum:['veg','non-veg','both'],
        default:'both'
    },
    categories:{
        type:[String],
        default:[]
    },
    password:{
        type:String,
    }},
    {
        timestamps:true
    }  
)
const foodPartnerModel = mongoose.model("foodPartner",foodPartnerSchema)
module.exports= foodPartnerModel