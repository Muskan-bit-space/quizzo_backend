const {User}=require('../models/users.model')
async function signup(req,res,next){
    //find the user using mongoose  command:
    const{email,password}=req.body
    try{
        const does_user_Exist=await User.findOne({email:email,password:password});
        if(does_user_Exist===null){
            //then sign in the user
            const user_created=await user_create(email, password);
            console.log("user_created: ",user_created)  
            return user_created
        }
        else return "user already present"

    }
    catch(err){
        console.log("pre signup error: ",err)
    }

    
}


/////////signin function


module.exports={signup}