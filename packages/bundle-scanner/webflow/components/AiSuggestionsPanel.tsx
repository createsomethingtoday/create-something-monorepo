/**
 * AI Suggestions Panel Component
 * Displays AI analysis results from Gemini
 */

import React, { useState } from 'react';
import type { AiAnalysisResult } from '../types';

interface AiSuggestionsPanelProps {
  analysis: AiAnalysisResult;
  accentColor?: string;
}

export function AiSuggestionsPanel({ analysis, accentColor = '#6366f1' }: AiSuggestionsPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('missedRisks');
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  const confidenceColors: Record<string, string> = {
    HIGH: 'text-red-400',
    MEDIUM: 'text-yellow-400',
    LOW: 'text-green-400'
  };
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span>🤖</span> AI Analysis
        </h3>
        {analysis.reviewStatusRecommendation && (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            analysis.reviewStatusRecommendation === 'LOOKS_GOOD'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {analysis.reviewStatusRecommendation.replace('_', ' ')}
          </span>
        )}
      </div>
      
      <div className="divide-y divide-gray-700">
        {/* Missed Risks */}
        {analysis.missedRisks.length > 0 && (
          <Section
            title={`Potential Missed Risks (${analysis.missedRisks.length})`}
            isExpanded={expandedSection === 'missedRisks'}
            onToggle={() => toggleSection('missedRisks')}
            accentColor={accentColor}
          >
            <div className="space-y-3">
              {analysis.missedRisks.map((risk, i) => (
                <div key={i} className="bg-gray-900/50 rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-white">{risk.title}</h4>
                    <span className={`text-xs ${confidenceColors[risk.confidence]}`}>
                      {risk.confidence}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{risk.whyItMatters}</p>
                  {risk.evidence.length > 0 && (
                    <div className="text-xs">
                      <span className="text-gray-500">Evidence:</span>
                      {risk.evidence.slice(0, 2).map((e, j) => (
                        <div key={j} className="mt-1 font-mono text-gray-400">
                          {e.filePath}{e.line ? `:${e.line}` : ''}: {e.snippet.substring(0, 60)}...
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2 italic">
                    💡 {risk.suggestedNextCheck}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}
        
        {/* Suggested Rule Additions */}
        {analysis.suggestedRuleAdditions.length > 0 && (
          <Section
            title={`Suggested New Rules (${analysis.suggestedRuleAdditions.length})`}
            isExpanded={expandedSection === 'ruleAdditions'}
            onToggle={() => toggleSection('ruleAdditions')}
            accentColor={accentColor}
          >
            <div className="space-y-3">
              {analysis.suggestedRuleAdditions.map((rule, i) => (
                <div key={i} className="bg-gray-900/50 rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-white">{rule.proposedRuleName}</h4>
                    <span className={`text-xs ${confidenceColors[rule.confidence]}`}>
                      {rule.confidence}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{rule.rationale}</p>
                  <div className="text-xs">
                    <span className="text-gray-500">Suggested pattern:</span>
                    <code className="ml-2 bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                      {rule.suggestedRegexOrAstIdea}
                    </code>
                  </div>
                  <div className="text-xs mt-1">
                    <span className="text-gray-500">File globs:</span>
                    <span className="ml-2 text-gray-400">
                      {rule.recommendedFileGlobs.join(', ')}
                    </span>
                  </div>
                  {rule.falsePositiveNotes.length > 0 && (
                    <p className="text-xs text-yellow-500/70 mt-2">
                      ⚠ FP Notes: {rule.falsePositiveNotes.join('; ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
        
        {/* Noise Reduction Suggestions */}
        {analysis.suggestedNoiseReductions.length > 0 && (
          <Section
            title={`Noise Reduction (${analysis.suggestedNoiseReductions.length})`}
            isExpanded={expandedSection === 'noiseReduction'}
            onToggle={() => toggleSection('noiseReduction')}
            accentColor={accentColor}
          >
            <div className="space-y-3">
              {analysis.suggestedNoiseReductions.map((suggestion, i) => (
                <div key={i} className="bg-gray-900/50 rounded p-3">
                  <p className="text-sm text-gray-300 mb-2">
                    <strong>Issue:</strong> {suggestion.currentIssue}
                  </p>
                  <p className="text-sm text-gray-400 mb-2">
                    <strong>Proposal:</strong> {suggestion.proposal}
                  </p>
                  <p className={`text-xs ${confidenceColors[suggestion.riskOfHidingRealIssues]}`}>
                    Risk of hiding real issues: {suggestion.riskOfHidingRealIssues}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}
        
        {/* Questions for Reviewer */}
        {analysis.questionsForReviewer.length > 0 && (
          <Section
            title={`Questions for Reviewer (${analysis.questionsForReviewer.length})`}
            isExpanded={expandedSection === 'questions'}
            onToggle={() => toggleSection('questions')}
            accentColor={accentColor}
          >
            <ul className="space-y-2">
              {analysis.questionsForReviewer.map((question, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-gray-500">?</span>
                  {question}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  accentColor: string;
  children: React.ReactNode;
}

function Section({ title, isExpanded, onToggle, accentColor, children }: SectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-300">{title}</span>
        <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default AiSuggestionsPanel;
