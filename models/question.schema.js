const { Schema } = require("mongoose");
const questionSchema = new Schema({
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  options: {
    type: [String], required: true,
    validate: {
      validator: options => options.length >= 2 && options.length <= 10
        && options.every(option => typeof option === "string" && option.trim() && option.length <= 500)
        && new Set(options.map(option => option.trim().toLowerCase())).size === options.length,
      message: "Use 2–10 unique, nonempty options of at most 500 characters.",
    },
  },
  correctOption: {
    type: Number, required: true, min: 0,
    validate: { validator(value) { return Number.isInteger(value) && value < this.options.length; }, message: "Choose a valid answer index." },
  },
}, { _id: true });
module.exports = questionSchema;
