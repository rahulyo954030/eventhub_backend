/* eslint-disable no-console */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/database');
const User = require('../models/User');
const Event = require('../models/Event');
const StaffInvite = require('../models/StaffInvite');

const migrate = async () => {
  await connectDB();

  const users = await User.find({});
  let usersUpdated = 0;

  for (const user of users) {
    if (user.workspaceId) continue;

    if (user.role === 'Admin') {
      user.workspaceId = user._id;
      await user.save();
      usersUpdated++;
      continue;
    }

    const invite = await StaffInvite.findOne({
      $or: [{ acceptedBy: user._id }, { email: user.email, status: 'accepted' }],
    }).sort({ acceptedAt: -1 });

    if (invite?.workspaceId) {
      user.workspaceId = invite.workspaceId;
    } else if (invite?.invitedBy) {
      const inviter = await User.findById(invite.invitedBy);
      user.workspaceId = inviter?.workspaceId || inviter?._id;
    } else {
      const fallbackAdmin = await User.findOne({ role: 'Admin' }).sort({ createdAt: 1 });
      user.workspaceId = fallbackAdmin?.workspaceId || fallbackAdmin?._id || user._id;
      console.warn(`Staff ${user.email} assigned to fallback workspace ${user.workspaceId}`);
    }

    await user.save();
    usersUpdated++;
  }

  const events = await Event.find({ workspaceId: { $exists: false } });
  let eventsUpdated = 0;

  for (const event of events) {
    const creator = await User.findById(event.createdBy);
    event.workspaceId = creator?.workspaceId || creator?._id;
    if (event.workspaceId) {
      await event.save();
      eventsUpdated++;
    }
  }

  const invites = await StaffInvite.find({ workspaceId: { $exists: false } });
  let invitesUpdated = 0;

  for (const invite of invites) {
    const inviter = await User.findById(invite.invitedBy);
    invite.workspaceId = inviter?.workspaceId || inviter?._id;
    if (invite.workspaceId) {
      await invite.save();
      invitesUpdated++;
    }
  }

  console.log(`Migration complete: ${usersUpdated} users, ${eventsUpdated} events, ${invitesUpdated} invites updated`);
  process.exit(0);
};

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
