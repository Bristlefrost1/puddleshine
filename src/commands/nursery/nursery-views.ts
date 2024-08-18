function buildNurseryStatusView(options: {
	displayName: string;

	season: string;

	foodPoints: number;
	nextFoodPointPercetage?: number;
}) {
	return `\`\`\`
${options.displayName}'s nursery [${options.season}]
Food Meter: ${options.foodPoints} (${options.nextFoodPointPercetage !== undefined ? options.nextFoodPointPercetage.toFixed(1) + '%' : 'Full'})

You have no alerts.

You don't have any kits. Try /nursery breed to get some!
\`\`\`
`;
}

export { buildNurseryStatusView };
