const express = require('express');
const path = require('path');
const {connectDB}=require('./db')
const Question=require('./models/qtable.model')
const qtable_create=require('./controllers/qtable.create.controller')
const user_create=require('./controllers/user.create.controller')
const quiz_create=require('./controllers/quiz.create.controller')
const app = express();
const {MongoClient}=require('mongoose')
// Middleware to parse URL-encoded bodies------------------------------------------------
app.use(express.urlencoded({ extended: true }));
// ------------------------------------------------------------------------------------------
const PORT = process.env.PORT || 4444;
app.get('/create',(req,res)=>{
  const b=qtable_create();
  res.send("blog created: ")
  res.json(b)
})
app.post('/signup',async(req,res)=>{
  // const r=req.body;
  // const b=user_create(req.body.mail, req.body.pwd);
  // console.log("hey");
  
  const{mail,pwd}=req.query;
  const b=await user_create(mail, pwd);  //kyunki ek promise aayega hmesha from an async 
  // function and hmei use resilve hone dena h
  // user_create( req.body.pwd);
  // res.send("user created: ",);
  res.json(b.toObject());
})
app.get('/qc',async (req,res)=>{
  const b=await quiz_create();
  // res.send("quiz created: ")
  res.json(b.toObject())
})
  // blog_create();
app.get('/',(req,res)=>{
  res.send("on root")
})
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
}); 