import type { Tool } from "ai";
import { seedCustomerFiles } from "./context-seeder.js";
import { createTieredBashTool } from "./tool-factory.js";
import type { BashToolResult, CustomerContext } from "./types.js";
import { BashToolConfig } from "./types.js";

/**
 * Create an AI SDK bash tool configured for a specific customer.
 *
 * This is the highest-level entry point: pass a customer context
 * and get back a ready-to-use AI SDK tool.
 *
 * The customer's tier determines:
 * - Filesystem isolation (inmemory, overlay, readwrite)
 * - Execution limits (commands, loops, call depth)
 * - Network access (none, standard, full)
 *
 * @example
 * ```ts
 * import { createCustomerBashTool } from "@clawdbot-ready/sandbox/ai";
 *
 * const bashTool = createCustomerBashTool({
 *   customerId: "cust_123",
 *   tier: "overlay",
 * });
 * ```
 */
export function createCustomerBashTool(
	customer: CustomerContext,
): Tool<{ command: string }, BashToolResult> {
	// Build base config from customer context
	const baseConfig: Partial<BashToolConfig> = {
		tier: customer.tier,
		rootPath: customer.rootPath,
		networkPresets: customer.networkOverrides ?? [],
	};

	// Parse and validate the config (applies defaults)
	const config = BashToolConfig.parse(baseConfig);

	// Override the pre-seeded files with customer-specific files
	const customerFiles = seedCustomerFiles(config, customer);
	const finalConfig: BashToolConfig = {
		...config,
		preSeededFiles: customerFiles as Record<string, string>,
	};

	return createTieredBashTool(finalConfig);
}
