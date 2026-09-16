import type { NursingPersonaCoverageQuery } from './healthcare-providers';

/**
 * NPG-owned coverage questions captured in the sourcing workshop transcript.
 * Keep client-specific personas here while the NPPES adapter remains reusable.
 */
export const NPG_NURSING_PERSONA_COVERAGE: NursingPersonaCoverageQuery[] = [
	{
		id: 'npg-family-np-springfield-mo',
		label: 'Family nurse practitioners in Springfield, Missouri',
		taxonomy_description: 'Nurse Practitioner, Family',
		city: 'Springfield',
		state: 'MO'
	},
	{
		id: 'npg-family-np-missouri',
		label: 'Family nurse practitioners in Missouri',
		taxonomy_description: 'Nurse Practitioner, Family',
		state: 'MO'
	}
];
