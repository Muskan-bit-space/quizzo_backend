const {User}=require('../models/users.model')
const user_create=require('../controllers/user.create.controller')
const {jwtmaker}=require('./jwt.maker.controller');
const { LEGAL_TLS_SOCKET_OPTIONS } = require('mongodb');
let dotenv =require("dotenv");
dotenv.config();
async function signup(req,res,next){
    //find the user using mongoose  command:
    const{email,password}=req.body
    // console.log(req.body)
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

async function signin(req,res,next){
    try{
        //take out the email and pwd
        const{email,password}=req.body;
        //find a user using the email
        const user=await User.findOne({email:email});
        if(user===null){
            console.log("no user with this email")
            res.send("no user with this email")
        }
        else{
            if(user.password===password){
                let token=1;
                try {
                    token=jwtmaker(process.env.JWT_SECRET,{'mail':email});
                    // token=jwtmaker('merasecret',{'mail':email});
                } catch (error) {
                    console.log("maker call err: " ,error.message)
                }
                console.log("logged in");
                /*set the cookie*/
                // document.cookie=`token=${token};path=/;HTTPOnly;Secure;SameSite=Strict`;
                console.log(`token=${token}`)
                res.send({"token":token})
                //token bnao-> function
                //token send krdo
            }
            else{
                console.log("wrong pwd")
                throw "wrong pwd"
                // res.send("wrong pwd")
            }
        }
        //if found then 
            //then check its pwd
                //if pwd matched then clg signed in 
                //else wrong pwd
        // else say no user found
    }
    catch(e){
        console.log("pre signin error: ", e)
        // res.send("pre signin error: ", e)
        throw new Error(e);
        // throw new Error(e.message);
        
    }

}
async function getMe(req,res,next){
    return res.status(200).json({
        user:req.user
    })
}
module.exports={signup,signin,getMe}