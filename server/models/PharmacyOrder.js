const mongoose = require("mongoose");

const pharmacyOrderSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    medicines: [
      {
        name: String,
        quantity: Number,
        price: Number
      }
    ],
    prescriptionImage: { type: String },
    prescriptionUrl: { type: String, default: "" },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Pending", "Packed", "Delivered"],
      default: "Pending"
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid - UPI", "Paid - Cash"],
      default: "Pending"
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Cash", "Card", "Insurance", "Other"],
      default: null
    },
    paymentDate: { type: Date, default: null },
    paidAmount: { type: Number, default: 0, min: 0 },
    orderNotes: { type: String, default: "" },
    notificationSent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index for search performance
pharmacyOrderSchema.index({ "patient": 1, "createdAt": -1 });

module.exports = mongoose.model("PharmacyOrder", pharmacyOrderSchema);
