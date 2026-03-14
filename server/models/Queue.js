const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true, unique: true },
    currentNumber: { type: Number, default: 0 },
    currentPriorityNumber: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Queue", queueSchema);
