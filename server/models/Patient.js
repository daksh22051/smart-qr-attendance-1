const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tokenNumber: { type: String, required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    symptoms: { type: String, default: "" },
    priority: { type: Boolean, default: false },
    queueOrder: { type: Number, default: () => Date.now() },
    patient_queue: { type: Number, default: () => Date.now() },
    status: {
      type: String,
      enum: ["waiting", "serving", "served"],
      default: "waiting"
    },
    arrival_time: { type: Date, default: () => new Date() },
    consultation_start: { type: Date, default: null },
    consultation_end: { type: Date, default: null },
    dateKey: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
