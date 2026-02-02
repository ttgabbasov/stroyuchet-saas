import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../../lib/prisma';

let expo = new Expo();

export class NotificationService {
    /**
     * Send a push notification to a specific user
     */
    static async sendToUser(userId: string, title: string, body: string, data?: any) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { pushToken: true }
        });

        if (!user?.pushToken) {
            console.log(`User ${userId} has no push token registered.`);
            return;
        }

        if (!Expo.isExpoPushToken(user.pushToken)) {
            console.error(`Push token ${user.pushToken} is not a valid Expo push token`);
            return;
        }

        const messages: ExpoPushMessage[] = [{
            to: user.pushToken,
            sound: 'default',
            title,
            body,
            data,
        }];

        try {
            let chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Notification tickets:', ticketChunk);
                // NOTE: In production, you should record ticket IDs to check for errors/receipts later
            }
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    /**
     * Send a push notification to all users in a company
     */
    static async sendToCompany(companyId: string, title: string, body: string, data?: any) {
        const users = await prisma.user.findMany({
            where: {
                companyId,
                pushToken: { not: null }
            },
            select: { id: true, pushToken: true }
        });

        const messages: ExpoPushMessage[] = [];
        for (const user of users) {
            if (Expo.isExpoPushToken(user.pushToken!)) {
                messages.push({
                    to: user.pushToken!,
                    sound: 'default',
                    title,
                    body,
                    data,
                });
            }
        }

        if (messages.length === 0) return;

        try {
            let chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                await expo.sendPushNotificationsAsync(chunk);
            }
        } catch (error) {
            console.error('Error sending company push notifications:', error);
        }
    }
}
