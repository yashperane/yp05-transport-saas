import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';

/**
 * GET /api/companies
 * List companies belonging to the authenticated transport business with search, status filter, and pagination.
 */
export const getCompanies = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { search, status, page = 1, limit = 10 } = req.query;

    const query = { transportBusinessId };

    if (status && ['active', 'inactive', 'blocked'].includes(status)) {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { companyName: { $regex: search.trim(), $options: 'i' } },
        { contactPerson: { $regex: search.trim(), $options: 'i' } },
        { companyCode: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Company.countDocuments(query),
    ]);

    // Attach user count and order count to each company
    const companyIds = companies.map((c) => c._id);
    const [userCounts, orderCounts] = await Promise.all([
      User.aggregate([
        { $match: { companyId: { $in: companyIds } } },
        { $group: { _id: '$companyId', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { companyId: { $in: companyIds } } },
        { $group: { _id: '$companyId', count: { $sum: 1 } } },
      ]),
    ]);

    const userCountMap = Object.fromEntries(userCounts.map((u) => [u._id.toString(), u.count]));
    const orderCountMap = Object.fromEntries(orderCounts.map((o) => [o._id.toString(), o.count]));

    const enriched = companies.map((c) => ({
      ...c,
      userCount: userCountMap[c._id.toString()] || 0,
      orderCount: orderCountMap[c._id.toString()] || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        companies: enriched,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('getCompanies error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve companies.' },
    });
  }
};

/**
 * POST /api/companies
 * Create a new company under the authenticated transport business.
 */
export const createCompany = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const {
      companyName,
      companyCode,
      contactPerson,
      phone,
      email,
      address,
      billingAddress,
      notes,
      settings,
    } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Company name is required.' },
      });
    }

    if (!contactPerson || !contactPerson.trim() || !phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Contact person and phone are required.' },
      });
    }

    // Auto-generate company code if not provided
    let finalCode = (companyCode || '').trim().toUpperCase();
    if (!finalCode) {
      const prefix = companyName.trim().slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'CO');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      finalCode = `${prefix}-${randomSuffix}`;
    }

    // Check duplicate name within this transport business
    const existing = await Company.findOne({
      transportBusinessId,
      companyName: { $regex: `^${companyName.trim()}$`, $options: 'i' },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_COMPANY', message: 'A company with this name already exists in your account.' },
      });
    }

    const company = await Company.create({
      transportBusinessId,
      companyName: companyName.trim(),
      companyCode: finalCode,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      address: address ? address.trim() : undefined,
      billingAddress: billingAddress ? billingAddress.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      status: 'active',
      settings: settings || {},
    });

    return res.status(201).json({
      success: true,
      message: 'Company registered successfully.',
      data: { company },
    });
  } catch (error) {
    console.error('createCompany error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create company.' },
    });
  }
};

/**
 * GET /api/companies/:id
 * Retrieve single company details with tenant isolation.
 */
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    // Company users can only access their own company
    if (['company_admin', 'company_employee'].includes(req.user.role)) {
      if (req.user.companyId?.toString() !== id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to view another company.' },
        });
      }
    }

    const company = await Company.findOne({ _id: id, transportBusinessId }).lean();
    if (!company) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Company not found or does not belong to your account.' },
      });
    }

    // Aggregate stats
    const [userCount, orderCount, recentOrders] = await Promise.all([
      User.countDocuments({ companyId: id }),
      Order.countDocuments({ companyId: id }),
      Order.find({ companyId: id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        company: {
          ...company,
          userCount,
          orderCount,
          recentOrders,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve company details.' },
    });
  }
};

/**
 * PATCH /api/companies/:id
 * Update company information (Owner only).
 */
export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    const company = await Company.findOne({ _id: id, transportBusinessId });
    if (!company) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Company not found.' },
      });
    }

    const {
      companyName,
      companyCode,
      contactPerson,
      phone,
      email,
      address,
      billingAddress,
      notes,
      settings,
    } = req.body;

    if (companyName) company.companyName = companyName.trim();
    if (companyCode) company.companyCode = companyCode.trim().toUpperCase();
    if (contactPerson) company.contactPerson = contactPerson.trim();
    if (phone) company.phone = phone.trim();
    if (email !== undefined) company.email = email.trim().toLowerCase();
    if (address !== undefined) company.address = address.trim();
    if (billingAddress !== undefined) company.billingAddress = billingAddress.trim();
    if (notes !== undefined) company.notes = notes.trim();
    if (settings) company.settings = { ...company.settings, ...settings };

    await company.save();

    return res.status(200).json({
      success: true,
      message: 'Company updated successfully.',
      data: { company },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update company.' },
    });
  }
};

/**
 * PATCH /api/companies/:id/status
 * Activate or deactivate company (Owner only).
 */
export const updateCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const transportBusinessId = req.user.transportBusinessId;

    if (!['active', 'inactive', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: "Status must be 'active', 'inactive', or 'blocked'." },
      });
    }

    const company = await Company.findOneAndUpdate(
      { _id: id, transportBusinessId },
      { status },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Company not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Company status changed to ${status}.`,
      data: { company },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update company status.' },
    });
  }
};

/**
 * GET /api/companies/:id/summary
 * Workspace summary endpoint for Company Dashboard.
 */
export const getCompanySummary = async (req, res) => {
  try {
    const { id } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    // Validate access
    if (['company_admin', 'company_employee'].includes(req.user.role)) {
      if (req.user.companyId?.toString() !== id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied to this company workspace.' },
        });
      }
    }

    const company = await Company.findOne({ _id: id, transportBusinessId }).lean();
    if (!company) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Company not found.' },
      });
    }

    // Orders status counts
    const statusCounts = await Order.aggregate([
      { $match: { companyId: company._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const countsMap = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));

    const [userCount, recentOrders] = await Promise.all([
      User.countDocuments({ companyId: id }),
      Order.find({ companyId: id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const totalOrders = Object.values(countsMap).reduce((a, b) => a + b, 0);

    return res.status(200).json({
      success: true,
      data: {
        company: {
          id: company._id,
          name: company.companyName,
          code: company.companyCode,
          status: company.status,
          contactPerson: company.contactPerson,
        },
        metrics: {
          totalOrders,
          pending: countsMap['pending'] || 0,
          assigned: countsMap['assigned'] || 0,
          inProgress: countsMap['in_progress'] || 0,
          completed: countsMap['completed'] || 0,
          cancelled: countsMap['cancelled'] || 0,
          totalUsers: userCount,
        },
        recentOrders,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve company summary.' },
    });
  }
};
