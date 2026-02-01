import express from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly);

// Get all users
router.get('/', async (req, res, next) => {
  try {
    const users = await User.find().select('-password -refreshToken');
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', async (req, res, next) => {
  try {
    const { email, password, profile, userType } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const user = await User.create({ email, password, profile, userType });
    res.status(201).json({ success: true, data: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    Object.assign(user, updateData);
    if (password) user.password = password;
    
    await user.save();
    res.json({ success: true, data: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
