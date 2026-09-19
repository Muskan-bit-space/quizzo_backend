let jwt=require('jsonwebtoken')
let dotenv=require('dotenv');
let {User}=require("../models/users.model")
dotenv.config();
async function requireAuth(req,res,next){
        console.log("requireAuth called");

    //get the token from the auth hdr
    try {
        let extracted_token=req.headers.authorization.split(' ')[1];
        //bcz auth hdr : 'Authoraization <jwt>
//check against the db 
    let decoded=jwt.verify(extracted_token,process.env.JWT_SECRET)
        console.log("decoded: ",decoded)
        let user_data=await User.findOne({email:decoded.mail});
        if(!user_data){
            throw console.error("user not found in the db");
            
        }
        if(user_data.email==decoded.mail){
            // 
    // if same then let the next() function be executed
    console.log(
        "here"
    )
            console.log("user found for jwt verify: ",user_data);
            req.user=user_data
                    console.log("6. calling next() of requireAuth");

            next();
        }
    } catch (e) {
        console.log("error in requireauth of backend: ", e);
    }
    
}
module.exports={requireAuth}