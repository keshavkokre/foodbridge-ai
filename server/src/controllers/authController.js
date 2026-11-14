import { User } from '../models/User.js';
import { DonorProfile } from '../models/DonorProfile.js';
import { NGOProfile } from '../models/NGOProfile.js';
import { VolunteerProfile } from '../models/VolunteerProfile.js';
import { hashPassword, comparePassword } from '../utils/passwordService.js';
import { signToken } from '../utils/tokenService.js';
import { ROLES } from '../config/constants.js';

export async function register(req, res, next) {
  try {
    const { email, password, role, fullName, phone, address, profileData, isDemo } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    const passwordHash = await hashPassword(password);

    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      role,
      fullName,
      phone,
      address: address || {},
      isDemo: Boolean(isDemo)
    });

    await user.save();

    // Create role-specific profile record
    let profile = null;
    if (role === ROLES.DONOR) {
      profile = new DonorProfile({
        userId: user._id,
        orgType: profileData?.orgType || 'restaurant',
        fssaiLicenseNumber: profileData?.fssaiLicenseNumber || null,
        pickupInstructions: profileData?.pickupInstructions || ''
      });
      await profile.save();
    } else if (role === ROLES.NGO) {
      profile = new NGOProfile({
        userId: user._id,
        organizationName: profileData?.organizationName || fullName,
        registrationNumber: profileData?.registrationNumber || 'NGO-PENDING',
        beneficiaryCount: Number(profileData?.beneficiaryCount) || 50,
        dailyReceivingCapacity: Number(profileData?.dailyReceivingCapacity) || 100,
        coldStorageAvailable: Boolean(profileData?.coldStorageAvailable),
        hotHoldingAvailable: Boolean(profileData?.hotHoldingAvailable),
        operatingHours: profileData?.operatingHours || { open: '08:00', close: '21:00' }
      });
      await profile.save();
    } else if (role === ROLES.VOLUNTEER) {
      profile = new VolunteerProfile({
        userId: user._id,
        vehicleType: profileData?.vehicleType || 'two_wheeler',
        maxPayloadKg: Number(profileData?.maxPayloadKg) || 25
      });
      await profile.save();
    }

    const token = signToken({ userId: user._id, role: user.role });

    return res.status(201).json({
      message: 'Account successfully registered.',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
        isDemo: user.isDemo
      },
      profile
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    // Fetch associated profile
    let profile = null;
    if (user.role === ROLES.DONOR) {
      profile = await DonorProfile.findOne({ userId: user._id });
    } else if (user.role === ROLES.NGO) {
      profile = await NGOProfile.findOne({ userId: user._id });
    } else if (user.role === ROLES.VOLUNTEER) {
      profile = await VolunteerProfile.findOne({ userId: user._id });
    }

    const token = signToken({ userId: user._id, role: user.role });

    return res.json({
      message: 'Authentication successful.',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
        isDemo: user.isDemo
      },
      profile
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === ROLES.DONOR) {
      profile = await DonorProfile.findOne({ userId: user._id });
    } else if (user.role === ROLES.NGO) {
      profile = await NGOProfile.findOne({ userId: user._id });
    } else if (user.role === ROLES.VOLUNTEER) {
      profile = await VolunteerProfile.findOne({ userId: user._id });
    }

    return res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
        isDemo: user.isDemo
      },
      profile
    });
  } catch (error) {
    next(error);
  }
}
