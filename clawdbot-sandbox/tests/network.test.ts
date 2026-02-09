import { describe, expect, it } from "vitest";
import { buildNetworkConfig } from "../src/sandbox/network/config-builder.js";
import { getPreset, PRESETS } from "../src/sandbox/network/presets.js";

describe("Network Presets", () => {
	it("should have all expected preset names", () => {
		const names = Array.from(PRESETS.keys());
		expect(names).toContain("none");
		expect(names).toContain("github");
		expect(names).toContain("anthropic");
		expect(names).toContain("openai");
		expect(names).toContain("vercel");
		expect(names).toContain("stripe");
		expect(names).toContain("standard");
		expect(names).toContain("full");
	});

	it("each preset should have valid HTTPS URLs", () => {
		for (const [name, preset] of PRESETS) {
			for (const url of preset.allowedUrlPrefixes) {
				expect(url, `Preset "${name}" URL "${url}" must start with https://`).toMatch(
					/^https:\/\//,
				);
			}
		}
	});

	it("none preset should have empty arrays", () => {
		const none = getPreset("none");
		expect(none.allowedUrlPrefixes).toEqual([]);
		expect(none.allowedMethods).toEqual([]);
	});

	it("github preset should have correct URL and methods", () => {
		const github = getPreset("github");
		expect(github.allowedUrlPrefixes).toEqual(["https://api.github.com/"]);
		expect(github.allowedMethods).toEqual(["GET", "HEAD"]);
	});

	it("anthropic preset should allow POST", () => {
		const anthropic = getPreset("anthropic");
		expect(anthropic.allowedUrlPrefixes).toEqual(["https://api.anthropic.com/"]);
		expect(anthropic.allowedMethods).toContain("POST");
	});

	it("standard preset should merge github + anthropic + openai", () => {
		const standard = getPreset("standard");
		expect(standard.allowedUrlPrefixes).toContain("https://api.github.com/");
		expect(standard.allowedUrlPrefixes).toContain("https://api.anthropic.com/");
		expect(standard.allowedUrlPrefixes).toContain("https://api.openai.com/");
		expect(standard.allowedUrlPrefixes).toHaveLength(3);
	});

	it("full preset should include all API URLs", () => {
		const full = getPreset("full");
		expect(full.allowedUrlPrefixes).toContain("https://api.github.com/");
		expect(full.allowedUrlPrefixes).toContain("https://api.anthropic.com/");
		expect(full.allowedUrlPrefixes).toContain("https://api.openai.com/");
		expect(full.allowedUrlPrefixes).toContain("https://api.vercel.com/");
		expect(full.allowedUrlPrefixes).toContain("https://api.stripe.com/");
		expect(full.allowedUrlPrefixes).toHaveLength(5);
	});

	it("full preset should include all HTTP methods", () => {
		const full = getPreset("full");
		expect(full.allowedMethods).toContain("GET");
		expect(full.allowedMethods).toContain("HEAD");
		expect(full.allowedMethods).toContain("POST");
		expect(full.allowedMethods).toContain("PUT");
		expect(full.allowedMethods).toContain("DELETE");
		expect(full.allowedMethods).toContain("PATCH");
		expect(full.allowedMethods).toContain("OPTIONS");
	});
});

describe("getPreset", () => {
	it("should return the correct preset by name", () => {
		const github = getPreset("github");
		expect(github.name).toBe("github");
		expect(github.description).toBeTruthy();
	});

	it("should throw on unknown preset name", () => {
		expect(() => getPreset("nonexistent")).toThrow('Unknown network preset "nonexistent"');
	});

	it("should throw with available presets listed in error message", () => {
		expect(() => getPreset("bad")).toThrow("Available presets:");
	});
});

describe("buildNetworkConfig", () => {
	it("should build config from a single preset", () => {
		const config = buildNetworkConfig(["github"]);
		expect(config).toBeDefined();
		expect(config?.allowedUrlPrefixes).toEqual(["https://api.github.com/"]);
		expect(config?.allowedMethods).toEqual(["GET", "HEAD"]);
	});

	it("should merge multiple presets", () => {
		const config = buildNetworkConfig(["github", "anthropic"]);
		expect(config).toBeDefined();
		expect(config?.allowedUrlPrefixes).toContain("https://api.github.com/");
		expect(config?.allowedUrlPrefixes).toContain("https://api.anthropic.com/");
		expect(config?.allowedMethods).toContain("GET");
		expect(config?.allowedMethods).toContain("HEAD");
		expect(config?.allowedMethods).toContain("POST");
	});

	it("should deduplicate URL prefixes when merging", () => {
		// standard already includes github's URL
		const config = buildNetworkConfig(["standard", "github"]);
		expect(config).toBeDefined();
		const githubCount =
			config?.allowedUrlPrefixes?.filter((u) => u === "https://api.github.com/").length ?? 0;
		expect(githubCount).toBe(1);
	});

	it("should deduplicate HTTP methods when merging", () => {
		// Both github and anthropic have GET and HEAD
		const config = buildNetworkConfig(["github", "anthropic"]);
		expect(config).toBeDefined();
		const getCount = config?.allowedMethods?.filter((m) => m === "GET").length ?? 0;
		expect(getCount).toBe(1);
	});

	it("should add custom URLs", () => {
		const config = buildNetworkConfig(["github"], ["https://custom.example.com/"]);
		expect(config).toBeDefined();
		expect(config?.allowedUrlPrefixes).toContain("https://custom.example.com/");
		expect(config?.allowedUrlPrefixes).toContain("https://api.github.com/");
	});

	it("should deduplicate custom URLs with preset URLs", () => {
		const config = buildNetworkConfig(["github"], ["https://api.github.com/"]);
		expect(config).toBeDefined();
		const count =
			config?.allowedUrlPrefixes?.filter((u) => u === "https://api.github.com/").length ?? 0;
		expect(count).toBe(1);
	});

	it("should reject HTTP URLs in custom URLs", () => {
		expect(() => buildNetworkConfig(["github"], ["http://insecure.example.com/"])).toThrow(
			"URL prefix must use HTTPS",
		);
	});

	it("should reject invalid custom URLs", () => {
		expect(() => buildNetworkConfig(["github"], ["not-a-url"])).toThrow("Invalid URL prefix");
	});

	it("should return undefined for none preset with no custom URLs", () => {
		const config = buildNetworkConfig(["none"]);
		expect(config).toBeUndefined();
	});

	it("should return config when none preset has custom URLs", () => {
		const config = buildNetworkConfig(["none"], ["https://custom.example.com/"]);
		expect(config).toBeDefined();
		expect(config?.allowedUrlPrefixes).toEqual(["https://custom.example.com/"]);
	});

	it("should throw on unknown preset", () => {
		expect(() => buildNetworkConfig(["unknown-preset"])).toThrow("Unknown network preset");
	});
});
