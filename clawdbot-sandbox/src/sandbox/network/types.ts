import { z } from "zod/v4";

/**
 * HTTP methods supported by just-bash NetworkConfig.
 */
export const HttpMethodSchema = z.enum([
	"GET",
	"HEAD",
	"POST",
	"PUT",
	"DELETE",
	"PATCH",
	"OPTIONS",
]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

/**
 * A named network preset with a description, allowed URL prefixes, and methods.
 */
export const NetworkPresetSchema = z.object({
	name: z.string(),
	description: z.string(),
	allowedUrlPrefixes: z.array(z.string()),
	allowedMethods: z.array(HttpMethodSchema),
});
export type NetworkPreset = z.infer<typeof NetworkPresetSchema>;

/**
 * Configuration for the network manager.
 * Selects presets by name and optionally adds custom URLs.
 */
export const NetworkManagerConfigSchema = z.object({
	presets: z.array(z.string()),
	customUrls: z.array(z.string()).optional(),
	dangerouslyAllowAll: z.boolean().optional(),
});
export type NetworkManagerConfig = z.infer<typeof NetworkManagerConfigSchema>;
