# Address Normalization Guidelines

## Overview

This document provides prompt engineering guidelines and best practices for parsing and normalizing Arabic and English addresses in the Saudi Arabian context.

## Address Patterns

### Arabic Address Patterns

Arabic addresses in Saudi Arabia typically follow these patterns:

1. **Full Format**: `شارع [street name]، حي [district]، [city] [postal_code]`
   - Example: `شارع الملك فهد، حي العليا، الرياض 12345`

2. **Without Postal Code**: `شارع [street name]، حي [district]، [city]`
   - Example: `شارع التحلية، حي السليمانية، جدة`

3. **Minimal Format**: `[street name]، [city]`
   - Example: `طريق الملك عبدالله، الدمام`

4. **Building/Landmark Based**: `[landmark/building]، حي [district]، [city]`
   - Example: `برج الفيصلية، حي العليا، الرياض`

### English Address Patterns

English addresses typically follow these patterns:

1. **Full Format**: `[street name], [district], [city], [postal_code]`
   - Example: `King Fahd Road, Al Olaya, Riyadh, 12345`

2. **Without Postal Code**: `[street name], [district], [city]`
   - Example: `Tahlia Street, Al Sulaymaniyah, Jeddah`

3. **Minimal Format**: `[street name], [city]`
   - Example: `King Abdullah Road, Dammam`

## Key Components

### Street (شارع / Street)
- Arabic indicators: `شارع`, `طريق`, `ش.`
- English indicators: `Street`, `Road`, `St.`, `Rd.`, `Avenue`, `Ave.`
- Usually appears first in the address

### District (حي / District)
- Arabic indicators: `حي`, `منطقة`
- English indicators: `District`, `Neighborhood`, `Area`
- Typically follows the street name

### City (المدينة / City)
- Major Saudi cities to recognize:
  - Arabic: `الرياض`, `جدة`, `مكة`, `المدينة`, `الدمام`, `الخبر`, `الطائف`, `تبوك`, `أبها`
  - English: `Riyadh`, `Jeddah`, `Mecca`, `Medina`, `Dammam`, `Khobar`, `Taif`, `Tabuk`, `Abha`

### Postal Code (الرمز البريدي / Postal Code)
- Format: 5-digit number (e.g., `12345`)
- Regex pattern: `\b\d{5}\b`

## Parsing Strategies

### 1. Sequential Parsing
Parse address components in order:
1. Extract postal code (if present)
2. Identify city name
3. Extract district (if present)
4. Extract street name
5. Handle remaining text

### 2. Keyword-Based Extraction
Look for specific keywords that indicate component types:
- `شارع` / `Street` → Street name follows
- `حي` / `District` → District name follows
- Known city names → City component

### 3. Comma-Delimited Parsing
Split address by commas and assign components based on position and keywords.

### 4. Fallback Strategy
If structured parsing fails:
- First segment: Street
- Second segment: District
- Last segment: City

## Text Normalization

### Arabic Text Normalization
1. **Remove Diacritics**: Remove tashkeel marks (ً ٌ ٍ َ ُ ِ ّ ْ ٰ)
2. **Normalize Characters**:
   - `أ`, `إ`, `آ` → `ا`
   - `ة` → `ه`
   - `ى` → `ي`
3. **Trim Whitespace**: Remove leading/trailing spaces

### English Text Normalization
1. **Standardize Case**: Convert to Title Case for proper nouns
2. **Abbreviation Expansion**: `St.` → `Street`, `Rd.` → `Road`
3. **Trim Whitespace**: Remove leading/trailing spaces

## Edge Cases

### Ambiguous Addresses
- **Missing Components**: Use defaults or leave as `None`
- **Multiple Cities**: Prioritize the first occurrence
- **Mixed Languages**: Parse both and merge results

### Special Characters
- Handle various comma types: `,` (English) and `،` (Arabic)
- Remove extra punctuation: `.`, `;`, `:`

### Building Numbers
- Extract numbers at the start: `1234 King Fahd Road`
- Include in street component: `street: "1234 King Fahd Road"`

## Examples

### Example 1: Complete Arabic Address
**Input**: `شارع الملك فهد، حي العليا، الرياض 12345`

**Parsed Output**:
```json
{
  "street": "الملك فهد",
  "district": "العليا",
  "city": "الرياض",
  "postal_code": "12345"
}
```

### Example 2: English Address Without Postal Code
**Input**: `King Abdullah Road, Al Khobar`

**Parsed Output**:
```json
{
  "street": "King Abdullah Road",
  "district": null,
  "city": "Khobar",
  "postal_code": null
}
```

### Example 3: Mixed Format
**Input**: 
```json
{
  "ar": "حي الصفا، جدة",
  "en": "Al Safa District, Jeddah"
}
```

**Parsed Output**:
```json
{
  "street": null,
  "district": "الصفا",
  "city": "جدة",
  "postal_code": null
}
```

## Best Practices

1. **Validation**: Always validate extracted components
2. **Fallback Values**: Provide sensible defaults for missing components
3. **Logging**: Log parsing decisions for debugging
4. **Flexibility**: Handle variations in address formatting
5. **Cultural Awareness**: Understand local naming conventions
6. **Testing**: Test with diverse real-world address examples

## Geocoding Integration

After normalization:
1. Build query string from components
2. Include country code for better accuracy
3. Handle API failures gracefully
4. Provide fallback coordinates for known cities
5. Cache results when possible

## Performance Tips

1. **Pre-compile Regex**: Compile patterns once, reuse multiple times
2. **Early Validation**: Check for required fields first
3. **Lazy Evaluation**: Parse only what's needed
4. **Caching**: Cache commonly parsed addresses
5. **Batch Processing**: Process multiple addresses in parallel when possible
