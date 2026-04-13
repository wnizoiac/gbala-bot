export function formatErrorMessage(message: string): string {
  return `Erro: ${message}`;
}

export function formatSuccessMessage(message: string): string {
  return `OK: ${message}`;
}

export function formatInfoMessage(message: string): string {
  return `Info: ${message}`;
}

export function createEphemeralError(message: string): {
  content: string;
  ephemeral: true;
} {
  return {
    content: formatErrorMessage(message),
    ephemeral: true
  };
}
