import { Request, Response, NextFunction } from 'express';
import { ContactInquiry } from '../../models/ContactInquiry';

/**
 * Submit a new Contact Us message / enquiry from the public/user portal
 * POST /api/v1/contact
 */
export const submitContactInquiry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      title,
      customTitle,
      firstName,
      surname,
      email,
      country,
      category,
      subject,
      message,
    } = req.body;

    if (!firstName || !surname || !email || !message) {
      res.status(400).json({
        success: false,
        message: 'First name, surname, email and message are required.',
      });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const effectiveTitle = title === 'Other' && customTitle ? customTitle.trim() : (title || '');
    const titlePart = effectiveTitle && effectiveTitle !== 'Select title' ? `${effectiveTitle} ` : '';
    const sender = `${titlePart}${String(firstName).trim()} ${String(surname).trim()}`.trim();

    // Generate unique Ticket ID
    const randomTicketNumber = Math.floor(10000 + Math.random() * 90000);
    const ticketId = `ENQ-${randomTicketNumber}`;

    const inquiry = await ContactInquiry.create({
      ticketId,
      title: effectiveTitle,
      customTitle: customTitle || '',
      firstName: String(firstName).trim(),
      surname: String(surname).trim(),
      sender,
      email: normalizedEmail,
      country: country || 'Nigeria',
      category: category || 'General Enquiry',
      subject: subject || 'General Enquiry',
      message: String(message).trim(),
      content: String(message).trim(),
      status: 'New',
      responseEmail: normalizedEmail,
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been received. Our care team will contact you shortly.',
      ticketId: inquiry.ticketId,
      inquiry: {
        id: inquiry.ticketId,
        ticketId: inquiry.ticketId,
        sender: inquiry.sender,
        email: inquiry.email,
        createdAt: inquiry.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
