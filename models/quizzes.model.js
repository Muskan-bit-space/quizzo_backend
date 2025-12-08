const mongoose=require('mongoose')
const {model,Schema} =require('mongoose')

const quizztable_schema=new Schema({
    quiz_id:{
         
        type: mongoose.Schema.Types.ObjectId, 
        ref:'Question',
        required:true
    },
    author_id:{
                
        type: mongoose.Schema.Types.ObjectId, 
        ref:'User',
        required:true
    }    ,
    // options:{Number:String},
    correct_response:[{Number:[String]}]
})
const Quiz =model('Quiz',quizztable_schema)
module.exports={Quiz};