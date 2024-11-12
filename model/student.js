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
            video: {  
                type: String,  
                default: null   
            },
            redFlag: { 
                type: Boolean,
                default: false 
            }
        }
    ]
});

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
