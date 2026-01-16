import React, { useState } from 'react';
import type { ScanReport, AiAnalysisResult } from '@create-something/bundle-scanner-core';
import { 
  analyzeReportWithAi, 
  GeminiProvider 
} from '@create-something/bundle-scanner-core';
import { 
  Bot, 
  ShieldAlert, 
  FilePlus, 
  Filter, 
  HelpCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  AlertTriangle,
  Key
} from 'lucide-react';

interface AiSuggestionsPanelProps {
  report: ScanReport;
}

export const AiSuggestionsPanel: React.FC<AiSuggestionsPanelProps> = ({ report }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  
  const contentId = 'ai-suggestions-content';

  const handleAnalyze = async () => {
    // Check for API key
    const key = apiKey || import.meta.env.VITE_GOOGLE_API_KEY;
    
    if (!key) {
      setShowApiKeyInput(true);
      return;
    }
    
    setAnalyzing(true);
    setError(null);
    
    try {
      const provider = new GeminiProvider(key);
      const data = await analyzeReportWithAi(report, provider);
      setResult(data);
      setShowApiKeyInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!result && !analyzing && !error) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-white p-4 rounded-xl border border-purple-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" aria-hidden="true" />
            <h3 className="font-bold text-purple-900 text-sm">AI Suggestions</h3>
          </div>
          {showApiKeyInput ? (
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Enter Google AI API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="px-2 py-1 text-xs border rounded-lg w-48 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button 
                onClick={handleAnalyze}
                disabled={!apiKey}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Analyze
              </button>
            </div>
          ) : (
            <button 
              onClick={handleAnalyze}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-purple-600"
            >
              <Bot className="w-3 h-3" />
              Analyze with AI
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-purple-800 opacity-80">
          Uses Google Gemini to identify missed risks and suggest improvements.
        </p>
        {showApiKeyInput && (
          <p className="mt-2 text-xs text-purple-600 flex items-center gap-1">
            <Key className="w-3 h-3" />
            API key is stored locally and not sent anywhere except Google AI.
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden" aria-labelledby="ai-panel-title">
      <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" aria-hidden="true" />
          <h3 id="ai-panel-title" className="font-bold text-purple-900 text-sm">AI Suggestions</h3>
          <span className="ml-2 text-[10px] uppercase font-bold tracking-wider bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">
            Advisory Only
          </span>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          aria-label={isExpanded ? 'Collapse AI Suggestions' : 'Expand AI Suggestions'}
          className="text-purple-400 hover:text-purple-600 focus:outline-none focus:text-purple-700"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div id={contentId} className="p-4 space-y-6">
          {analyzing && (
            <div className="flex flex-col items-center justify-center py-8 text-purple-600 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium">Analyzing scan results...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
              <strong>Analysis Failed:</strong> {error}
              <button onClick={handleAnalyze} className="block mt-2 text-blue-600 underline">
                Retry
              </button>
            </div>
          )}

          {result && (
            <>
              {/* Review Status Banner */}
              {result.reviewStatusRecommendation && (
                <div className={`p-3 rounded-lg flex items-center gap-3 border ${
                  result.reviewStatusRecommendation === 'MANUAL_REVIEW_REQUIRED' 
                    ? 'bg-orange-50 border-orange-200 text-orange-800' 
                    : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                  {result.reviewStatusRecommendation === 'MANUAL_REVIEW_REQUIRED' 
                    ? <AlertTriangle className="w-5 h-5 shrink-0" /> 
                    : <CheckCircle className="w-5 h-5 shrink-0" />
                  }
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">AI Recommendation</div>
                    <div className="text-sm font-semibold">
                      {result.reviewStatusRecommendation === 'MANUAL_REVIEW_REQUIRED' 
                        ? 'Manual Review Required' 
                        : 'Looks Good (No Obvious Misses)'}
                    </div>
                  </div>
                </div>
              )}

              {/* Missed Risks */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                  Potential Missed Risks
                </h4>
                {result.missedRisks.length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-6">No obvious missed risks detected.</p>
                ) : (
                  result.missedRisks.map((risk, idx) => (
                    <div key={idx} className="ml-2 pl-4 border-l-2 border-orange-200 py-1">
                      <div className="flex justify-between items-start gap-2">
                        <h5 className="text-sm font-semibold text-gray-800">{risk.title}</h5>
                        <span className={`text-[10px] px-1.5 rounded font-medium shrink-0 ${
                          risk.confidence === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {risk.confidence} CONF
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{risk.whyItMatters}</p>
                      {risk.evidence.length > 0 && (
                        <div className="mt-2 bg-gray-50 p-2 rounded border text-xs font-mono text-gray-500 overflow-x-auto whitespace-pre-wrap break-words">
                          {risk.evidence[0].filePath}: {risk.evidence[0].snippet}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Rule Suggestions */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
                  <FilePlus className="w-4 h-4 text-blue-500" />
                  Rule Suggestions
                </h4>
                {result.suggestedRuleAdditions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-6">No new rules suggested.</p>
                ) : (
                  result.suggestedRuleAdditions.map((rule, idx) => (
                    <div key={idx} className="ml-2 pl-4 border-l-2 border-blue-200 py-1">
                      <h5 className="text-sm font-semibold text-gray-800">{rule.proposedRuleName}</h5>
                      <p className="text-xs text-gray-600 mt-1">{rule.rationale}</p>
                      <div className="mt-1 text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded inline-block max-w-full overflow-x-auto">
                        {rule.suggestedRegexOrAstIdea}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Noise Reduction */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
                  <Filter className="w-4 h-4 text-green-500" />
                  Noise Reduction
                </h4>
                {result.suggestedNoiseReductions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-6">No noise reduction suggestions.</p>
                ) : (
                  result.suggestedNoiseReductions.map((noise, idx) => (
                    <div key={idx} className="ml-2 pl-4 border-l-2 border-green-200 py-1">
                      <h5 className="text-sm font-semibold text-gray-800">{noise.currentIssue}</h5>
                      <p className="text-xs text-gray-600 mt-1">Proposal: {noise.proposal}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Questions */}
              {result.questionsForReviewer.length > 0 && (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
                    <HelpCircle className="w-4 h-4 text-gray-500" />
                    Reviewer Questions
                  </h4>
                  <ul className="ml-6 list-disc text-xs text-gray-600 space-y-1">
                    {result.questionsForReviewer.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};
