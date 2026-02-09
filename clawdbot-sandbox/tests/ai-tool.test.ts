import { describe, expect, it } from "vitest";
import {
	type BashToolConfig,
	type BashToolResult,
	BashToolConfigSchema,
	CustomerContextSchema,
	DEFAULT_EXECUTION_LIMITS,
	createBashForConfig,
	createCustomerBashTool,
	createTieredBashTool,
	seedContextFiles,
	seedCustomerFiles,
} from "../src/index.js";

// ─── Context Seeder ──────────────────────────────────────────────

describe("seedContextFiles", () => {
	it("returns default files for a basic config", () => {
		const config = BashToolConfigSchema.parse({ tier: "overlay" });
		const files = seedContextFiles(config);

		expect(files).toHaveProperty("/home/user/.clawdbot/config.json");
		expect(files).toHaveProperty("/home/user/.clawdbot/skills.json");
	});

	it("includes tier in default config.json", () => {
		const config = BashToolConfigSchema.parse({ tier: "inmemory" });
		const files = seedContextFiles(config);
		const configJson = JSON.parse(
			files["/home/user/.clawdbot/config.json"] as string,
		);
		expect(configJson.tier).toBe("inmemory");
		expect(configJson.sandbox).toBe(true);
	});

	it("merges custom pre-seeded files with defaults", () => {
		const config = BashToolConfigSchema.parse({
			tier: "overlay",
			preSeededFiles: { "/data/test.txt": "hello world" },
		});
		const files = seedContextFiles(config);

		expect(files["/data/test.txt"]).toBe("hello world");
		expect(files).toHaveProperty("/home/user/.clawdbot/config.json");
	});

	it("custom files override defaults at same path", () => {
		const config = BashToolConfigSchema.parse({
			tier: "overlay",
			preSeededFiles: {
				"/home/user/.clawdbot/config.json": '{"custom": true}',
			},
		});
		const files = seedContextFiles(config);

		expect(files["/home/user/.clawdbot/config.json"]).toBe('{"custom": true}');
	});
});

describe("seedCustomerFiles", () => {
	it("adds customer.json to seeded files", () => {
		const config = BashToolConfigSchema.parse({ tier: "overlay" });
		const customer = CustomerContextSchema.parse({
			customerId: "cust_123",
			tier: "overlay",
		});
		const files = seedCustomerFiles(config, customer);

		expect(files).toHaveProperty("/home/user/.clawdbot/customer.json");
		const customerJson = JSON.parse(
			files["/home/user/.clawdbot/customer.json"] as string,
		);
		expect(customerJson.customerId).toBe("cust_123");
	});

	it("merges customer context files", () => {
		const config = BashToolConfigSchema.parse({ tier: "overlay" });
		const customer = CustomerContextSchema.parse({
			customerId: "cust_456",
			tier: "overlay",
			contextFiles: { "/data/customer-data.csv": "id,name\n1,Alice" },
		});
		const files = seedCustomerFiles(config, customer);

		expect(files["/data/customer-data.csv"]).toBe("id,name\n1,Alice");
		expect(files).toHaveProperty("/home/user/.clawdbot/config.json");
		expect(files).toHaveProperty("/home/user/.clawdbot/customer.json");
	});
});

// ─── DEFAULT_EXECUTION_LIMITS ────────────────────────────────────

describe("DEFAULT_EXECUTION_LIMITS", () => {
	it("has limits for all three tiers", () => {
		expect(DEFAULT_EXECUTION_LIMITS).toHaveProperty("inmemory");
		expect(DEFAULT_EXECUTION_LIMITS).toHaveProperty("overlay");
		expect(DEFAULT_EXECUTION_LIMITS).toHaveProperty("readwrite");
	});

	it("inmemory has most restrictive limits", () => {
		expect(DEFAULT_EXECUTION_LIMITS.inmemory.maxCommandCount).toBe(1000);
		expect(DEFAULT_EXECUTION_LIMITS.inmemory.maxLoopIterations).toBe(1000);
	});

	it("readwrite has most permissive limits", () => {
		expect(DEFAULT_EXECUTION_LIMITS.readwrite.maxCommandCount).toBe(10000);
		expect(DEFAULT_EXECUTION_LIMITS.readwrite.maxLoopIterations).toBe(10000);
	});

	it("overlay is between inmemory and readwrite", () => {
		expect(DEFAULT_EXECUTION_LIMITS.overlay.maxCommandCount).toBeGreaterThan(
			DEFAULT_EXECUTION_LIMITS.inmemory.maxCommandCount,
		);
		expect(DEFAULT_EXECUTION_LIMITS.overlay.maxCommandCount).toBeLessThan(
			DEFAULT_EXECUTION_LIMITS.readwrite.maxCommandCount,
		);
	});
});

