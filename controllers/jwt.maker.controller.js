const jwt=require('jsonwebtoken')

//jwt maker function

function jwtmaker(secret,obj){
    try{
        const token= jwt.sign(obj,secret);
        return token;
    }
    catch(e){
        // console.log(e.message);
        console.error('Error signing JWT:', e.message);
    }
}

module.exports={jwtmaker}