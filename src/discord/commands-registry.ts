import { agoraCommand } from './commands/agora';
import { catalogoCommand } from './commands/catalogo';
import { embaralharCommand } from './commands/embaralhar';
import { filaCommand } from './commands/fila';
import { historicoCommand } from './commands/historico';
import { moverCommand } from './commands/mover';
import { pararCommand } from './commands/parar';
import { pausarCommand } from './commands/pausar';
import { pingCommand } from './commands/ping';
import { pularCommand } from './commands/pular';
import { removerCommand } from './commands/remover';
import { repetirCommand } from './commands/repetir';
import { retomarCommand } from './commands/retomar';
import { sairCommand } from './commands/sair';
import { statusCommand } from './commands/status';
import { tocarCommand } from './commands/tocar';
import { volumeCommand } from './commands/volume';
import type { SlashCommand } from './types';

export const slashCommands: SlashCommand[] = [
	agoraCommand,
	catalogoCommand,
	embaralharCommand,
	filaCommand,
	historicoCommand,
	moverCommand,
	pararCommand,
	pausarCommand,
	pingCommand,
	pularCommand,
	removerCommand,
	repetirCommand,
	retomarCommand,
	sairCommand,
	statusCommand,
	tocarCommand,
	volumeCommand
];
