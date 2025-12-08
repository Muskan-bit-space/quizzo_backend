const {User}=require('../models/users.model');
async function user_create() {
    try {
        // const user=await User.create({
        // username:"MUSKAN_username",
        // password:"msiukanka password",
        // designation:'Student'
        // })

        const user=await User.create({
        username:"CHINU_username",
        password:"chinucba;o password",
        designation:'Teacher'
        })

        console.log(user)
        return user
        
    } catch (error) {
        console.log(error)
    }
        
}

module.exports=user_create;