/**
 * AI SDK Bash Tool Integration — creates AI SDK-compatible tools
 * backed by tiered sandboxed Bash environments.
 */

export { seedContextFiles, seedCustomerFiles } from "./context-seeder.js";
export { createCustomerBashTool } from "./customer-tool.js";
export { createBashForConfig, createTieredBashTool } from "./tool-factory.js";
export type { BashToolConfig, BashToolResult, CustomerContext } from "./types.js";
export {
	BashToolConfig as BashToolConfigSchema,
	CustomerContext as CustomerContextSchema,
	DEFAULT_EXECUTION_LIMITS,
} from "./types.js";
