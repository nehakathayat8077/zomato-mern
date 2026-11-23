//create server
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const foodRoutes = require('./routes/food.routes');
const foodPartnerRoutes = require('./routes/food-partner.routes');
//create instance
const app = express()
//to make data visible from req.body use middleware
app.use(express.json())
//so that two ports are treated the same server
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}))
//middleware to read cookies from browser to backend
app.use(cookieParser())
//dummy route
app.get('/',(req,res)=>{
    //controller
    res.send("hello world")
})


app.use('/api/auth', authRoutes)
app.use('/api/food', foodRoutes)
app.use('/api/food-partner', foodPartnerRoutes)
//export 
module.exports= app;