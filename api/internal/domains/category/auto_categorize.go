package category

import (
	"context"
	"math"
	"strings"

	customerrors "hi-cfo/api/internal/shared/errors"

	"github.com/google/uuid"
)

type SimilarityMatcher interface {
	CalculateSimilarity(text1, text2 string) float64
	GetMatchType() string
}

// ================  JaccardMatcher ============================== //
type JaccardMatcher struct{}

func (j *JaccardMatcher) CalculateSimilarity(text1, text2 string) float64 {
	tokens1 := j.tokenize(strings.ToLower(text1))
	tokens2 := j.tokenize(strings.ToLower(text2))

	set1 := make(map[string]bool)
	set2 := make(map[string]bool)

	for _, token := range tokens1 {
		set1[token] = true
	}
	for _, token := range tokens2 {
		set2[token] = true
	}

	intersection := 0
	union := len(set1)

	for token := range set2 {
		if set1[token] {
			intersection++
		} else {
			union++
		}
	}

	if union == 0 {
		return 0.0
	}

	return float64(intersection) / float64(union)
}

func (j *JaccardMatcher) tokenize(text string) []string {
	// Split by common delimiters and create n-grams
	words := strings.FieldsFunc(text, func(r rune) bool {
		return r == ' ' || r == '-' || r == '_' || r == '.' || r == '#'
	})

	var tokens []string
	for _, word := range words {
		if len(word) > 0 {
			tokens = append(tokens, word)
			// Add character n-grams for partial matching
			if len(word) >= 3 {
				for i := 0; i <= len(word)-3; i++ {
					tokens = append(tokens, word[i:i+3])
				}
			}
		}
	}
	return tokens
}

func (j *JaccardMatcher) GetMatchType() string {
	return "jaccard"
}

// ================  Cosine Similarity with TF-IDF  ============================== //
type CosineTFIDFMatcher struct {
	vocabulary map[string]int
	idf        map[string]float64
}

func NewCosineTFIDFMatcher() *CosineTFIDFMatcher {
	return &CosineTFIDFMatcher{
		vocabulary: make(map[string]int),
		idf:        make(map[string]float64),
	}
}

func (c *CosineTFIDFMatcher) BuildVocabulary(documents []string) {
	docFreq := make(map[string]int)
	totalDocs := len(documents)

	for _, doc := range documents {
		tokens := c.tokenize(strings.ToLower(doc))
		uniqueTokens := make(map[string]bool)

		for _, token := range tokens {
			uniqueTokens[token] = true
		}

		for token := range uniqueTokens {
			docFreq[token]++
			if _, exists := c.vocabulary[token]; !exists {
				c.vocabulary[token] = len(c.vocabulary)
			}
		}
	}

	// Calculate IDF
	for token, freq := range docFreq {
		c.idf[token] = math.Log(float64(totalDocs) / float64(freq))
	}
}

func (c *CosineTFIDFMatcher) CalculateSimilarity(text1, text2 string) float64 {
	vec1 := c.vectorize(strings.ToLower(text1))
	vec2 := c.vectorize(strings.ToLower(text2))

	return c.cosineSimilarity(vec1, vec2)
}

func (c *CosineTFIDFMatcher) vectorize(text string) []float64 {
	tokens := c.tokenize(text)
	termFreq := make(map[string]int)

	for _, token := range tokens {
		termFreq[token]++
	}

	vector := make([]float64, len(c.vocabulary))
	for term, freq := range termFreq {
		if idx, exists := c.vocabulary[term]; exists {
			tf := float64(freq) / float64(len(tokens))
			idf := c.idf[term]
			vector[idx] = tf * idf
		}
	}

	return vector
}

func (c *CosineTFIDFMatcher) cosineSimilarity(vec1, vec2 []float64) float64 {
	if len(vec1) != len(vec2) {
		return 0.0
	}

	dotProduct := 0.0
	norm1 := 0.0
	norm2 := 0.0

	for i := 0; i < len(vec1); i++ {
		dotProduct += vec1[i] * vec2[i]
		norm1 += vec1[i] * vec1[i]
		norm2 += vec2[i] * vec2[i]
	}

	if norm1 == 0.0 || norm2 == 0.0 {
		return 0.0
	}

	return dotProduct / (math.Sqrt(norm1) * math.Sqrt(norm2))
}

func (c *CosineTFIDFMatcher) tokenize(text string) []string {
	words := strings.FieldsFunc(text, func(r rune) bool {
		return r == ' ' || r == '-' || r == '_' || r == '.' || r == '#'
	})

	var tokens []string
	for _, word := range words {
		if len(word) > 2 {
			tokens = append(tokens, word)
		}
	}
	return tokens
}

