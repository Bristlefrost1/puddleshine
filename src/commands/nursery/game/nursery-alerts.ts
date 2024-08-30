import * as nurseryDB from '#commands/nursery/db/nursery-db.js';

import type { Nursery } from './nursery-manager.js';
import type { D1PrismaClient } from '#db/database.js';

import * as config from '#config.js';

enum NurseryAlertType {
	Promote = 'Promote',
	Other = 'Other',
}

type NurseryAlert = {
	type: NurseryAlertType;
	timestamp: number; // Unix timestamp
	kitUuid?: string;
	alert: string;
};

async function addNewAlertToNursery(
	prisma: D1PrismaClient,
	nursery: Nursery,
	type: NurseryAlertType,
	alert: string,
	date?: Date,
	kitUuid?: string,
) {
	const alertTimestamp = Math.floor((date?.getTime() ?? new Date().getTime()) / 1000);

	const newAlert: NurseryAlert = {
		type,
		timestamp: alertTimestamp,
		kitUuid,
		alert,
	};

	nursery.alerts.push(newAlert);
	nursery.alerts.sort((a, b) => b.timestamp - a.timestamp);
	nursery.alerts = nursery.alerts.slice(undefined, config.NURSERY_MAX_ALERTS);

	await nurseryDB.updateNurseryAlerts(prisma, nursery.uuid, JSON.stringify(nursery.alerts));
}

async function dismissAlerts() {}

export { addNewAlertToNursery, dismissAlerts };
export type { NurseryAlert };
