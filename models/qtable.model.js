const mongoose = require('mongoose');
const {model,Schema} =require('mongoose')
// const {User}=require('./users.model')
const qtable_schema=new Schema({
    description:String,
    multicorrect:Boolean,
    options:{Number:String},
    correct_options:[Number],
    duration:Number,
    correct_ans_users:[{
        type: mongoose.Schema.Types.ObjectId, 
        ref:'User',
        required:true
    }],
    incorrect_ans_users:[{
        type: mongoose.Schema.Types.ObjectId, 
        ref:'User',
        required:true
    }],
    
})
const Question =model('Question',qtable_schema)
module.exports={Question};