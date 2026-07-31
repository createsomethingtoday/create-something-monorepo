import { z } from 'zod';

import {
  findNpgLocation,
  npgLocationDirectory,
  type NpgLocationLookupResult,
  type NpgLocationRecord
} from '../npg/location-directory';

const configuredLocationSchema = z
  .object({
    id: z.string().min(2).max(80),
    name: z.string().min(2).max(120),
    aliases: z.array(z.string().min(2).max(120)).max(20).default([]),
    street: z.string().min(2).max(160),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(30),
    postalCode: z.string().min(3).max(16).optional(),
    building: z.string().min(2).max(120).optional(),
    floor: z.string().min(1).max(40).optional(),
    suite: z.string().min(1).max(40).optional(),
    office: z.string().min(1).max(40).optional(),
    status: z.enum(['approved', 'review_required']),
    reviewReason: z.string().min(2).max(240).optional(),
    sourceVersion: z.string().min(2).max(80)
  })
  .strip();

const configuredDirectorySchema = z.array(configuredLocationSchema).max(250);

export function parseConfiguredNpgDirectory(raw: string | undefined): readonly NpgLocationRecord[] {
  if (raw === undefined || raw.trim() === '') return npgLocationDirectory;

  try {
    const configured = configuredDirectorySchema.parse(JSON.parse(raw));
    return configured.map((location) => ({
      ...location,
      facilityLabel: 'Regus or HQ' as const
    }));
  } catch {
    return [];
  }
}

export function lookupConfiguredNpgLocation(
  query: string,
  rawDirectory: string | undefined
): NpgLocationLookupResult {
  const directory = parseConfiguredNpgDirectory(rawDirectory);
  if (directory.length === 0) {
    return {
      status: 'not_found',
      message:
        'The caller-safe NPG directory is unavailable. A human representative must confirm the appointment site.'
    };
  }
  return findNpgLocation(query, directory);
}
