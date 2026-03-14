const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialization: { type: String, required: true },
    // average consultation time in minutes used for wait estimates
    avgConsultationTime: { type: Number, default: 4 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
