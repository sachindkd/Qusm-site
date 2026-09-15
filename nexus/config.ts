export type NexusConfig = {
  routineModel: string;
  reasoningModel: string;
  appUrl: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getNexusConfig(): NexusConfig {
  return {
    routineModel: required('NEXUS_AI_ROUTINE_MODEL'),
    reasoningModel: required('NEXUS_AI_REASONING_MODEL'),
    appUrl: required('NEXUS_APP_URL'),
  };
}
