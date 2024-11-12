var express = require('express');
var router = express.Router();
const Student = require('../model/student');
var bcrypt = require("bcrypt");

router.get('/get-all-students', async function(req, res, next) {
    try{
      const students = await Student.find();
      res.json(students);
    }catch(error){
      res.status(500).json({message : error.message})
    }
  });

  router.post('/register-student', async function(req, res, next) {
    try{
      const { name, mail, password} = req.body;
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

         const student = new Student ({
           name,
           mail,
           password : hash,
         })
         await student.save();
         res.json({message : "User created successfully"});
    }catch (error) {
         res.status(500).json({message : error.mesaage})
         console.log(error);
    }
  });

  router.post('/student-login', async (req, res) => {
    const { mail, password } = req.body;

    try {
        const student = await Student.findOne({ mail });
        if (!student) {
            return res.status(400).json({ message: 'No user found' });
        }
        const passwordCheck = await bcrypt.compare(password, student.password);
        if (!passwordCheck) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        res.status(200).json({ message: 'Login successful', student: { name: student.name, mail: student.mail , id : student._id } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

router.get('/get-student-by-id/:studentId' , async (req, res) => {
   try{
    const student = await Student.findById(req.params.studentId);
    res.json(student);
   }catch(error){
    res.status(500).json({message : error.message})
   }
})

  module.exports = router;
