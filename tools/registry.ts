import { AuthInfo } from '@/lib/types';
import { echoTool } from './echo';
import { rollDiceTool } from './roll-dice';
import { waitTool } from './wait';
import { genericNotifierDemoTool } from './generic-notifier-demo';
import { adminInfoTool } from './admin-info';
import { githubUserInfoTool } from './github-user-info';

/**
 * Tool definition interface
 */
export interface ToolDefinition {
  name: string;
  description: string;
  schema: any;
  handler: (args: any, authInfo: AuthInfo) => Promise<any>;
}

/**
 * Registry of all available tools
 */
export const toolRegistry: ToolDefinition[] = [
  echoTool,
  rollDiceTool,
  waitTool,
  genericNotifierDemoTool,
  adminInfoTool,
  githubUserInfoTool,
];

/**
 * Get a tool by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.find(tool => tool.name === name);
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return toolRegistry.map(tool => tool.name);
}

/**
 * Get tools by category (if we add categories in the future)
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  // For now, all tools are in the same category
  // In the future, we can add a category field to ToolDefinition
  return toolRegistry;
}
