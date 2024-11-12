const { type } = require("express/lib/response");
const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
    course: {
        type: String,
        required: true,
      },
    topic: {
        type: String,
      
    },
    duration: {
      type : String,
 
    },
    questions: [
        {
            question:{
                type : String,
            },
            mark:{
                type: Number,
                
            },
            options: [
                {
                  value: {
                    type: String,
                  },
                  isCorrect: {
                    type: Boolean,
                  },
                }
            ],
            explanation : {
              type : String,
            }
        },
    ],
    max_score: {
      type : Number,
      default: 0
    }

});

const Exam = mongoose.model("Exam", examSchema);

module.exports = Exam;