var express = require('express');
var router = express.Router();
const Exam = require('../model/exam');
const Student = require('../model/student');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, './uploads/videos'); 
  },
  filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
router.get('/get-all-exams', async function(req, res, next) {
  try{
    const exams = await Exam.find();
    res.json(exams);
  }catch(error){
    res.status(500).json({message : error.message})
  }
});

router.post('/create-exam', async function(req, res, next) {
  try{
    const { course, topic, duration} = req.body;
       const exam = new Exam ({
         course,
         topic,
         duration,
       })
       await exam.save();
       res.json({message : "Exam created successfully" , examId : exam._id , questions: exam.questions.length});
  }catch (error) {
       res.status(500).json({message : error.mesaage})
       console.log(error);
  }
});

router.get('/get-exam-by-id/:examId', async function(req, res, next) {
  try{
        const exam = await Exam.findById({_id : req.params.examId});
        res.json(exam);
  }catch(error){
    res.status(500).json({message : error.message})
  }
});

router.put('/update-exam/:id', async function(req, res, next) {
  try {
    const { id } = req.params; 
    const { course, topic, duration } = req.body;
    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      { course, topic, duration }, 
      { new: true } 
    );
    if (!updatedExam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    res.json({ message: "Exam updated successfully", exam: updatedExam });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log(error);
  }
});


router.post('/submit-exam/:studentId/:examId', upload.single('video'), async function (req, res, next) {
  try {
    let answers = req.body.answers;
        if (typeof answers === 'string') {
            answers = JSON.parse(answers);
        }
        console.log("Parsed answers:", answers); 
        if (!Array.isArray(answers)) {
            return res.status(400).json({ message: "Answers must be an array." });
        }
      const exam = await Exam.findById({ _id: req.params.examId });
      let totalMark = 0;
      if (!Array.isArray(answers)) {
        return res.status(400).json({ message: "Answers must be an array." });
    }
      answers.forEach((item) => {
          if (item === null) {
              return;
          }
          const question = exam.questions.id(item.questionId);
          const option = question.options.id(item.optionId);
          if (option.isCorrect) {
              totalMark += question.mark;
          }
      });

      const student = await Student.findById({ _id: req.params.studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }
    console.log(student);
    const newExam = {
    exam_id: exam._id,
    exam: exam.course,
    score: totalMark,
    max_score: exam.max_score
};

// Validate the newExam object
if (typeof newExam !== 'object' || newExam === null) {
    return res.status(400).json({ message: "Invalid exam data." });
}

if (!newExam.exam_id || !newExam.exam || typeof newExam.score !== 'number' || typeof newExam.max_score !== 'number') {
    return res.status(400).json({ message: "Invalid exam data." });
}

student.exams.push(newExam);
      if (req.file) {
          student.exams[student.exams.length - 1].video = req.file.path;
          await student.save();
      }
      res.status(200).json({
          student,
          Marks: totalMark
      });
    console.log("Exam ID:", exam._id);
console.log("Exam Course:", exam.course);
console.log("Total Mark:", totalMark);
console.log("New Exam Object:", newExam);

  } 
  catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
  }
});


router.get('/exam-scores/:examId', async function(req, res, next) {
  try {
    const examId = new mongoose.Types.ObjectId(req.params.examId);
    const students = await Student.find({
      "exams.exam_id": examId
    });
    console.log(examId);
    console.log("Students found:", students);
    const results = students.map(student => {
      console.log("Current student:", student.name, "Exams:", student.exams);
      const exam = student.exams.find(exam => exam.exam_id.equals(examId));
      console.log("Exam found:", exam);
      if (!exam) {
        return {
          studentName: student.name,
          score: null,
          max_score: null
        };
      }
      return {
        studentName: student.name,
        score: exam.score,
        max_score: exam.max_score
      };
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/get-exams-with-scores', async (req, res) => {
  try {
    const exams = await Exam.find({}, { max_score: 1, _id: 1, course: 1 });
    const examsWithScores = await Promise.all(exams.map(async (exam) => {
        const studentScores = await Student.find({ 'exams.exam_id': exam._id }, { name: 1, 'exams.$': 1 });
        return {
          exam_id: exam._id,
          exam_name: exam.course,
          max_score: exam.max_score,
          studentScores: studentScores.map(student => ({
              name: student.name,
              score: student.exams[0].score,
              max_score: student.exams[0].max_score
          }))
      };
    }));
    res.status(200).json(examsWithScores);
} catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
}
});

router.get('/get-all-videos-by-exam', async function (req, res) {
  try {
      const students = await Student.find({ "exams.0": { $exists: true } });
      const videosByExam = {};
      students.forEach(student => {
          student.exams.forEach(exam => {
              if (exam.video) { 
                  const examId = exam.exam_id;
                  const examName = exam.exam;
                  if (!videosByExam[examName]) {
                      videosByExam[examName] = []; 
                  }

                  let normalizedVideoPath = path.normalize(exam.video).replace(/\\/g, '/');
                    if (normalizedVideoPath.startsWith('uploads/')) {
                        normalizedVideoPath = normalizedVideoPath.substring(8);
                    }
  
                    const videoUrl = `${req.protocol}://${req.get('host')}/uploads/${normalizedVideoPath}`;
                  videosByExam[examName].push({
                      studentName: student.name,
                      studentEmail: student.email,
                      videoUrl: videoUrl 
                  });
              }
          });
      });
      if (Object.keys(videosByExam).length === 0) {
          return res.status(404).json({ message: 'No videos found for any exams.' });
      }
      res.status(200).json({
          data: videosByExam
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error while fetching videos.' });
  }
});

router.post('/exam/update-red-flag', async (req, res) => {
  try {
      const { studentId, examId, redFlag } = req.body;
      const student = await Student.findById(studentId);
      if (!student) {
          return res.status(404).json({ message: 'Student not found.' });
      }

      const exam = student.exams.find(exam => exam.exam_id.toString() === examId);
      if (!exam) {
          return res.status(404).json({ message: 'Exam not found for the student.' });
      }
      exam.redFlag = redFlag; 
      await student.save();
      res.status(200).json({ message: 'Red flag status updated successfully.' });
  } catch (error) {
      console.error('Error updating red flag status:', error);
      res.status(500).json({ message: 'Server error while updating red flag.' });
  }
});



module.exports = router;
