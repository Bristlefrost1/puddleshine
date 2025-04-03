import * as DAPI from 'discord-api-types/v10'

/**
 * Find an action row that has a component with the given custom ID from message components.
 * 
 * @param components The message components.
 * @param customIdStartsWith The custom ID to search for.
 * @returns The action row and its index if found, undefined if not.
 */
export function findActionRowWithComponentCustomId(
	components: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>[],
	customIdStartsWith: string
): {
	actionRow: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent>
	actionRowIndex: number
} | undefined {
	let actionRow: DAPI.APIActionRowComponent<DAPI.APIMessageActionRowComponent> | undefined
	let actionRowIndex: number | undefined

	for (let i = 0; i < components.length; i++) {
		const actionRowComponent = components[i]

		for (const component of actionRowComponent.components) {
			const customId = (component as any).custom_id as string | undefined

			if (customId === undefined) continue

			if (customId.startsWith(customIdStartsWith)) {
				actionRow = actionRowComponent
				actionRowIndex = i
				
				return { actionRow, actionRowIndex }
			}
		}
	}

	return undefined
}
