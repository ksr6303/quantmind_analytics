const POSITIVE_TERMS = new Set([
  'surge', 'surged', 'jump', 'jumped', 'climb', 'climbed', 'soar', 'soared', 'rally', 'rallied',
  'gain', 'gained', 'rise', 'rose', 'high', 'higher', 'record', 'peak', 'bull', 'bullish',
  'profit', 'profitable', 'growth', 'grow', 'grew', 'strong', 'stronger', 'beat', 'beats',
  'upgrade', 'upgraded', 'buy', 'outperform', 'positive', 'optimism', 'optimistic', 'boom',
  'recover', 'recovered', 'recovery', 'expansion', 'expand', 'success', 'successful', 'win', 'won',
  'acceleration', 'ahead', 'attractive', 'buyback', 'cheap', 'confident', 'consolidation', 
  'constructive', 'disciplined', 'dividend', 'double', 'efficient', 'encouraging', 'enthusiastic', 
  'exciting', 'exclusive', 'expansionary', 'favorable', 'flourishing', 'focused', 'forward', 
  'fundamental', 'healthy', 'hiring', 'impressive', 'innovative', 'inspiring', 'integrated', 
  'intensive', 'interesting', 'investor-friendly', 'leading', 'lucrative', 'momentum', 'notable', 
  'objective', 'outstanding', 'payoff', 'plentiful', 'productive', 'progressive', 'promising', 
  'prosperity', 'quality', 'reassure', 'rebounding', 'remarkable', 'resilience', 'resilient', 
  'rewarding', 'robust', 'solid', 'stable', 'sterling', 'stimulating', 'striking', 'substantial', 
  'superior', 'supportive', 'sustainable', 'thrive', 'topping', 'undervalued', 'upside', 
  'vibrant', 'visionary', 'wealth', 'welcome', 'worthwhile', 'guidance', 'breakout', 'support', 'oversold',
  'acquisition', 'merger', 'liquidity', 'cashflow', 'upbeat', 'bullish', 'breakthrough', 'rebound'
]);

const NEGATIVE_TERMS = new Set([
  'plunge', 'plunged', 'drop', 'dropped', 'fall', 'fell', 'tumble', 'tumbled', 'slide', 'slid',
  'dive', 'dived', 'crash', 'crashed', 'slump', 'slumped', 'low', 'lower', 'bear', 'bearish',
  'loss', 'lose', 'lost', 'weak', 'weaker', 'weakness', 'miss', 'missed', 'fail', 'failed',
  'downgrade', 'downgraded', 'sell', 'underperform', 'negative', 'pessimism', 'pessimistic',
  'recession', 'depression', 'crisis', 'collapse', 'collapsed', 'decline', 'declined', 'concern',
  'worry', 'worried', 'fear', 'risk', 'threat', 'cut', 'cuts', 'slash', 'slashed', 'warning', 'warns',
  'adverse', 'afraid', 'alarming', 'anxious', 'bankruptcy', 'bleak', 'block', 'burden', 'cautious', 
  'chaotic', 'challenging', 'complain', 'complicated', 'controversial', 'corrupted', 'costly', 
  'critical', 'danger', 'dark', 'debt-ridden', 'default', 'deficit', 'delay', 'difficult', 
  'dilemma', 'disappointing', 'disastrous', 'discouraged', 'dismal', 'disputed', 'disruptive', 
  'distortion', 'distressed', 'doubtful', 'drain', 'drastic', 'dreary', 'erosion', 'exorbitant', 
  'expensive', 'exposure', 'fatigue', 'flawed', 'forbidden', 'fragile', 'friction', 'frustrated', 
  'gloom', 'gloomy', 'greedy', 'hardship', 'harmful', 'harsh', 'hazard', 'hesitant', 'hindrance', 
  'hollow', 'hostile', 'hurt', 'idle', 'illicit', 'imbalanced', 'impediment', 'impending', 
  'imperfect', 'improper', 'inadequate', 'inappropriate', 'incompetent', 'incomplete', 
  'incorrect', 'indefinite', 'inefficient', 'inequality', 'inevitable', 'inferior', 'inflationary', 
  'inflexible', 'insecure', 'instability', 'insufficient', 'volatility', 'sideways', 'breakdown', 'resistance',
  'inflation', 'lawsuit', 'investigation', 'unemployment', 'tapering', 'overbought', 'bearish', 'bubble'
]);

const NEGATIONS = new Set([
  'not', 'no', 'never', 'none', 'neither', 'nor', 'cannot', 'isnt', 'wasnt', 'arent', 'werent', 
  'dont', 'doesnt', 'didnt', 'hasnt', 'havent', 'hadnt', 'wont', 'wouldnt', 'shant', 'shouldnt', 
  'mightnt', 'mustnt'
]);

const EMOJI_MAP: Record<string, string> = {
  '🚀': 'surge', '📈': 'rise', '📉': 'fall', '🐻': 'bearish', '🐂': 'bullish',
  '💰': 'profit', '🔥': 'growth', '⚠️': 'warning', '❌': 'fail', '✅': 'success'
};

export const analyzeSentiment = (text: string): 'Positive' | 'Negative' | 'Neutral' => {
  if (!text) return 'Neutral';
  
  // Replace emojis with text
  let processedText = text;
  Object.entries(EMOJI_MAP).forEach(([emoji, word]) => {
    processedText = processedText.replace(new RegExp(emoji, 'g'), ' ' + word + ' ');
  });

  const words = processedText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  let score = 0;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';
    const isNegated = NEGATIONS.has(prevWord);

    if (POSITIVE_TERMS.has(word)) {
      score += isNegated ? -1 : 1;
    } else if (NEGATIVE_TERMS.has(word)) {
      score += isNegated ? 0.5 : -1;
    }
  }

  if (score > 0.2) return 'Positive'; // Added threshold for noise
  if (score < -0.2) return 'Negative';
  return 'Neutral';
};

export const calculateAggregateSentiment = (news: { sentiment: string }[]): number => {
  if (!news || news.length === 0) return 50;

  let totalScore = 0;
  news.forEach(n => {
    if (n.sentiment === 'Positive') totalScore += 1;
    else if (n.sentiment === 'Negative') totalScore -= 1;
  });

  const count = news.length;
  // If mostly neutral, stay near 50
  const normalized = totalScore / count; 
  return Math.round(((normalized + 1) / 2) * 100);
};