func (c *CosineTFIDFMatcher) GetMatchType() string {
	return "cosine_tfidf"
}

// ================  Levenshtein Matcher  ============================== //

type LevenshteinMatcher struct{}

func (l *LevenshteinMatcher) CalculateSimilarity(text1, text2 string) float64 {
	s1 := strings.ToLower(text1)
	s2 := strings.ToLower(text2)

	distance := l.levenshteinDistance(s1, s2)
	maxLen := float64(max(len(s1), len(s2)))

	if maxLen == 0 {
		return 1.0
	}

	return 1.0 - (float64(distance) / maxLen)
}

func (l *LevenshteinMatcher) levenshteinDistance(s1, s2 string) int {
	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	matrix := make([][]int, len(s1)+1)
	for i := range matrix {
		matrix[i] = make([]int, len(s2)+1)
		matrix[i][0] = i
	}
	for j := range matrix[0] {
		matrix[0][j] = j
	}

	for i := 1; i <= len(s1); i++ {
		for j := 1; j <= len(s2); j++ {
			cost := 0
			if s1[i-1] != s2[j-1] {
				cost = 1
			}

			matrix[i][j] = min(
				matrix[i-1][j]+1,      // deletion
				matrix[i][j-1]+1,      // insertion
				matrix[i-1][j-1]+cost, // substitution
			)
		}
	}

	return matrix[len(s1)][len(s2)]
}

func (l *LevenshteinMatcher) GetMatchType() string {
	return "levenshtein"
}

// ================  Semantic Category Matcher  ============================== //
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

type SemanticCategoryMatcher struct {
	matchers            []SimilarityMatcher
	confidenceThreshold float64
	weights             map[string]float64
	useEnsembleScoring  bool // NEW: Toggle for ensemble vs direct scoring
}

func NewSemanticCategoryMatcher() *SemanticCategoryMatcher {
	return &SemanticCategoryMatcher{
		confidenceThreshold: 0.1,  // Lower threshold since we're fixing scoring
		useEnsembleScoring:  true, // Use ensemble by default
		weights: map[string]float64{
			"keyword":      0.8, // INCREASED: Give keyword matches much higher weight
			"jaccard":      0.2,
			"levenshtein":  0.15,
			"cosine_tfidf": 0.25,
		},
	}
}

// New method to create matcher for single transactions (direct scoring)
func NewDirectSemanticCategoryMatcher() *SemanticCategoryMatcher {
	return &SemanticCategoryMatcher{
		confidenceThreshold: 0.1,
		useEnsembleScoring:  false, // Direct scoring for single transactions
		weights: map[string]float64{
			"keyword":      1.0, // No weighting for direct scoring
			"jaccard":      1.0,
			"levenshtein":  1.0,
			"cosine_tfidf": 1.0,
		},
	}
}

//============== Matcher ===================//

type EnhancedCategory struct {
	Category           Category
	TextRepresentation string
	TokenSet           []string
}

func (r *CategoryRepository) MatchCategoryByMerchant(ctx context.Context, userID uuid.UUID, merchantName string) (*CategoryMatchResult, error) {
	return r.matchCategoryWithConfig(ctx, userID, merchantName, true) // Use ensemble
}

// Method for single transaction categorization (used by transaction service)
func (r *CategoryRepository) MatchCategoryForSingleTransaction(ctx context.Context, userID uuid.UUID, merchantName string) (*CategoryMatchResult, error) {
	// Use same ensemble logic for consistency
	return r.matchCategoryWithConfig(ctx, userID, merchantName, true)
}

// Method for bulk categorization (used by bulk import)
func (r *CategoryRepository) MatchCategoryForBulkImport(ctx context.Context, userID uuid.UUID, merchantName string) (*CategoryMatchResult, error) {
	// Use same ensemble logic for consistency
	return r.matchCategoryWithConfig(ctx, userID, merchantName, true)
}

