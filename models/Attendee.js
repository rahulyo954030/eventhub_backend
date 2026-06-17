const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      default: '',
    },
    company: {
      type: String,
      default: '',
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
    },
    qrCodeUrl: {
      type: String,
      default: '',
    },
    registrationToken: {
      type: String,
      required: true,
      unique: true,
    },
    invitationStatus: {
      type: String,
      enum: ['Invited', 'Registered', 'Cancelled'],
      default: 'Invited',
    },
    registrationStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    attendanceStatus: {
      type: String,
      enum: ['not_checked_in', 'checked_in'],
      default: 'not_checked_in',
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

attendeeSchema.index({ eventId: 1, email: 1 }, { unique: true });
attendeeSchema.index({ eventId: 1, fullName: 'text', email: 'text', company: 'text' });

module.exports = mongoose.model('Attendee', attendeeSchema);
