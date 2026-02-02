import { Request, Response } from 'express';
import { getEquityReport } from './equity.service.js';
// AuthenticatedRequest is handled via global Express.Request extension


export class EquityController {
    /**
     * GET /api/equity
     * Get equity report for the current company
     */
    static async getReport(req: Request, res: Response) {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            }

            // Only OWNER and PARTNER can view equity
            if (!['OWNER', 'PARTNER'].includes(user.role)) {
                return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
            }

            const report = await getEquityReport(user.companyId);

            return res.json({
                success: true,
                data: report
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: {
                    message: error.message || 'Failed to get equity report'
                }
            });
        }
    }
}