// Single method that handles both cases with consistent logic
func (r *CategoryRepository) matchCategoryWithConfig(ctx context.Context, userID uuid.UUID, merchantName string, useEnsemble bool) (*CategoryMatchResult, error) {
	if merchantName == "" {
		return nil, nil
	}

	var categories []Category

	err := r.db.WithContext(ctx).
		Where("(user_id = ? OR user_id IS NULL) AND is_active = true", userID).
		Order("user_id ASC").
		Find(&categories).Error

	if err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to fetch categories for matching").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":       userID,
				"merchant_name": merchantName,
			})
		appErr.Log()
		return nil, appErr
	}

	if len(categories) == 0 {
		return nil, nil
	}

	// Create appropriate matcher based on config
	var semanticMatcher *SemanticCategoryMatcher
	if useEnsemble {
		semanticMatcher = NewSemanticCategoryMatcher()
	} else {
		semanticMatcher = NewDirectSemanticCategoryMatcher()
	}

	enhancedCategories := r.prepareCategories(categories)
	r.buildVocabulary(semanticMatcher.matchers, enhancedCategories)
	allMatches := r.getAllMatches(merchantName, enhancedCategories, semanticMatcher)
	bestMatch := r.selectBestMatch(allMatches, semanticMatcher.weights, semanticMatcher.confidenceThreshold, semanticMatcher.useEnsembleScoring)

	return bestMatch, nil
}

func (r *CategoryRepository) prepareCategories(categories []Category) []EnhancedCategory {
	enhanced := make([]EnhancedCategory, len(categories))

	for i, cat := range categories {
		textParts := []string{cat.Name}

		for _, keyword := range cat.Keywords {
			if keyword != "" {
				textParts = append(textParts, keyword)
			}
		}
		enhanced[i] = EnhancedCategory{
			Category:           cat,
			TextRepresentation: strings.Join(textParts, " "),
			TokenSet:           strings.Fields(strings.ToLower(strings.Join(textParts, " "))),
		}
	}

	return enhanced
}

// Build vocabulary for TF-IDF matcher
func (r *CategoryRepository) buildVocabulary(matchers []SimilarityMatcher, categories []EnhancedCategory) {
	documents := make([]string, len(categories))
	for i, cat := range categories {
		documents[i] = cat.TextRepresentation
	}

	// Build vocabulary for TF-IDF matcher
	for _, matcher := range matchers {
		if tfidfMatcher, ok := matcher.(*CosineTFIDFMatcher); ok {
			tfidfMatcher.BuildVocabulary(documents)
		}
	}
}

// Get all matches from different methods
func (r *CategoryRepository) getAllMatches(merchantName string, categories []EnhancedCategory, semanticMatcher *SemanticCategoryMatcher) []CategoryMatchResult {
	var allMatches []CategoryMatchResult

	// 1. Original keyword matching (keep your existing logic)
	keywordMatches := r.getKeywordMatches(merchantName, categories)
	allMatches = append(allMatches, keywordMatches...)

	// 2. Semantic similarity matches
	for _, matcher := range semanticMatcher.matchers {
		semanticMatches := r.getSemanticMatches(matcher, merchantName, categories)
		allMatches = append(allMatches, semanticMatches...)
	}

	return allMatches
}

func (r *CategoryRepository) getKeywordMatches(merchantName string, categories []EnhancedCategory) []CategoryMatchResult {
	var matches []CategoryMatchResult
	merchantLower := strings.ToLower(merchantName)

	for _, category := range categories {
		for _, keyword := range category.Category.Keywords {
			if keyword != "" {
				keywordLower := strings.ToLower(keyword)

				// IMPROVED: Multiple matching strategies
				var confidence float64
				var matchType string

				if merchantLower == keywordLower {
					// Exact match - highest confidence
					confidence = 1.0
					matchType = "exact_keyword"
				} else if strings.Contains(merchantLower, keywordLower) {
					// Contains match - high confidence based on coverage
					confidence = float64(len(keyword)) / float64(len(merchantName))
					// Boost confidence if keyword is significant portion
					if confidence > 0.5 {
						confidence = math.Min(confidence*1.2, 0.95) // Boost but cap below exact match
					}
					matchType = "keyword"
				} else if strings.Contains(keywordLower, merchantLower) && len(merchantName) > 3 {
					// Reverse contains (merchant is substring of keyword)
					confidence = float64(len(merchantName)) / float64(len(keyword))
					confidence = math.Min(confidence*0.8, 0.9) // Lower confidence for reverse match
					matchType = "reverse_keyword"
				}

				if confidence > 0 {
					matches = append(matches, CategoryMatchResult{
						CategoryID:     category.Category.ID,
						CategoryName:   category.Category.Name,
						MatchType:      matchType,
						MatchedText:    keyword,
						Confidence:     confidence,
						SimilarityType: "keyword",
					})
				}
			}
		}
	}

	return matches
}

