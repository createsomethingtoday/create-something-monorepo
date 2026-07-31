export type ConceptJourneyProperty = 'space' | 'io' | 'agency' | 'ltd' | 'lms';

export type ConceptJourneyContentType =
	| 'paper'
	| 'experiment'
	| 'lesson'
	| 'principle'
	| 'pattern'
	| 'master'
	| 'service'
	| 'case-study';

export interface ConceptJourneySearchResult {
	id: string;
	title: string;
	description: string;
	property: ConceptJourneyProperty;
	type: ConceptJourneyContentType;
	url: string;
	path: string;
	score: number;
	concepts?: string[];
}

export interface ConceptStory {
	concept: string;
	description: string;
	journey: {
		canon?: ConceptJourneySearchResult[];
		learn?: ConceptJourneySearchResult[];
		explore?: ConceptJourneySearchResult[];
		study?: ConceptJourneySearchResult[];
		apply?: ConceptJourneySearchResult[];
	};
	totalContent: number;
}
