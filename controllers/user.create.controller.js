const {User}=require('../models/users.model');
async function user_create(mail,pwd) {
    try {
        // const user=await User.create({
        // username:"MUSKAN_username",
        // password:"msiukanka password",
        // designation:'Student'
        // })

        // const user=new User({
        // email:mail,
        // // email:mail,
        // password:pwd,
        // quizzes_created:[]
        // // designation:desig
        // })
        // await user.save(/*()=>{
        //     if (err) console.log("err");
        //     // if (err) console.log(err);
        //     else return 
        // }*/)
        const nayauser=await User.create({
             email:mail,
            // email:mail,
            password:pwd,
            quizzes_created:[]
            // designation:desig
        })
            return (nayauser)
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
        // console.log("user created", mail,pwd)
        // return {

        // }
        
    } catch (error) {
        console.log("usermodel err:",error)
    }
        
}

module.exports=user_create;