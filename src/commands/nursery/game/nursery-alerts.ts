import { type Nursery } from './nursery-manager.js'

import * as config from '@/config'

export enum NurseryAlertType {
	Promote = 'Promote',
	KitDied = 'KitDied',
	Sick = 'Sick',
	Wandering = 'Wandering',
	Other = 'Other',
}

export type NurseryAlert = {
	type: NurseryAlertType
	timestamp: number // Unix timestamp
	kitUuid?: string
	alert: string
}

export function addNewAlertToNursery(nursery: Nursery, type: NurseryAlertType, alert: string, date?: Date, kitUuid?: string) {
	const alertTimestamp = Math.floor((date?.getTime() ?? new Date().getTime()) / 1000)

	const newAlert: NurseryAlert = {
		type,
		timestamp: alertTimestamp,
		kitUuid,
		alert,
	}

	nursery.alerts.push(newAlert)
	nursery.alerts.sort((a, b) => b.timestamp - a.timestamp)
	nursery.alerts = nursery.alerts.slice(undefined, config.NURSERY_MAX_ALERTS)
}

export function addNewAlertToAlerts(
	alerts: NurseryAlert[],
	type: NurseryAlertType,
	alert: string,
	date?: Date,
	kitUuid?: string,
) {
	const alertTimestamp = Math.floor((date?.getTime() ?? new Date().getTime()) / 1000)

	const newAlert: NurseryAlert = {
		type,
		timestamp: alertTimestamp,
		kitUuid,
		alert,
	}

	alerts.push(newAlert)
	alerts.sort((a, b) => b.timestamp - a.timestamp)
	alerts = alerts.slice(undefined, config.NURSERY_MAX_ALERTS)
}

export function findPromotionAlert(alerts: NurseryAlert[], kitUuid: string) {
	for (const alert of alerts) {
		if (alert.type === NurseryAlertType.Promote && alert.kitUuid === kitUuid) {
			return alert
		}
	}
}
