const express = require('express');
const path = require('path');
const router=express.Router();  //-----this is like app 
const {signup}=require('../controllers/auth.controller.js')
router.post('/signup',signup)
module.exports=router