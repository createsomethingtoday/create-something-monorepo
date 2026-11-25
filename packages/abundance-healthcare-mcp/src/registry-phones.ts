// Read only the telephone fields of the approved individual. Never retain a mailing address.
export async function readRegistryPhones(npi: string, fetchFn: typeof fetch = fetch) {
  if (!/^\d{10}$/.test(npi)) throw new Error('Invalid registry identifier.');
  const response = await fetchFn(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${npi}`, {
    redirect: 'error',
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error('Registry phone lookup unavailable.');
  const body = (await response.json()) as {
    results?: Array<{
      number?: string;
      enumeration_type?: string;
      basic?: { last_updated?: string };
      addresses?: unknown;
      practiceLocations?: unknown;
    }>;
  };
  const record = body.results?.find(
    (row) => row.number === npi && row.enumeration_type === 'NPI-1'
  );
  if (!record) throw new Error('No matching individual registry record.');
  const phones: Array<{
    number: string;
    role: 'practice' | 'mailing' | 'practice fax' | 'mailing fax';
  }> = [];
  function addAddresses(addresses: unknown, secondary: boolean) {
    if (!Array.isArray(addresses)) return;
    for (const address of addresses) {
      if (!address || typeof address !== 'object') continue;
      const purpose = secondary ? 'LOCATION' : address.address_purpose;
      if (purpose !== 'LOCATION' && purpose !== 'MAILING') continue;
      for (const field of ['telephone_number', 'fax_number'] as const) {
        const number = address[field];
        if (typeof number !== 'string' || !/^\+?[\d ().-]{7,30}$/.test(number)) continue;
        const fax = field === 'fax_number';
        const role =
          purpose === 'MAILING'
            ? fax
              ? 'mailing fax'
              : 'mailing'
            : fax
              ? 'practice fax'
              : 'practice';
        if (!phones.some((entry) => entry.number === number && entry.role === role))
          phones.push({ number, role });
      }
    }
  }
  addAddresses(record.addresses, false);
  addAddresses(record.practiceLocations, true);
  return { status: 'available' as const, phones, provider_updated_at: record.basic?.last_updated };
}
