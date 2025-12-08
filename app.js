const express = require('express');
const path = require('path');
const {connectDB}=require('./db')
const Question=require('./models/qtable.model')
const qtable_create=require('./controllers/qtable.create.controller')
const user_create=require('./controllers/user.create.controller')
const quiz_create=require('./controllers/quiz.create.controller')
const app = express();
const {MongoClient}=require('mongoose')
// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 4444;
app.get('/create',(req,res)=>{
  const b=qtable_create();
  res.send("blog created: ")
  // res.json(b)
})
app.get('/signup',(req,res)=>{
  const b=user_create();
  res.send("user created: ")
  // res.json(b)
})
app.get('/qc',(req,res)=>{
  const b=quiz_create();
  res.send("quiz created: ")
  // res.json(b)
})
  // blog_create();
app.get('/',(req,res)=>{
  res.send("on root")
})
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
}); 