const { type } = require("express/lib/response");
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true
    },
    mail : {
        type : String,
        required : true
    },
    password : {
        type : String,
        required : true
    },
    exams : [
        {
            exam_id : {
                type : mongoose.Schema.Types.ObjectId,
                ref: 'Exam'
            },
            exam : {
                type : String
            },
            score : {
                type : Number
            },
            max_score : {
                type : Number
            },
            video: {  // New field for the video
                type: String,  // This will store the file path or URL of the video
                default: null    // Default value can be null if no video is uploaded
            },
            redFlag: { // Add redFlag field
                type: Boolean,
                default: false // Default is false (not flagged)
            }
        }
    ]
});

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;