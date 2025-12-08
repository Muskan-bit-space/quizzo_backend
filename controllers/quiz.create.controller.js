// 69366168e25f75ef15b7f40b for quiz
// 6936671a70da0b0827b432fd for author

const {Quiz}=require('../models/quizzes.model');

function quiz_create() {
    Quiz.create(
    {
        quiz_id:'69366168e25f75ef15b7f40b',
        author_id:'6936671a70da0b0827b432fd'    ,
        correct_response:[{1:['6936671a70da0b0827b432fd']}]
    }).then((obj)=>{
    console.log(obj)})
}
module.exports=quiz_create;