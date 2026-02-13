import type { GeneratedRecommendation, AnalysisData, AnalysisResult, KeywordAnalysis } from './types';
import { calculateOptimizationScore } from './score-calculator';

const ANALYSIS_PROMPT_TEMPLATE = `You are an AI visibility optimization expert. Analyze why the following competitor pages are cited by AI answer engines for the query "{keyword}" while {brandName} ({brandDomain}) is not.

Competitor citations for this query:
{competitorDetails}

Provide specific, actionable recommendations. Respond ONLY with valid JSON in this exact format:
{
  "recommendations": [
    {
      "type": "create_content" | "update_content" | "add_schema" | "improve_structure" | "add_comparison" | "improve_authority" | "optimize_citations",
      "title": "Brief actionable title",
      "description": "Why this matters and what to do",
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}`;

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;

interface AiRecommendation {
  type: string;
  title: string;
  description: string;
  steps: string[];
}

interface AiResponse {
  recommendations: AiRecommendation[];
}

/**
 * Run AI-powered analysis using Perplexity API for deeper recommendations.
 * Only analyzes keywords with content gaps (no brand citation but competitors cited).
 */
export async function analyzeWithAi(
  data: AnalysisData,
  context: { brandName: string; brandDomain: string },
): Promise<AnalysisResult> {
  const recommendations: GeneratedRecommendation[] = [];

  // Only analyze keywords where competitors are cited but brand isn't
  const keywordsToAnalyze = data.keywordAnalyses.filter(
    ka => !ka.hasBrandCitation && ka.competitorCitations.length > 0,
  );

  // Process in batches to avoid rate limits
  for (let i = 0; i < keywordsToAnalyze.length; i += BATCH_SIZE) {
    const batch = keywordsToAnalyze.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(kw => analyzeKeyword(kw, context)),
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled' && result.value) {
        recommendations.push(...result.value.recommendations);
      }
    }

    // Delay between batches (except after the last one)
    if (i + BATCH_SIZE < keywordsToAnalyze.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  const score = calculateOptimizationScore(data);

  return {
    recommendations,
    contentGaps: [], // AI analyzer doesn't produce new gaps (rule engine handles that)
    score,
  };
}

/**
 * Analyze a single keyword using Perplexity API.
 */
async function analyzeKeyword(
  kw: KeywordAnalysis,
  context: { brandName: string; brandDomain: string },
): Promise<{ recommendations: GeneratedRecommendation[]; tokensUsed: number } | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn('PERPLEXITY_API_KEY not set, skipping AI analysis');
    return null;
  }

  const competitorDetails = kw.competitorCitations
    .map(c => `- ${c.competitorName}: ${c.count} citation(s), URLs: ${c.urls.slice(0, 3).join(', ')}`)
    .join('\n');

  const prompt = ANALYSIS_PROMPT_TEMPLATE
    .replace('{keyword}', kw.keyword)
    .replace('{brandName}', context.brandName)
    .replace('{brandDomain}', context.brandDomain)
    .replace('{competitorDetails}', competitorDetails || 'No competitor data available');

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity AI analysis failed for "${kw.keyword}": ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokens = data.usage?.total_tokens || 0;

    const parsed = parseAiResponse(content);
    if (!parsed) return { recommendations: [], tokensUsed: tokens };

    const recommendations: GeneratedRecommendation[] = parsed.recommendations.map(rec => ({
      keywordId: kw.keywordId,
      type: validateRecommendationType(rec.type),
      priority: 'high',
      source: 'ai_powered' as const,
      title: rec.title,
      description: rec.description,
      actionableSteps: rec.steps || [],
      estimatedImpact: 15, // AI recommendations are generally high-impact
      competitorId: kw.competitorCitations[0]?.competitorId,
      metadata: {
        keyword: kw.keyword,
        aiGenerated: true,
        competitorsCited: kw.competitorCitations.map(c => c.competitorName),
      },
    }));

    return { recommendations, tokensUsed: tokens };
  } catch (error) {
    console.error(`AI analysis error for "${kw.keyword}":`, error);
    return null;
  }
}

/**
 * Parse the JSON response from the AI, handling common formatting issues.
 */
function parseAiResponse(content: string): AiResponse | null {
  try {
    // Try direct parse first
    return JSON.parse(content);
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Fall through
      }
    }

    // Try finding JSON object in the response
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Fall through
      }
    }

    console.warn('Could not parse AI response as JSON');
    return null;
  }
}

const VALID_TYPES = new Set([
  'create_content', 'update_content', 'add_schema', 'improve_structure',
  'add_comparison', 'improve_authority', 'optimize_citations',
]);

function validateRecommendationType(type: string): GeneratedRecommendation['type'] {
  if (VALID_TYPES.has(type)) return type as GeneratedRecommendation['type'];
  return 'create_content'; // Default fallback
}
