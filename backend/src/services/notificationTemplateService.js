/**
 * Centralized Notification Template Service
 * Produces standardized titles, messages, action URLs, and categories
 */
export const notificationTemplateService = {
  getTemplate(type, payload = {}) {
    const p = payload;
    switch (type) {
      // Order events
      case 'order_created':
        return {
          category: 'order',
          title: `New Order Created (${p.orderNumber || 'N/A'})`,
          message: `Order for ${p.companyName || 'client'} from ${p.pickupCity || 'origin'} to ${p.deliveryCity || 'destination'} has been booked.`,
          actionUrl: '/orders',
        };
      case 'order_assigned':
        return {
          category: 'dispatch',
          title: `Order Assigned (${p.orderNumber || 'N/A'})`,
          message: `Order has been assigned to driver ${p.driverName || 'assigned driver'}.`,
          actionUrl: '/orders',
        };
      case 'order_accepted':
        return {
          category: 'order',
          title: `Order Accepted by Driver`,
          message: `Driver ${p.driverName || ''} confirmed and accepted order ${p.orderNumber || ''}.`,
          actionUrl: '/orders',
        };
      case 'order_started':
        return {
          category: 'order',
          title: `Trip Started (${p.orderNumber || 'N/A'})`,
          message: `Driver is en route to delivery destination for order ${p.orderNumber || ''}.`,
          actionUrl: '/orders',
        };
      case 'order_completed':
        return {
          category: 'order',
          title: `Order Completed (${p.orderNumber || 'N/A'})`,
          message: `Order ${p.orderNumber || ''} has been delivered successfully.`,
          actionUrl: '/orders',
        };
      case 'order_cancelled':
        return {
          category: 'order',
          title: `Order Cancelled (${p.orderNumber || 'N/A'})`,
          message: `Order ${p.orderNumber || ''} has been cancelled. Reason: ${p.reason || 'Not specified'}.`,
          actionUrl: '/orders',
        };
      case 'order_duplicate_warning':
        return {
          category: 'order',
          title: `Possible Duplicate Order Flagged`,
          message: `Order ${p.orderNumber || ''} has matching routes and dates with an existing booking.`,
          actionUrl: '/orders',
        };

      // Driver events
      case 'driver_availability':
        return {
          category: 'driver',
          title: `Driver Status Changed`,
          message: `Driver ${p.driverName || ''} is now ${p.status || 'available'}.`,
          actionUrl: '/fleet',
        };

      // Billing events
      case 'invoice_created':
        return {
          category: 'billing',
          title: `Draft Invoice Created (${p.invoiceNumber || 'N/A'})`,
          message: `Invoice for ${p.companyName || 'client'} totalling ₹${p.amount || 0} is saved as draft.`,
          actionUrl: '/billing',
        };
      case 'invoice_issued':
        return {
          category: 'billing',
          title: `Invoice Issued (${p.invoiceNumber || 'N/A'})`,
          message: `Invoice for ₹${p.amount || 0} has been officially issued to ${p.companyName || 'client'}.`,
          actionUrl: '/billing',
        };
      case 'payment_recorded':
        return {
          category: 'billing',
          title: `Payment Received (₹${p.amount || 0})`,
          message: `Payment of ₹${p.amount || 0} recorded for invoice ${p.invoiceNumber || ''} via ${p.method || 'cash'}.`,
          actionUrl: '/billing',
        };
      case 'payment_completed':
        return {
          category: 'billing',
          title: `Invoice Fully Settled (${p.invoiceNumber || 'N/A'})`,
          message: `Invoice ${p.invoiceNumber || ''} has been paid in full. Balance is ₹0.`,
          actionUrl: '/billing',
        };

      // Company events
      case 'company_invited':
        return {
          category: 'company',
          title: `Company User Invited`,
          message: `${p.email || 'User'} was invited to join ${p.companyName || 'the company'}.`,
          actionUrl: '/companies',
        };
      case 'company_invite_accepted':
        return {
          category: 'company',
          title: `Invitation Accepted`,
          message: `${p.name || 'User'} has accepted the invite and activated their account.`,
          actionUrl: '/companies',
        };

      // Default system
      default:
        return {
          category: 'system',
          title: p.title || 'System Notification',
          message: p.message || 'Notification received.',
          actionUrl: p.actionUrl || '/',
        };
    }
  },
};