// ─── Bash Instance Creation ──────────────────────────────────────

describe("createBashForConfig", () => {
	it("creates a Bash instance for inmemory tier", () => {
		const config = BashToolConfigSchema.parse({ tier: "inmemory" });
		const bash = createBashForConfig(config);
		expect(bash).toBeDefined();
		expect(bash.fs).toBeDefined();
	});

	it("pre-seeded files are accessible", async () => {
		const config = BashToolConfigSchema.parse({
			tier: "inmemory",
			preSeededFiles: { "/data/hello.txt": "Hello from test" },
		});
		const bash = createBashForConfig(config);
		const result = await bash.exec("cat /data/hello.txt");
		expect(result.stdout).toBe("Hello from test");
		expect(result.exitCode).toBe(0);
	});

	it("default context files are accessible", async () => {
		const config = BashToolConfigSchema.parse({ tier: "overlay" });
		const bash = createBashForConfig(config);
		const result = await bash.exec("cat /home/user/.clawdbot/config.json");
		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.stdout);
		expect(parsed.tier).toBe("overlay");
	});

	it("respects custom env variables", async () => {
		const config = BashToolConfigSchema.parse({
			tier: "inmemory",
			env: { MY_VAR: "test_value" },
		});
		const bash = createBashForConfig(config);
		const result = await bash.exec("echo $MY_VAR");
		expect(result.stdout.trim()).toBe("test_value");
	});
});

// ─── Tool Factory ────────────────────────────────────────────────

describe("createTieredBashTool", () => {
	it("returns a tool with description and inputSchema", () => {
		const config = BashToolConfigSchema.parse({ tier: "inmemory" });
		const bashTool = createTieredBashTool(config);

		expect(bashTool.description).toContain("sandboxed environment");
		expect(bashTool.inputSchema).toBeDefined();
	});

	it("returns a tool with an execute function", () => {
		const config = BashToolConfigSchema.parse({ tier: "inmemory" });
		const bashTool = createTieredBashTool(config);
		expect(bashTool.execute).toBeTypeOf("function");
	});

	it("execute runs commands and returns structured result", async () => {
		const config = BashToolConfigSchema.parse({
			tier: "inmemory",
			preSeededFiles: { "/data/test.json": '{"count": 42}' },
		});
		const bashTool = createTieredBashTool(config);

		const result = (await bashTool.execute!(
			{ command: "cat /data/test.json | jq .count" },
			{ toolCallId: "test-1", messages: [], abortSignal: new AbortController().signal },
		)) as BashToolResult;

		expect(result.stdout.trim()).toBe("42");
		expect(result.exitCode).toBe(0);
		expect(result.tier).toBe("inmemory");
		expect(result.duration).toBeGreaterThanOrEqual(0);
	});

	it("creates tool for each tier", () => {
		for (const tier of ["inmemory", "overlay", "readwrite"] as const) {
			const config = BashToolConfigSchema.parse({ tier });
			const bashTool = createTieredBashTool(config);
			expect(bashTool.execute).toBeTypeOf("function");
		}
	});

	it("execution errors are captured, not thrown", async () => {
		const config = BashToolConfigSchema.parse({ tier: "inmemory" });
		const bashTool = createTieredBashTool(config);

		const result = (await bashTool.execute!(
			{ command: "cat /nonexistent/file" },
			{ toolCallId: "test-2", messages: [], abortSignal: new AbortController().signal },
		)) as BashToolResult;

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("No such file");
	});
});

// ─── Customer Tool ───────────────────────────────────────────────

describe("createCustomerBashTool", () => {
	it("creates tool for inmemory tier customer", () => {
		const tool = createCustomerBashTool({
			customerId: "cust_001",
			tier: "inmemory",
		});
		expect(tool.execute).toBeTypeOf("function");
	});

	it("creates tool for overlay tier customer", () => {
		const tool = createCustomerBashTool({
			customerId: "cust_002",
			tier: "overlay",
		});
		expect(tool.execute).toBeTypeOf("function");
	});

	it("customer context files are accessible", async () => {
		const tool = createCustomerBashTool({
			customerId: "cust_003",
			tier: "inmemory",
			contextFiles: { "/data/report.txt": "Q4 Revenue: $1M" },
		});

		const result = (await tool.execute!(
			{ command: "cat /data/report.txt" },
			{ toolCallId: "test-3", messages: [], abortSignal: new AbortController().signal },
		)) as BashToolResult;

		expect(result.stdout).toBe("Q4 Revenue: $1M");
	});

	it("customer.json has correct customerId", async () => {
		const tool = createCustomerBashTool({
			customerId: "cust_xyz",
			tier: "inmemory",
		});

		const result = (await tool.execute!(
			{ command: "cat /home/user/.clawdbot/customer.json" },
			{ toolCallId: "test-4", messages: [], abortSignal: new AbortController().signal },
		)) as BashToolResult;

		const parsed = JSON.parse(result.stdout);
		expect(parsed.customerId).toBe("cust_xyz");
	});

	it("defaults to overlay tier", () => {
		const tool = createCustomerBashTool({
			customerId: "cust_default",
		});
		expect(tool.execute).toBeTypeOf("function");
	});
});

