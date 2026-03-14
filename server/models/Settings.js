const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    clinicName: { type: String, default: "Smart Clinic" },
    address: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    operatingHours: { type: String, default: "" },

    autoQueueOptimization: { type: Boolean, default: false },
    tokenPrefixes: {
      general: { type: String, default: "GEN" },
      emergency: { type: String, default: "EMG" }
    },
    maxQueueCapacityPerDoctor: { type: Number, default: 100 },

    notificationPrefs: {
      whatsapp: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      notifyWhenAhead: { type: Number, default: 2 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);