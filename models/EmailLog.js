const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    attendeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendee',
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    emailType: {
      type: String,
      enum: ['invitation', 'registration_confirmation', 'reminder', 'thank_you'],
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

emailLogSchema.index({ eventId: 1, emailType: 1 });
emailLogSchema.index({ attendeeId: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
