const {User}=require('../models/users.model')
const user_create=require('../controllers/user.create.controller')
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
    //take out the email and pwd
    const{email,password}=req.body;
    //find a user using the email
    const user=await User.findOne({email:email});
    if(user===null){
        console.log("no user with this email")
    }
    else{
        if(user.password===password){
            console.log("logged in")
        }
        else{
            console.log("wrong pwd")
        }
    }
     //if found then 
        //then check its pwd
            //if pwd matched then clg signed in 
            //else wrong pwd
     // else say no user found

}

module.exports={signup,signin}