import { repo } from '../storage/repository.js';
import { getStorageMode } from '../storage/dbAdapter.js';
import { ROLES, ALLOCATION_STATUS, ASSIGNMENT_STATUS } from '../config/constants.js';
import { hashPassword } from '../utils/passwordService.js';

/**
 * Admin Controller for Platform Compliance, NGO Verification, and System Monitoring.
 */

// GET /api/admin/overview
export async function getOverview(req, res, next) {
  try {
    const ngoProfiles = await repo.ngoProfiles.find({});
    const donations = await repo.donations.find({});
    const allocations = await repo.allocations.find({});
    const assignments = await repo.assignments.find({});
    const users = await repo.users.count();

    const pendingNgos = ngoProfiles.filter(p => !p.isApprovedByAdmin);
    const verifiedNgos = ngoProfiles.filter(p => p.isApprovedByAdmin);

    const activeAllocations = allocations.filter(a =>
      a.status === ALLOCATION_STATUS.PENDING_NGO || a.status === ALLOCATION_STATUS.CONFIRMED
    );
    const declinedAllocations = allocations.filter(a => a.status === ALLOCATION_STATUS.DECLINED);
    const expiredAllocations = allocations.filter(a => a.status === ALLOCATION_STATUS.EXPIRED);

    const activeAssignments = assignments.filter(a =>
      a.status !== ASSIGNMENT_STATUS.DELIVERED && a.status !== ASSIGNMENT_STATUS.CANCELLED
    );

    // Stalled assignments (active for more than 45 minutes)
    const now = Date.now();
    const stalledAssignments = activeAssignments.filter(a => {
      const createdTime = new Date(a.createdAt).getTime();
      return (now - createdTime) > 45 * 60 * 1000;
    });

    const totalRescuedServings = allocations
      .filter(a => a.status === ALLOCATION_STATUS.COMPLETED || a.status === ALLOCATION_STATUS.CONFIRMED)
      .reduce((sum, a) => sum + (a.allocatedServings || 0), 0);

    const storageInfo = getStorageMode();

    res.json({
      systemHealth: {
        status: 'HEALTHY',
        uptimeSeconds: Math.round(process.uptime()),
        storage: storageInfo,
        serverTime: new Date().toISOString()
      },
      ngos: {
        total: ngoProfiles.length,
        verified: verifiedNgos.length,
        pending: pendingNgos.length
      },
      donations: {
        total: donations.length,
        active: donations.filter(d => d.status === 'active' || d.status === 'allocated').length,
        totalRescuedServings
      },
      allocations: {
        total: allocations.length,
        active: activeAllocations.length,
        declined: declinedAllocations.length,
        expired: expiredAllocations.length
      },
      assignments: {
        total: assignments.length,
        active: activeAssignments.length,
        stalled: stalledAssignments.length
      },
      totalRegisteredAccounts: users
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/verification-queue
export async function getVerificationQueue(req, res, next) {
  try {
    const ngoProfiles = await repo.ngoProfiles.find({});
    
    // Attach user profile information to each NGO profile
    const enrichedList = await Promise.all(ngoProfiles.map(async (p) => {
      const u = await repo.users.findById(p.userId);
      return {
        ...p,
        user: u ? {
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          address: u.address,
          createdAt: u.createdAt
        } : null
      };
    }));

    res.json({
      queue: enrichedList,
      pendingCount: enrichedList.filter(p => !p.isApprovedByAdmin).length
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/ngos/:id/approve
export async function approveNgo(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    let profile = await repo.ngoProfiles.findOne({ _id: id });
    if (!profile) {
      profile = await repo.ngoProfiles.findOne({ userId: id });
    }

    if (!profile) {
      return res.status(404).json({ error: 'NGO profile not found.' });
    }

    await repo.ngoProfiles.updateOne(
      { _id: profile._id || profile.id },
      {
        $set: {
          isApprovedByAdmin: true,
          verificationNotes: notes || `Approved by Compliance Admin on ${new Date().toLocaleDateString()}`
        }
      }
    );

    if (profile.userId) {
      await repo.users.updateOne(
        { _id: profile.userId },
        { $set: { isVerified: true } }
      );
    }

    const updated = await repo.ngoProfiles.findOne({ _id: profile._id || profile.id });

    res.json({
      success: true,
      message: `NGO '${updated.organizationName}' verified and approved for algorithmic matching.`,
      profile: updated
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/ngos/:id/reject
export async function rejectNgo(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    let profile = await repo.ngoProfiles.findOne({ _id: id });
    if (!profile) {
      profile = await repo.ngoProfiles.findOne({ userId: id });
    }

    if (!profile) {
      return res.status(404).json({ error: 'NGO profile not found.' });
    }

    const rejectionReason = reason || 'Verification documents did not meet platform safety and compliance criteria.';

    await repo.ngoProfiles.updateOne(
      { _id: profile._id || profile.id },
      {
        $set: {
          isApprovedByAdmin: false,
          verificationNotes: `REJECTED: ${rejectionReason} (Audited on ${new Date().toLocaleDateString()})`
        }
      }
    );

    const updated = await repo.ngoProfiles.findOne({ _id: profile._id || profile.id });

    res.json({
      success: true,
      message: `NGO '${updated.organizationName}' verification rejected.`,
      profile: updated
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/bootstrap
export async function bootstrapAdmin(req, res, next) {
  try {
    const { secret, email, password, fullName } = req.body;
    const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET || 'FoodBridgeAdminSecret2026!';

    if (!secret || secret !== expectedSecret) {
      return res.status(403).json({ error: 'Invalid admin bootstrap authorization secret.' });
    }

    const adminEmail = email || 'admin@foodbridge.demo';
    const existing = await repo.users.findOne({ email: adminEmail });

    if (existing) {
      await repo.users.updateOne(
        { _id: existing._id || existing.id },
        { $set: { role: ROLES.ADMIN, isVerified: true } }
      );
      return res.json({
        success: true,
        message: `Existing account '${adminEmail}' granted Platform Administrator privileges.`
      });
    }

    const passwordHash = await hashPassword(password || 'DemoPassword2026!');
    const newAdmin = await repo.users.create({
      email: adminEmail,
      passwordHash,
      role: ROLES.ADMIN,
      fullName: fullName || 'FoodBridge Compliance Administrator',
      phone: '+91 98000 11111',
      isVerified: true,
      isDemo: true
    });

    res.status(201).json({
      success: true,
      message: 'New platform administrator successfully bootstrapped.',
      adminId: newAdmin._id || newAdmin.id,
      email: adminEmail
    });
  } catch (err) {
    next(err);
  }
}
