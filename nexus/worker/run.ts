import { NexusGatewayWorker } from './gateway';

const worker = new NexusGatewayWorker();
worker.start();
console.log('[NEXUS] Discord Gateway worker started.');

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
