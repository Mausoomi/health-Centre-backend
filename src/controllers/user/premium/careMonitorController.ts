import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import CareMonitor from '../../../models/premium/CareMonitor';

/**
 * Format monitor object with computed fields for UI
 */
function formatMonitorResponse(monitor: any) {
  const obj = monitor.toObject ? monitor.toObject() : monitor;
  const readings = obj.readings || [];
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  let latestValue = '--';
  let statusNote = 'No readings logged yet';

  if (latest) {
    latestValue = latest.value;
    const dateStr = new Date(latest.recordedAt).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    statusNote = `Latest reading · ${dateStr}`;
  }

  return {
    ...obj,
    id: obj._id,
    latestValue,
    statusNote,
    rangeStatus: obj.enableThreshold ? 'Threshold set' : 'Active tracking',
    subNote: latest?.note || (obj.enableThreshold ? `Threshold: ${obj.thresholdValue || 'Configured'}` : 'Manual entry'),
  };
}

function extractUserId(req: AuthenticatedRequest): string | undefined {
  return req.user?.userId || req.user?.id || req.user?._id;
}

/**
 * GET /api/v1/user/premium/care-monitor
 * Fetch all monitors for logged in user
 */
export async function getMonitors(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const monitors = await CareMonitor.find({ userId, status: 'active' }).sort({ updatedAt: -1 });
    const formatted = monitors.map(formatMonitorResponse);
    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Error fetching care monitors:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching care monitors' });
  }
}

/**
 * POST /api/v1/user/premium/care-monitor
 * Create a new care monitor
 */
export async function createMonitor(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      name,
      category = 'Standard',
      icon = 'lucide:activity',
      unit = '',
      description = '',
      measuredWhat = '',
      enableThreshold = false,
      thresholdType = '',
      thresholdValue = '',
      initialValue = '',
      initialNote = '',
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Monitor name is required' });
    }

    const initialReadings = initialValue && String(initialValue).trim()
      ? [
          {
            value: String(initialValue).trim(),
            note: initialNote && String(initialNote).trim() ? String(initialNote).trim() : 'Initial reading',
            recordedAt: new Date(),
            isPrimary: true,
          },
        ]
      : [];

    const monitor = new CareMonitor({
      userId,
      name,
      category,
      icon,
      unit,
      description,
      measuredWhat,
      enableThreshold,
      thresholdType,
      thresholdValue,
      readings: initialReadings,
    });

    await monitor.save();
    return res.status(201).json({ success: true, data: formatMonitorResponse(monitor) });
  } catch (error: any) {
    console.error('Error creating care monitor:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating care monitor' });
  }
}

/**
 * GET /api/v1/user/premium/care-monitor/:id
 * Fetch single care monitor by ID
 */
export async function getMonitorById(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const monitor = await CareMonitor.findOne({ _id: id, userId });
    if (!monitor) {
      return res.status(404).json({ success: false, message: 'Care monitor not found' });
    }

    return res.json({ success: true, data: formatMonitorResponse(monitor) });
  } catch (error: any) {
    console.error('Error fetching care monitor by ID:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching care monitor' });
  }
}

/**
 * PUT /api/v1/user/premium/care-monitor/:id
 * Update monitor settings
 */
export async function updateMonitor(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;
    const { name, unit, enableThreshold, thresholdType, thresholdValue, description } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const monitor = await CareMonitor.findOne({ _id: id, userId });
    if (!monitor) {
      return res.status(404).json({ success: false, message: 'Care monitor not found' });
    }

    if (name !== undefined) monitor.name = name;
    if (unit !== undefined) monitor.unit = unit;
    if (enableThreshold !== undefined) monitor.enableThreshold = enableThreshold;
    if (thresholdType !== undefined) monitor.thresholdType = thresholdType;
    if (thresholdValue !== undefined) monitor.thresholdValue = thresholdValue;
    if (description !== undefined) monitor.description = description;

    await monitor.save();
    return res.json({ success: true, data: formatMonitorResponse(monitor) });
  } catch (error: any) {
    console.error('Error updating care monitor:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error updating care monitor' });
  }
}

/**
 * POST /api/v1/user/premium/care-monitor/:id/readings
 * Add a reading to a monitor
 */
export async function addReading(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;
    const { value, note = '', recordedAt = new Date() } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!value) {
      return res.status(400).json({ success: false, message: 'Reading value is required' });
    }

    const monitor = await CareMonitor.findOne({ _id: id, userId });
    if (!monitor) {
      return res.status(404).json({ success: false, message: 'Care monitor not found' });
    }

    monitor.readings.push({
      value: String(value).trim(),
      note: String(note).trim(),
      recordedAt: new Date(recordedAt),
      isPrimary: true,
    });

    await monitor.save();
    return res.status(201).json({ success: true, data: formatMonitorResponse(monitor) });
  } catch (error: any) {
    console.error('Error adding reading to care monitor:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error adding reading' });
  }
}

/**
 * DELETE /api/v1/user/premium/care-monitor/:id
 * Delete monitor
 */
export async function deleteMonitor(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const monitor = await CareMonitor.findOneAndDelete({ _id: id, userId });
    if (!monitor) {
      return res.status(404).json({ success: false, message: 'Care monitor not found' });
    }

    return res.json({ success: true, message: 'Care monitor deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting care monitor:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error deleting care monitor' });
  }
}
