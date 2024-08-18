/**
 * command-registry.ts
 *
 * This is the command registry where all of the commands should be added.
 * All commands must be added to both `commands` and `applicationCommandData`.
 */

import AdminCommand from './admin/admin.js';
import CatchaCommand from './catcha/catcha.js';
import NameCommand from './name/name.js';
import ProfileCommand from './profile/profile.js';
import NurseryCommand from './nursery/nursery.js';

/**
 * Command name -> command object mapping object.
 *
 * Used by the interaction handler to determine which command should handle
 * a given interaction.
 */
const commands = {
	[AdminCommand.name]: AdminCommand,
	[CatchaCommand.name]: CatchaCommand,
	[NameCommand.name]: NameCommand,
	[ProfileCommand.name]: ProfileCommand,
	[NurseryCommand.name]: NurseryCommand,
};

export { commands };
