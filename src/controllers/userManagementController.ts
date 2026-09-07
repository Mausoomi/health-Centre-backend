import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, status, sort = '-createdAt', page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 100);

    const query: any = {
      role: {
        $nin: [
          'Admin',
          'SuperAdmin',
          'Global Admin',
          'Operations Admin',
          'Content Admin',
          'Moderation Admin',
          'Facility Admin',
          'Finance Admin',
          'Support Admin',
        ],
      },
    };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { memberId: searchRegex },
            { phone: searchRegex },
          ],
        },
      ];
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .sort(String(sort))
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const formattedUsers = users.map((u) => {
      const id = u.memberId || `HC-${String(u._id).slice(-5).toUpperCase()}`;
      const joinedDate = u.createdAt ? new Date(u.createdAt) : new Date();
      const lastActiveDate = u.lastActive ? new Date(u.lastActive) : joinedDate;

      const formatDate = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
      };

      return {
        _id: String(u._id),
        id,
        memberId: id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        title: u.title || '',
        gender: u.gender || 'Male',
        country: u.country || 'Nigeria',
        status: u.status || 'Active',
        plan: u.plan || 'Free Plan',
        role: u.role || 'EndUser',
        avatar: u.avatar || '',
        joined: formatDate(joinedDate),
        lastActive: formatDate(lastActiveDate),
        verified: u.isVerified !== undefined ? u.isVerified : true,
        adverts: u.advertsCount || 0,
        vouchers: u.vouchersCount || 0,
        payments: u.paymentsCount || 0,
        notes: (u.notes || []).map((n: any) => ({
          id: n.id,
          userId: id,
          note: n.note,
          createdAt: n.createdAt,
          createdBy: n.createdBy,
        })),
      };
    });

    res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const user = await User.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { memberId: id },
      ],
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, phone, title, gender, country, plan, status = 'Active', role = 'EndUser' } = req.body;

    if (!name || !email) {
      res.status(400).json({ message: 'Name and email are required.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ message: 'A user with this email address already exists.' });
      return;
    }

    const randomMemberNum = Math.floor(10000 + Math.random() * 90000);
    const memberId = `HC-${randomMemberNum}`;

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: phone || '',
      title: title || '',
      gender: gender || 'Male',
      country: country || 'Nigeria',
      plan: plan || 'Free Plan',
      status,
      role,
      memberId,
      avatar: '',
      lastActive: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.memberId,
        memberId: user.memberId,
        name: user.name,
        email: user.email,
        status: user.status,
        plan: user.plan,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;

    if (!status || !['Active', 'Watch', 'Suspended', 'Deactivated'].includes(status)) {
      res.status(400).json({ message: 'Valid status is required (Active, Watch, Suspended, Deactivated).' });
      return;
    }

    const isObjectId = mongoose.isValidObjectId(id);
    const user = await User.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { memberId: id },
      ],
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      status: user.status,
      userId: user.memberId || String(user._id),
    });
  } catch (error) {
    next(error);
  }
};

export const addUserNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { note, createdBy = 'Admin' } = req.body;

    if (!note || !note.trim()) {
      res.status(400).json({ message: 'Note text is required.' });
      return;
    }

    const isObjectId = mongoose.isValidObjectId(id);
    const user = await User.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { memberId: id },
      ],
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const newNote = {
      id: `note-${Date.now()}`,
      note: note.trim(),
      createdAt: new Date(),
      createdBy,
    };

    if (!user.notes) {
      user.notes = [];
    }
    user.notes.unshift(newNote);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      note: newNote,
      notes: user.notes,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const user = await User.findOneAndDelete({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { memberId: id },
      ],
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      userId: id,
    });
  } catch (error) {
    next(error);
  }
};
