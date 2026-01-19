const {User}=require('../models/users.model');
async function user_create(pwd,mail) {
    try {
        // const user=await User.create({
        // username:"MUSKAN_username",
        // password:"msiukanka password",
        // designation:'Student'
        // })

        const user=await User.insertOne({
        email:mail,
        // email:mail,
        password:pwd,
        quizzes_created:[]
        // designation:desig
        })

//         const newUser = new User({
//   email: req.body.username,
//   password: req.body.password
//   });
//   newUser.save(function(err){
//     if (err) {
//       console.log(err);
//     } else {
//       res.render("secrets");
//    }
//  });
        // console.log("in user creation fnctn")
        console.log(newUser)
        return newUser
        
    } catch (error) {
        console.log("usermodel err:",error)
    }
        
}

module.exports=user_create;