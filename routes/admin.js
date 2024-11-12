var express = require('express');
var router = express.Router();
const Admin = require('../model/admin');
var bcrypt = require("bcrypt");

router.post('/register-admin', async function(req, res, next) {
    try{
      const {mail, password} = req.body;
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

         const admin = new Admin ({
           mail,
           password : hash
         })
         await admin.save();
         res.json({message : "Admin created successfully"});
    }catch (error) {
         res.status(500).json({message : error.mesaage})
         console.log(error);
    }
  });

  router.post('/admin-login', async (req, res) => {
    const { mail, password } = req.body;

    try {
        // Find the user by email
        const admin = await Admin.findOne({ mail });
        if (!admin) {
            return res.status(400).json({ message: 'No admin found' });
        }

        // Compare the provided password with the stored hashed password
        const passwordCheck = await bcrypt.compare(password, admin.password);
        if (!passwordCheck) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Successful login
        res.status(200).json({ message: 'Login successful'});
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

  module.exports = router;