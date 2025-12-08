const {Question}=require('../models/qtable.model');
async function qtable_create() {
    try {
        const qtable=await Question.create({
        description:"how many cats",
        multicorrect:false,
        options:{
                1:"3",
                2:"7",
                3:"98",
                4:"6",    
            }  
        })

        console.log(qtable)
        return qtable
        
    } catch (error) {
        console.log(error)
    }
        
}

module.exports=qtable_create;