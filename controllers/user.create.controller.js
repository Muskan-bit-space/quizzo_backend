const {User}=require('../models/users.model');
async function user_create(pwd,mail) {
    try {
        // const user=await User.create({
        // username:"MUSKAN_username",
        // password:"msiukanka password",
        // designation:'Student'
        // })

        const user=await User.create({
        email:mail,
        // email:mail,
        password:pwd,
        quizzes_created:[]
        // designation:desig
        })

        console.log(user)
        return user
        
    } catch (error) {
        console.log("usermodel err:",error)
    }
        
}

module.exports=user_create;