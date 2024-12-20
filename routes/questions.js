var express = require('express');
var router = express.Router();
const Exam = require('../model/exam');

router.get('/get-questions-by-id/:examId', async function(req, res, next) {
  try{
        const questions = await Exam.findById({_id : req.params.examId});
        res.json(questions);
  }catch(error){
    res.status(500).json({message : error.message})
  }
});

router.post('/create-question/:examId', async function(req, res, next){
    try{
       const exam = await Exam.findById({_id : req.params.examId});
       const { mark } = req.body;
       exam.questions.push(req.body);
       exam.max_score = (exam.max_score || 0) + mark;
       await exam.save();
       res.json({message : "Question added successfully"});
    }catch(error){
        res.status(500).json({message : error.message});
    }
})

router.get('/get-question-by-id/:examId/:questionId', async function(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    } 
    const question = exam.questions.id(req.params.questionId); 
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/update-question/:examId/:questionId', async function(req, res, next) {
  try {
      const exam = await Exam.findById(req.params.examId);
      if (!exam) {
          return res.status(404).json({ message: "Exam not found" });
      }

      const questionIndex = exam.questions.findIndex(q => q._id.toString() === req.params.questionId);
      if (questionIndex === -1) {
          return res.status(404).json({ message: "Question not found" });
      }

      exam.questions[questionIndex] = {
          ...exam.questions[questionIndex], 
          ...req.body 
      };

      await exam.save();
      res.json({ message: "Question updated successfully" });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});




router.delete('/delete-question-by-id/:examId/:questionId', async function(req, res, next) {
  try {
      const exam = await Exam.findById(req.params.examId);
      if (!exam) {
          return res.status(404).json({ message: "Exam not found" });
      }
      const questionIndex = exam.questions.findIndex(q => q._id.toString() === req.params.questionId);
      if (questionIndex === -1) {
          return res.status(404).json({ message: "Question not found" });
      }
      const removedQuestion = exam.questions.splice(questionIndex, 1)[0];
      exam.max_score = (exam.max_score || 0) - (removedQuestion.mark || 0);
      await exam.save();
      res.json({ message: "Question deleted successfully" });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});


router.get('/take-exam/:examId', async function(req, res, next) {
  try{
        const examQuestions = await Exam.findById({_id : req.params.examId}, 'questions');
       const questionsWithOptions = examQuestions.questions.map(q => ({
         question: q.question,
         question_id : q._id,
         options: q.options.map(option => ({
          value : option.value, 
          option_id : option._id
        }))
       }));
        res.json(questionsWithOptions);
  }catch(error){
    res.status(500).json({message : error.message})
  }
});

module.exports = router;
