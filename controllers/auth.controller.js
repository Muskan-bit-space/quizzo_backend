const {User}=require('../models/users.model')
async function pre_signin(email,password){
    //find the user using mongoose  command:
    try{
        const does_user_Exist=await User.findOne({email:email,password:password});
        if(does_user_Exist===null){
            return false;
        }
        else return true;

    }
    catch(err){
        console.log("pre sigin error: ",err)
    }

    
}


/////////post_signin function


module.exports={pre_signin}