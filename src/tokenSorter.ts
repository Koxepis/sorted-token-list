import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Enhanced Token Interface
interface TokenMetrics {
  trendingScore: number;
  marketScore: number;
  socialScore: number;
  viralityScore: number;
}

interface Token {
  pythFeedId: string;
  pythName: string;
  coinGeckoId: string | null;
  tokenName: string | null;
  tokenSymbol: string;
  tokenImageLogo: string | null;
  tokenTotalSupply: number | null;
  tokenCirculatingSupply: number | null;
  metrics?: TokenMetrics;
  finalScore?: number;
}

class TokenSorter {
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // Main processing function
  async processTokens() {
    // Determine the correct path to tokens.json
    const possiblePaths = [
      path.join(__dirname, '../data/tokens.json'),
      path.join(__dirname, '../tokens.json'),
      path.join(process.cwd(), 'tokens.json'),
      path.join(process.cwd(), 'data/tokens.json')
    ];

    let tokensData: Token[] | null = null;

    // Try multiple paths
    for (const tokensPath of possiblePaths) {
      try {
        console.log(`Attempting to read tokens from: ${tokensPath}`);

        // Check if file exists
        if (!fs.existsSync(tokensPath)) {
          console.log(`File not found: ${tokensPath}`);
          continue;
        }

        // Read file
        const fileContents = fs.readFileSync(tokensPath, 'utf8');

        // Validate JSON
        if (!fileContents.trim()) {
          console.log(`File is empty: ${tokensPath}`);
          continue;
        }

        // Parse JSON
        tokensData = JSON.parse(fileContents);

        // Validate parsed data
        if (!Array.isArray(tokensData) || tokensData.length === 0) {
          console.log(`No valid tokens found in: ${tokensPath}`);
          continue;
        }

        console.log(`Successfully loaded ${tokensData.length} tokens from ${tokensPath}`);
        break; // Success, exit the loop
      } catch (error) {
        console.error(`Error reading ${tokensPath}:`, error);
      }
    }

    // Throw error if no valid tokens found
    if (!tokensData) {
      throw new Error('Could not find or parse tokens.json file. Please check your file location and format.');
    }

    // Create a new sorter with the loaded tokens
    const sorter = new TokenSorter(tokensData);

    // Sort ALL tokens
    const sortedTokens = await sorter.sortTokens();

    // Write sorted tokens to output file
    const outputPath = path.join(process.cwd(), 'sorted-tokens.json');
    fs.writeFileSync(outputPath, JSON.stringify(sortedTokens, null, 2));

    // Print all tokens (or first 100 for console readability)
    console.log(`Total sorted tokens: ${sortedTokens.length}`);
    console.log('Top 100 Tokens:');
    console.log(
      sortedTokens.slice(0, 100).map(token => ({
        symbol: token.tokenSymbol,
        name: token.pythName,
        finalScore: token.finalScore,
      }))
    );

    return sortedTokens;
  }

  // Comprehensive token sorting method
  async sortTokens(): Promise<Token[]> {
    // Ensure we're using the tokens passed to the constructor
    if (this.tokens.length === 0) {
      console.error('No tokens to sort!');
      return [];
    }

    // Process tokens with metrics
    const processedTokens = await Promise.all(
      this.tokens.map(async (token) => {
        const metrics = await this.calculateTokenMetrics(token);

        return {
          ...token,
          metrics: metrics,
          finalScore: this.calculateFinalScore(metrics)
        };
      })
    );

    // Sort by final score in descending order
    return processedTokens.sort((a, b) =>
      (b.finalScore || 0) - (a.finalScore || 0)
    );
  }

  // Simplified metrics calculation
  private async calculateTokenMetrics(token: Token): Promise<TokenMetrics> {
    return {
      trendingScore: this.calculateTrendingScore(token),
      marketScore: await this.calculateMarketScore(token),
      socialScore: this.calculateSocialScore(token),
      viralityScore: this.calculateViralityScore(token)
    };
  }

  // Trending calculation
  private calculateTrendingScore(token: Token): number {
    const trendFactors = [
      token.tokenSymbol ? token.tokenSymbol.length : 0,
      token.pythName && token.pythName.toLowerCase().includes('meme') ? 10 : 0,
      token.tokenName ? token.tokenName.length : 0
    ];

    return trendFactors.reduce((a, b) => a + b, 0);
  }

  // Market score calculation
  private async calculateMarketScore(token: Token): Promise<number> {
    // Use token properties for scoring if available
    const factors = [
      token.tokenTotalSupply || 0,
      token.tokenCirculatingSupply || 0
    ];

    return factors.reduce((score, factor) =>
      score + (factor > 0 ? Math.log(factor + 1) : 0), 0);
  }

  // Social engagement score
  private calculateSocialScore(token: Token): number {
    const socialFactors = [
      token.tokenSymbol ? token.tokenSymbol.length * 2 : 0,
      token.pythName && token.pythName.toLowerCase().includes('crypto') ? 5 : 0,
      token.tokenName ? token.tokenName.length : 0
    ];

    return socialFactors.reduce((a, b) => a + b, 0);
  }

  // Virality potential
  private calculateViralityScore(token: Token): number {
    const viralityFactors = [
      token.tokenSymbol && token.tokenSymbol.toLowerCase().includes('meme') ? 20 : 0,
      token.pythName && token.pythName.toLowerCase().includes('moon') ? 15 : 0,
      token.tokenName && token.tokenName.length < 10 ? 10 : 0
    ];

    return viralityFactors.reduce((a, b) => a + b, 0);
  }

  // Comprehensive scoring method
  private calculateFinalScore(metrics: TokenMetrics): number {
    const weights = {
      trendingScore: 0.25,
      marketScore: 0.35,
      socialScore: 0.2,
      viralityScore: 0.2
    };

    return (
      metrics.trendingScore * weights.trendingScore +
      metrics.marketScore * weights.marketScore +
      metrics.socialScore * weights.socialScore +
      metrics.viralityScore * weights.viralityScore
    );
  }
}

// Run the processing
async function runTokenSorter() {
  try {
    const tokenSorter = new TokenSorter([]);
    const sortedTokens = await tokenSorter.processTokens();
    console.log(`Successfully sorted ${sortedTokens.length} tokens`);
  } catch (error) {
    console.error('Fatal error in token sorting:', error);
    process.exit(1);
  }
}

runTokenSorter();

export { TokenSorter };