func (r *CategoryRepository) getSemanticMatches(matcher SimilarityMatcher, merchantName string, categories []EnhancedCategory) []CategoryMatchResult {
	var matches []CategoryMatchResult

	for _, category := range categories {
		similarity := matcher.CalculateSimilarity(merchantName, category.TextRepresentation)

		if similarity > 0 {
			matches = append(matches, CategoryMatchResult{
				CategoryID:     category.Category.ID,
				CategoryName:   category.Category.Name,
				MatchType:      "similarity",
				SimilarityType: matcher.GetMatchType(),
				MatchedText:    category.TextRepresentation,
				Confidence:     similarity,
			})
		}
	}

	return matches
}

func (r *CategoryRepository) selectBestMatch(allMatches []CategoryMatchResult, weights map[string]float64, confidenceThreshold float64, useEnsembleScoring bool) *CategoryMatchResult {
	if len(allMatches) == 0 {
		return nil
	}

	if !useEnsembleScoring {
		// Direct scoring: find the best single match without weighting
		var bestMatch *CategoryMatchResult
		for _, match := range allMatches {
			if bestMatch == nil || match.Confidence > bestMatch.Confidence {
				newMatch := match
				bestMatch = &newMatch
			}
		}

		if bestMatch != nil && bestMatch.Confidence >= confidenceThreshold {
			return bestMatch
		}
		return nil
	}

	// Ensemble scoring: group by category and apply weights
	categoryScores := make(map[uuid.UUID]*CategoryMatchResult)

	for _, match := range allMatches {
		weight := weights[match.SimilarityType]
		if weight == 0 {
			weight = 0.1 // Default weight for unknown types
		}

		// IMPROVED: For keyword matches, check if confidence is 1.0 (exact match)
		var weightedScore float64
		if match.SimilarityType == "keyword" && match.Confidence >= 0.9 {
			// For high-confidence keyword matches, use higher weight
			weightedScore = match.Confidence * math.Min(weight*2, 1.0) // Double the weight but cap at 1.0
		} else {
			weightedScore = match.Confidence * weight
		}

		if existing, exists := categoryScores[match.CategoryID]; exists {
			// Take the higher score for the same category
			if weightedScore > existing.Confidence {
				existing.Confidence = weightedScore
				existing.MatchType = match.MatchType
				existing.SimilarityType = "ensemble"
				existing.MatchedText = match.MatchedText
			}
		} else {
			newMatch := match
			newMatch.Confidence = weightedScore
			newMatch.SimilarityType = "ensemble"
			categoryScores[match.CategoryID] = &newMatch
		}
	}

	// Find the best match overall
	var bestMatch *CategoryMatchResult
	for _, match := range categoryScores {
		if bestMatch == nil || match.Confidence > bestMatch.Confidence {
			bestMatch = match
		}
	}

	// Apply confidence threshold
	if bestMatch != nil && bestMatch.Confidence >= confidenceThreshold {
		return bestMatch
	}

	return nil
}

func (r *CategoryRepository) GetMatchingStats(ctx context.Context, userID uuid.UUID, merchantName string) (*MatchingStats, error) {
	if merchantName == "" {
		return nil, nil
	}

	var categories []Category
	err := r.db.WithContext(ctx).
		Where("(user_id = ? OR user_id IS NULL) AND is_active = true", userID).
		Find(&categories).Error

	if err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to fetch categories for matching stats").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":       userID,
				"merchant_name": merchantName,
			})
		appErr.Log()
		return nil, appErr
	}

	semanticMatcher := NewSemanticCategoryMatcher()
	semanticMatcher.matchers = []SimilarityMatcher{
		&JaccardMatcher{},
		&LevenshteinMatcher{},
		NewCosineTFIDFMatcher(),
	}

	enhancedCategories := r.prepareCategories(categories)
	r.buildVocabulary(semanticMatcher.matchers, enhancedCategories)
	allMatches := r.getAllMatches(merchantName, enhancedCategories, semanticMatcher)

	// CREATE SIMPLE MatchingStats (not DetailedMatchingStats)
	stats := &MatchingStats{
		MerchantName: merchantName,
		Methods:      make(map[string]MethodStats),
	}

	// Group by method and find best for each
	methodMatches := make(map[string][]CategoryMatchResult)
	for _, match := range allMatches {
		method := match.SimilarityType
		methodMatches[method] = append(methodMatches[method], match)
	}

	// Calculate stats for each method
	for method, matches := range methodMatches {
		if len(matches) == 0 {
			continue
		}

		best := matches[0]
		for _, match := range matches {
			if match.Confidence > best.Confidence {
				best = match
			}
		}

		stats.Methods[method] = MethodStats{
			BestScore:    best.Confidence,
			MatchCount:   len(matches),
			BestCategory: best.CategoryName,
		}
	}

	return stats, nil
}
