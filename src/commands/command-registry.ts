/*
 * command-registry.ts
 *
 * This is the command registry where all of the commands should be added.
 */

import AdminCommand from './admin/admin'
import CatchaCommand from './catcha/catcha'
import HistoryCommand from './history/history'
import NameCommand from './name/name'
import NurseryCommand from './nursery/nursery'
import ProfileCommand from './profile/profile'
import TradeCommand from './trade/trade-command'

import { type Command } from './command'

/**
 * Command name -> command object mapping.
 *
 * Used by the interaction handler to determine which command should handle
 * a given interaction.
 */
const commands: { [name: string]: Command } = {
	[AdminCommand.name]: AdminCommand,
	[CatchaCommand.name]: CatchaCommand,
	[HistoryCommand.name]: HistoryCommand,
	[NameCommand.name]: NameCommand,
	[NurseryCommand.name]: NurseryCommand,
	[ProfileCommand.name]: ProfileCommand,
	[TradeCommand.name]: TradeCommand,
}

export { commands }
