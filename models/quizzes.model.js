const mongoose=require('mongoose')
const {model,Schema} =require('mongoose')
// const{User}=require('./users.model')

const quiztable_schema=new Schema({
    quiz_id:{
         
        type: mongoose.Schema.Types.ObjectId, 
        ref:"Question",
        required:true
    },
    author_id:{
                
        type: mongoose.Schema.Types.ObjectId, 
        ref:'User',
        required:true
    }    ,
    // options:{Number:String},
    // correct_response:[{Number]
})
const Quiz =model('Quiz',quiztable_schema)
module.exports={Quiz};