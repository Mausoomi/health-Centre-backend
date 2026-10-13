import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import RemoteCarePlan from '../../../models/premium/RemoteCarePlan';

function extractUserId(req: AuthenticatedRequest): string | undefined {
  return req.user?.userId || req.user?.id || req.user?._id;
}

function formatPlanResponse(plan: any) {
  const obj = plan.toObject ? plan.toObject() : plan;
  
  // Format summary text for display
  let notifyText = 'No recipients';
  if (obj.recipients && obj.recipients.length > 0) {
    const names = obj.recipients.map((r: any) => r.name);
    if (names.length === 1) {
      notifyText = `${names[0]} (${obj.recipients[0].relationship || 'Authorised'})`;
    } else {
      notifyText = `${names[0]} + ${names.length - 1} more`;
    }
  }

  let scheduleSummaryText = 'Daily check';
  if (obj.triggerType === 'event') {
    scheduleSummaryText = `When ${obj.eventMonitor || 'CareMonitor'} threshold is reached`;
  } else if (obj.scheduleType === 'selected-days') {
    const dayMap: Record<string, string> = { '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', '0': 'Sun' };
    const daysStr = (obj.selectedDays || []).map((d: string) => dayMap[d] || d).join(', ');
    scheduleSummaryText = `${daysStr || 'Selected days'} at ${obj.scheduleTime || '20:00'}`;
  } else if (obj.scheduleType === 'one-off') {
    scheduleSummaryText = `${obj.scheduleDate || 'One-off'} at ${obj.scheduleTime || '20:00'}`;
  } else {
    scheduleSummaryText = `Every day at ${obj.scheduleTime || '20:00'}`;
  }

  return {
    ...obj,
    id: obj._id,
    notifyText,
    scheduleSummaryText,
    icon: obj.triggerType === 'event' ? 'lucide:heart-pulse' : 'lucide:pill',
  };
}

/**
 * GET /api/v1/user/premium/remote-care
 * Fetch all remote care plans for logged in user
 */
export async function getRemoteCarePlans(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Clean up any previously auto-seeded dummy plans
    await RemoteCarePlan.deleteMany({
      userId,
      $or: [
        { lastTriggered: '14 Jun, 18:20' },
        { lastTriggered: 'Yesterday, 20:00' },
      ],
    });

    const plans = await RemoteCarePlan.find({ userId }).sort({ updatedAt: -1 });
    const formatted = plans.map(formatPlanResponse);
    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Error fetching remote care plans:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * GET /api/v1/user/premium/remote-care/:id
 * Get plan by ID
 */
export async function getRemoteCarePlanById(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;

    const plan = await RemoteCarePlan.findOne({ _id: id, userId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Remote care plan not found' });
    }

    return res.json({ success: true, data: formatPlanResponse(plan) });
  } catch (error: any) {
    console.error('Error fetching remote care plan by ID:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * POST /api/v1/user/premium/remote-care
 * Create new remote care plan
 */
export async function createRemoteCarePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      planName,
      triggerType = 'scheduled',
      scheduleType = 'daily',
      selectedDays = [],
      scheduleDate = '',
      scheduleTime = '20:00',
      eventMonitor = 'Blood Pressure',
      recipients = [],
      selectedAction = 'Call me',
      customActionText = '',
    } = req.body;

    if (!planName) {
      return res.status(400).json({ success: false, message: 'Plan name is required' });
    }

    const newPlan = new RemoteCarePlan({
      userId,
      planName,
      triggerType,
      scheduleType,
      selectedDays,
      scheduleDate,
      scheduleTime,
      eventMonitor,
      recipients: recipients.length > 0 ? recipients : [{ name: 'Mary', relationship: 'Caregiver', method: 'Phone' }],
      selectedAction,
      customActionText,
      status: 'Active',
      lastTriggered: 'Not triggered yet',
      nextTrigger: triggerType === 'event' ? 'Monitored continuously' : `Next check at ${scheduleTime}`,
    });

    await newPlan.save();
    return res.status(201).json({ success: true, data: formatPlanResponse(newPlan), message: 'Support plan created successfully' });
  } catch (error: any) {
    console.error('Error creating remote care plan:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * PUT /api/v1/user/premium/remote-care/:id
 * Update status or details of plan
 */
export async function updateRemoteCarePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;

    const plan = await RemoteCarePlan.findOne({ _id: id, userId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Remote care plan not found' });
    }

    const {
      status,
      planName,
      selectedAction,
      recipients,
      triggerType,
      scheduleType,
      selectedDays,
      scheduleDate,
      scheduleTime,
      eventMonitor,
      customActionText,
    } = req.body;

    if (status !== undefined) plan.status = status;
    if (planName) plan.planName = planName.trim();
    if (selectedAction) plan.selectedAction = selectedAction;
    if (recipients) plan.recipients = recipients;
    if (triggerType) plan.triggerType = triggerType;
    if (scheduleType) plan.scheduleType = scheduleType;
    if (selectedDays) plan.selectedDays = selectedDays;
    if (scheduleDate !== undefined) plan.scheduleDate = scheduleDate;
    if (scheduleTime) plan.scheduleTime = scheduleTime;
    if (eventMonitor) plan.eventMonitor = eventMonitor;
    if (customActionText !== undefined) plan.customActionText = customActionText;

    if (triggerType === 'event') {
      plan.nextTrigger = 'Monitored continuously';
    } else if (scheduleTime) {
      plan.nextTrigger = `Next check at ${scheduleTime}`;
    }

    await plan.save();
    return res.json({ success: true, data: formatPlanResponse(plan), message: 'Plan updated successfully' });
  } catch (error: any) {
    console.error('Error updating remote care plan:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * DELETE /api/v1/user/premium/remote-care/:id
 * Delete plan
 */
export async function deleteRemoteCarePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;

    const plan = await RemoteCarePlan.findOneAndDelete({ _id: id, userId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Remote care plan not found' });
    }

    return res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting remote care plan:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}