// ─── Integration ─────────────────────────────────────────────────

describe("AI Tool Integration", () => {
	it("can pipe data through jq", async () => {
		const config = BashToolConfigSchema.parse({
			tier: "inmemory",
			preSeededFiles: {
				"/data/users.json":
					'[{"name":"Alice","age":30},{"name":"Bob","age":25}]',
			},
		});
		const bashTool = createTieredBashTool(config);

		const result = (await bashTool.execute!(
			{ command: "cat /data/users.json | jq '.[].name'" },
			{ toolCallId: "int-1", messages: [], abortSignal: new AbortController().signal },
		)) as BashToolResult;

		expect(result.stdout).toContain('"Alice"');
		expect(result.stdout).toContain('"Bob"');
		expect(result.exitCode).toBe(0);
	});

	it("can list files in data directory", async () => {
		const config = BashToolConfigSchema.parse({
			tier: "inmemory",
			preSeededFiles: {
				"/data/file1.txt": "content1",
				"/data/file2.txt": "content2",
				"/data/file3.txt": "content3",
			},
		});
		const bashTool = createTieredBashTool(config);

		const result = (await bashTool.execute!(
			{ command: "ls /data/ | sort" },
			{ toolCallId: "int-2", messages: [], abortSignal: new AbortController().signal },
		)) as BashToolResult;

		expect(result.stdout).toContain("file1.txt");
		expect(result.stdout).toContain("file2.txt");
		expect(result.stdout).toContain("file3.txt");
	});

	it("can use grep to search files", async () => {
		const config = BashToolConfigSchema.parse({
			tier: "inmemory",
			preSeededFiles: {
				"/data/log.txt": "INFO: started\nERROR: failed\nINFO: completed",
			},
		});
		const bashTool = createTieredBashTool(config);

		const result = (await bashTool.execute!(
			{ command: 'grep "ERROR" /data/log.txt' },
			{ toolCallId: "int-3", messages: [], abortSignal: new AbortController().signal },
		)) as BashToolResult;

		expect(result.stdout.trim()).toBe("ERROR: failed");
		expect(result.exitCode).toBe(0);
	});

	it("can count files with find and wc", async () => {
		const config = BashToolConfigSchema.parse({
			tier: "inmemory",
			preSeededFiles: {
				"/data/a.json": "{}",
				"/data/b.json": "{}",
				"/data/c.txt": "text",
			},
		});
		const bashTool = createTieredBashTool(config);

		const result = (await bashTool.execute!(
			{ command: 'find /data -name "*.json" | wc -l' },
			{ toolCallId: "int-4", messages: [], abortSignal: new AbortController().signal },
		)) as BashToolResult;

		expect(result.stdout.trim()).toBe("2");
	});
});

// ─── Schema Validation ───────────────────────────────────────────

describe("Schema Validation", () => {
	it("BashToolConfig validates valid config", () => {
		const result = BashToolConfigSchema.safeParse({
			tier: "inmemory",
			preSeededFiles: { "/test": "data" },
		});
		expect(result.success).toBe(true);
	});

	it("BashToolConfig rejects invalid tier", () => {
		const result = BashToolConfigSchema.safeParse({ tier: "invalid" });
		expect(result.success).toBe(false);
	});

	it("BashToolConfig applies defaults", () => {
		const result = BashToolConfigSchema.parse({});
		expect(result.tier).toBe("overlay");
		expect(result.networkPresets).toEqual([]);
		expect(result.customNetworkUrls).toEqual([]);
	});

	it("CustomerContext validates valid context", () => {
		const result = CustomerContextSchema.safeParse({
			customerId: "test",
			tier: "overlay",
		});
		expect(result.success).toBe(true);
	});

	it("CustomerContext requires customerId", () => {
		const result = CustomerContextSchema.safeParse({ tier: "overlay" });
		expect(result.success).toBe(false);
	});
});
