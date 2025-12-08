const {model,Schema} =require('mongoose')

const qtable_schema=new Schema({
    description:String,
    multicorrect:Boolean,
    options:{Number:String},
    correct_options:[Number]
})
const Question =model('Question',qtable_schema)
module.exports={Question};