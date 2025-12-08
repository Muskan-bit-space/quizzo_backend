const {model,Schema} =require('mongoose')

const usertable_schema=new Schema({
    username:String,password:String,
    Designation:String
})
const User =model('User',usertable_schema)
module.exports={User};