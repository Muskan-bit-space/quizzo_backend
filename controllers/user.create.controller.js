const {User}=require('../models/users.model');
async function user_create(mail,pwd) {
    try {
        console.log(mail,pwd)
        const nayauser=await User.create({
            email:mail,
            password:pwd,
            quizzes_created:[]
        })

       return (nayauser)
    }
    catch (error) {
        console.log("usermodel err:",error)
    }
        
}

module.exports=user_create;