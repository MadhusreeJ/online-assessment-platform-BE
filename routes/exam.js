var express = require('express');
var router = express.Router();
const Exam = require('../model/exam');
const Student = require('../model/student');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, './uploads/videos'); // Path where video files will be stored
  },
  filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // Using timestamp to avoid filename collision
  }
});

const upload = multer({ storage: storage });

/* GET home page. */
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
    const { id } = req.params; // Get the exam ID from the URL parameters
    const { course, topic, duration } = req.body; // Get the updated details from the request body

    // Find the exam by ID and update it
    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      { course, topic, duration }, // Update the fields
      { new: true } // Return the updated document
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

        // Check if 'answers' is a string (as it will be from form-data)
        if (typeof answers === 'string') {
            answers = JSON.parse(answers); // Parse the string into an array
        }

        console.log("Parsed answers:", answers);  // Debug log to confirm the structure

        // Ensure answers is now an array
        if (!Array.isArray(answers)) {
            return res.status(400).json({ message: "Answers must be an array." });
        }
      const exam = await Exam.findById({ _id: req.params.examId });
      let totalMark = 0;
      // Process answers

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

      // Process the student and save the result
      const student = await Student.findById({ _id: req.params.studentId });

      // Add exam result to the student's exams
      student.exams.push({
          exam_id: exam._id,
          exam: exam.course,
          score: totalMark,
          max_score: exam.max_score
      });

      // Save the student's data after the exam submission
      await student.save();

      // If a video file is uploaded, save its file path
      if (req.file) {
          student.exams[student.exams.length - 1].video = req.file.path;
          await student.save();
      }

      // Return response with the student's updated data and marks
      res.status(200).json({
          student,
          Marks: totalMark
      });
  } catch (error) {
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
    // Fetch all exams
    const exams = await Exam.find({}, { max_score: 1, _id: 1, course: 1 });

    // Prepare the response
    const examsWithScores = await Promise.all(exams.map(async (exam) => {
        // Find students who have taken this exam
        const studentScores = await Student.find({ 'exams.exam_id': exam._id }, { name: 1, 'exams.$': 1 });

        return {
          exam_id: exam._id,
          exam_name: exam.course, // Assuming 'course' is the exam name
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
      // Fetch all students who have attended at least one exam
      const students = await Student.find({ "exams.0": { $exists: true } });

      // Create an object to hold the video data categorized by exam
      const videosByExam = {};

      // Iterate over each student to collect their video data
      students.forEach(student => {
          student.exams.forEach(exam => {
              if (exam.video) { // Only consider exams where a video was uploaded
                  const examId = exam.exam_id;
                  const examName = exam.exam;

                  // If the exam is not already in the `videosByExam` object, create a new entry
                  if (!videosByExam[examName]) {
                      videosByExam[examName] = []; // Initialize an empty array for this exam
                  }

                  // Construct full URL for the video (using the server's URL and video path)
                  let normalizedVideoPath = path.normalize(exam.video).replace(/\\/g, '/');

                    // Remove the leading 'uploads/' from the video path if it's already present
                    if (normalizedVideoPath.startsWith('uploads/')) {
                        normalizedVideoPath = normalizedVideoPath.substring(8); // Remove 'uploads/' from the beginning
                    }
  
                    // Construct full URL for the video (using the server's URL and video path)
                    const videoUrl = `${req.protocol}://${req.get('host')}/uploads/${normalizedVideoPath}`;

                  // Push the video data into the array for the corresponding exam
                  videosByExam[examName].push({
                      studentName: student.name,
                      studentEmail: student.email,
                      videoUrl: videoUrl // Full URL to the video
                  });
              }
          });
      });

      // If no videos found
      if (Object.keys(videosByExam).length === 0) {
          return res.status(404).json({ message: 'No videos found for any exams.' });
      }

      // Return the categorized data
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

      // Find the student by ID
      const student = await Student.findById(studentId);
      if (!student) {
          return res.status(404).json({ message: 'Student not found.' });
      }

      // Find the exam for this student and update the redFlag field
      const exam = student.exams.find(exam => exam.exam_id.toString() === examId);
      if (!exam) {
          return res.status(404).json({ message: 'Exam not found for the student.' });
      }

      // Update the redFlag status
      exam.redFlag = redFlag; // Add a redFlag property to your exam schema

      // Save the student record with updated exam data
      await student.save();

      res.status(200).json({ message: 'Red flag status updated successfully.' });
  } catch (error) {
      console.error('Error updating red flag status:', error);
      res.status(500).json({ message: 'Server error while updating red flag.' });
  }
});



module.exports = router;
