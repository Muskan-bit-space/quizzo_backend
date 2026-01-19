const {model,Schema} =require('mongoose')
// const{Quiz}=require('./quizzes.model')
// const mongoose=require("mongoose")
const usertable_schema=new Schema({
    email:String,
    password:String,

    // Designation:String,
    quizzes_created:[{
        type:Schema.Types.ObjectId, 
        ref:'Quiz'
    }]
})
const User =model('user',usertable_schema)
module.exports={User};