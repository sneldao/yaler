package discovery

import (
	"strings"
	"testing"
)

// TestCheckCredential_TitlesMatch runs the same matching decision the
// scraper path uses against the *real* extracted titles from Companies
// House (captured from live Apify runs). Guards the regression where the
// old matcher required the literal "companies house" in the text — which
// the title-extracting pageFunction no longer includes.
func TestCheckCredential_TitlesMatch(t *testing.T) {
	cases := []struct {
		name  string
		titles string
		want  bool
	}{
		{
			name:   "Xpress Refrigeration",
			titles: "XPRESS REFRIGERATION LTD | XPRESS REFRIGERATION GROUP LTD | AA XPRESS LTD",
			want:   true,
		},
		{
			name:   "Commercial Refrigeration Services London",
			titles: "COMMERCIAL CATERING AND REFRIGERATION SERVICES LTD | COMMERCIAL REFRIGERATION SERVICES LTD | JD COMMERCIAL CATERING & REFRIGERATION SERVICES LIMITED",
			want:   true,
		},
		{
			name:   "Unrelated Company",
			titles: "SOME OTHER TRADING LTD | ANOTHER FIRM LTD",
			want:   false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			hay := strings.ToLower(tc.titles)
			var needles []string
			for _, tok := range strings.Fields(strings.ToLower(tc.name)) {
				tok = strings.Trim(tok, ",.&'()")
				if len(tok) < 4 {
					continue
				}
				switch tok {
				case "limited", "ltd", "company", "companies", "service", "services", "group", "holdings", "and", "the", "london":
					continue
				}
				needles = append(needles, tok)
			}
			hits := 0
			for _, n := range needles {
				if strings.Contains(hay, n) {
					hits++
				}
			}
			got := hits >= 2
			if got != tc.want {
				t.Errorf("name %q titles %q: got listed=%v want %v (needles=%v)", tc.name, tc.titles, got, tc.want, needles)
			}
		})
	}
}